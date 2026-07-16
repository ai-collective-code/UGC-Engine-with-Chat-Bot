import OpenAI from "openai";
import { INSTAGRAM_SYSTEM_PROMPT, MAX_VOUCHER_INR } from "@/lib/system-prompt";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const FALLBACK_MODELS = [
  process.env.AI_MODEL,
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-nano-9b-v2:free",
].filter(Boolean) as string[];

// Gemini is called DIRECTLY against Google's API (not through OpenRouter) --
// OpenRouter only offers Gemini as a paid model with no free tier, while
// Google AI Studio grants a real (if quota-limited) free tier per project.
// This is the primary path for reply quality (fluent regional-language
// output); the OpenRouter chain above is the fallback if Gemini's quota is
// exhausted or the call otherwise fails.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

async function getGeminiResponse(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Gemini's chat format: "model" instead of "assistant", system prompt goes
  // in its own top-level field rather than as a message in the list.
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: INSTAGRAM_SYSTEM_PROMPT }] },
      contents,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    // Quota exhausted (429) or model unavailable (404) -- fall through to
    // OpenRouter. Anything else (bad key, malformed request) is a real bug,
    // so it throws and surfaces instead of silently degrading.
    if (status === 429 || status === 404) {
      console.warn(`[ai] Gemini failed with ${status}, falling back to OpenRouter...`);
      return null;
    }
    throw new Error(`Gemini API error ${status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || null;
}

// Rupee figures the model actually offered: numbers currency-marked (Rs/INR/₹)
// or attached to voucher/amazon language. Deliberately conservative -- we only
// care about money it puts on the table. Mirrors _amounts_in() in the UGC
// engine's lib/llm_negotiator.py so both bots enforce the same way.
const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|₹)\s*([\d,]{3,})/gi, // Rs 2500 / ₹2,500 / INR 2500
  /([\d,]{3,})\s*(?:rs\.?|inr|₹|rupees?)/gi, // 2500 rs / 2500 rupees
  /([\d,]{3,})\s*(?:voucher|amazon)/gi, // 2500 voucher / 2500 amazon
];

function amountsIn(text: string): number[] {
  const amounts: number[] = [];
  for (const pattern of AMOUNT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(n)) amounts.push(n);
    }
  }
  return amounts;
}

// Code-enforced budget wall: if the model's reply offers a figure above
// MAX_VOUCHER_INR, we do NOT send it -- persuasion or prompt-injection must
// never be able to blow the budget. The prompt asking nicely is not enough.
function enforceVoucherCeiling(reply: string): { safeReply: string; violated: boolean } {
  if (amountsIn(reply).some((a) => a > MAX_VOUCHER_INR)) {
    return {
      safeReply:
        "That's a bit beyond what I can approve on my own for this one -- let me check with my team and come back to you shortly. 🙏",
      violated: true,
    };
  }
  return { safeReply: reply, violated: false };
}

// Free-tier fallback models occasionally emit corrupted tokens — Hebrew or
// CJK characters spliced mid-word into an English/romanized sentence (seen
// live: "address soאר we can send"). Our creators write Latin-script or
// Indic-script text, so any of these foreign scripts in a reply means the
// model glitched; reject the reply and let the chain try the next model.
const UNEXPECTED_SCRIPTS =
  /[֐-׿؀-ۿЀ-ӿ一-鿿぀-ヿ가-힯฀-๿]/;

function looksCorrupted(text: string): boolean {
  return UNEXPECTED_SCRIPTS.test(text);
}

// Instagram DMs are plain text — markdown renders as literal asterisks and
// hashes in the creator's inbox. Strip the formatting models habitually add
// while keeping the words (bold/italic markers, headings, inline code,
// [text](url) links, and *-bullets become "- " bullets).
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, "$1") // *italic*
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/^#{1,6}\s+/gm, "") // # headings
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)") // [text](url)
    .replace(/^\s*[*•]\s+/gm, "- "); // * bullets -> - bullets
}

// Shared post-processing for any model's raw reply: enforce the money
// ceiling in code (never trust the prompt alone), strip markdown that would
// render as literal symbols in a DM, and strip the internal [DEAL_AGREED]
// control tag before it can reach the creator.
function finalizeReply(raw: string): string {
  const { safeReply, violated } = enforceVoucherCeiling(raw);
  if (violated) {
    console.warn(`[ai] BLOCKED over-ceiling reply (> Rs ${MAX_VOUCHER_INR}):`, raw);
    return safeReply;
  }
  let reply = stripMarkdown(safeReply);
  if (reply.includes("[DEAL_AGREED]")) {
    console.log("[ai] Deal agreed signal detected");
    reply = reply.replace("[DEAL_AGREED]", "").trim();
  }
  return reply;
}

// Returns null when every model in the chain fails — callers must NOT send
// anything in that case. Robotic error text ("Sorry, I'm temporarily
// unavailable") in a creator's DM reads as spam and outs the bot; silence plus
// a human follow-up from the dashboard is always better.
export async function getAIResponse(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  try {
    const geminiReply = await getGeminiResponse(messages);
    if (geminiReply) {
      if (looksCorrupted(geminiReply)) {
        console.warn("[ai] Gemini reply contained corrupted tokens, falling back:", geminiReply.slice(0, 120));
      } else {
        return finalizeReply(geminiReply);
      }
    }
  } catch (err) {
    console.error("[ai] Gemini call failed unexpectedly, falling back to OpenRouter:", err);
  }

  const payload = [
    { role: "system" as const, content: INSTAGRAM_SYSTEM_PROMPT },
    ...messages,
  ];

  for (const model of FALLBACK_MODELS) {
    try {
      const completion = await openai.chat.completions.create({ model, messages: payload });
      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        console.warn(`Model ${model} returned empty content, trying next...`);
        continue;
      }
      if (looksCorrupted(raw)) {
        console.warn(`Model ${model} returned corrupted tokens, trying next...`, raw.slice(0, 120));
        continue;
      }

      return finalizeReply(raw);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      // Fall through to the next model on rate-limit (429) or not-found (404);
      // log-and-continue on anything else too — one model's outage must not
      // take down the whole chain when a later model could still answer.
      console.warn(`Model ${model} failed with ${status ?? err}, trying next...`);
    }
  }

  console.error("[ai] Every model in the chain failed — returning null (no reply will be sent)");
  return null;
}
