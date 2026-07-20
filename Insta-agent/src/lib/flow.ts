/**
 * Scripted outreach flow — a deterministic finite-state machine that REPLACES
 * the free-form LLM negotiator (ai.ts) in the DM path.
 *
 * Why a state machine instead of an LLM:
 *  - No prompt injection: creator text is never interpreted as instructions.
 *  - No off-script messages: every bot message is a fixed template.
 *  - Predictable, minimal cadence: at most 3 bot messages, then the session
 *    locks — far lower spam-detection risk than open-ended chat.
 *
 * The flow (you send the opener manually in the creator's local language):
 *   opener (manual) → creator replies → BOT sends Rs 2000 offer (same language)
 *     ├─ YES → BOT asks for WhatsApp number → number given → CONFIRM → LOCK
 *     └─ NO  → LOCK, send nothing
 * Ambiguous reply (unclear yes/no, or invalid number): the bot re-asks once;
 * a second ambiguous reply ends (locks) the session silently.
 *
 * "Lock" = set the conversation mode to "human" so the webhook stops
 * auto-replying (the existing mode==="human" guard already does this).
 *
 * Everything in this file is pure and side-effect free so it can be unit
 * tested without Instagram/Supabase — the webhook wires it to I/O.
 */

export const VOUCHER_INR = 2000;

// Languages we have hand-written templates for. Detected languages without a
// template fall back to FALLBACK_LANG (Hindi — the campaign's default_language).
export type Lang = "en" | "hi" | "bn" | "mr";
export const FALLBACK_LANG: Lang = "hi";

const HARDCODED_LANGS: readonly string[] = ["en", "hi", "bn", "mr"];
export function isHardcodedLang(x: string): x is Lang {
  return HARDCODED_LANGS.includes(x);
}

// Romanized Yes/No labels for languages that DON'T have a hardcoded template
// (the webhook AI-translates the message body for these, and uses this table to
// localize the tappable buttons). Keyed by lowercase English language name.
// Anything not listed falls back to English Yes/No — the button still works
// because classification is driven by the quick-reply payload, not the label.
export const YESNO_BY_LANG: Record<string, { yes: string; no: string }> = {
  telugu: { yes: "Avunu", no: "Kaadu" },
  tamil: { yes: "Aama", no: "Illai" },
  kannada: { yes: "Haudu", no: "Illa" },
  malayalam: { yes: "Athe", no: "Alla" },
  gujarati: { yes: "Ha", no: "Na" },
  punjabi: { yes: "Haan", no: "Nahi" },
  odia: { yes: "Han", no: "Na" },
  assamese: { yes: "Hoi", no: "Nohoi" },
  nepali: { yes: "Ho", no: "Hoina" },
  urdu: { yes: "Haan", no: "Nahi" },
  konkani: { yes: "Vhoi", no: "Na" },
  maithili: { yes: "Haan", no: "Nai" },
  bhojpuri: { yes: "Haan", no: "Naikhe" },
};

export function yesNoLabels(languageName: string): { yes: string; no: string } {
  return YESNO_BY_LANG[languageName.toLowerCase()] ?? { yes: "Yes", no: "No" };
}

export type TemplateKind = "OFFER" | "WHATSAPP_ASK" | "CONFIRM";

// Fixed message templates. Romanized regional text is written in plain ASCII
// only (no diacritics) — matching how creators actually type on the phone, and
// the same rule ai.ts enforces on model output.
export const TEMPLATES: Record<TemplateKind, Record<Lang, string>> = {
  OFFER: {
    en: `Thanks for your reply! We'd like to offer you a Rs ${VOUCHER_INR} voucher to make 1 reel featuring our product. Are you interested? (Reply Yes / No)`,
    hi: `Reply karne ke liye dhanyavaad! Hum aapko 1 reel banane ke liye Rs ${VOUCHER_INR} ka voucher dena chahte hain. Kya aap interested hain? (Haan / Nahi)`,
    bn: `Reply korar jonno dhonnobad! Amra apnake 1 ta reel bananor jonno Rs ${VOUCHER_INR} er voucher dite chai. Apni ki interested? (Haan / Na)`,
    mr: `Reply kelyabaddal dhanyavaad! Aamhi tumhala 1 reel banvaayla Rs ${VOUCHER_INR} cha voucher deu. Tumhi interested aahat ka? (Ho / Nahi)`,
  },
  WHATSAPP_ASK: {
    en: `Great! Please share your WhatsApp number so our team can send you the details.`,
    hi: `Bahut badhiya! Kripya apna WhatsApp number bhejein taaki hamari team aapko details bhej sake.`,
    bn: `Darun! Doya kore apnar WhatsApp number ta din, jate amader team apnake details pathate pare.`,
    mr: `Chhaan! Krupaya tumcha WhatsApp number dya, jenekarun aamchi team tumhala details pathvu shakel.`,
  },
  CONFIRM: {
    en: `Thank you! Our team will contact you on WhatsApp shortly. 🙏`,
    hi: `Dhanyavaad! Hamari team jald hi aapse WhatsApp par sampark karegi. 🙏`,
    bn: `Dhonnobad! Amader team khub shiggiri apnar sathe WhatsApp e jogajog korbe. 🙏`,
    mr: `Dhanyavaad! Aamchi team lavkarach tumchyashi WhatsApp var sampark karel. 🙏`,
  },
};

export function template(kind: TemplateKind, lang: Lang): string {
  return TEMPLATES[kind][lang] ?? TEMPLATES[kind][FALLBACK_LANG];
}

// Tappable Yes/No button labels sent with the offer as Instagram quick replies,
// so the creator taps instead of typing. Titles must be <= 20 chars (Meta cap),
// and each word here also appears in the YES_TOKENS / NO_TOKENS lists below, so
// the tapped reply classifies correctly even without reading its payload.
export const QUICK_YESNO: Record<Lang, { yes: string; no: string }> = {
  en: { yes: "Yes", no: "No" },
  hi: { yes: "Haan", no: "Nahi" },
  bn: { yes: "Haan", no: "Na" },
  mr: { yes: "Ho", no: "Nahi" },
};
export const QR_YES_PAYLOAD = "FLOW_YES";
export const QR_NO_PAYLOAD = "FLOW_NO";

export interface QuickReply {
  title: string;
  payload: string;
}

// Normalize for template identity checks: lowercase + collapse whitespace.
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// Reverse lookup: normalized template text -> {kind, lang}. Lets us recover,
// from the transcript alone, which scripted message we last sent and in which
// language — no extra state column required.
const TEMPLATE_INDEX: Map<string, { kind: TemplateKind; lang: Lang }> = (() => {
  const m = new Map<string, { kind: TemplateKind; lang: Lang }>();
  for (const kind of Object.keys(TEMPLATES) as TemplateKind[]) {
    for (const lang of Object.keys(TEMPLATES[kind]) as Lang[]) {
      m.set(norm(TEMPLATES[kind][lang]), { kind, lang });
    }
  }
  return m;
})();

export function identifyTemplate(text: string): { kind: TemplateKind; lang: Lang } | null {
  return TEMPLATE_INDEX.get(norm(text)) ?? null;
}

// ── Language detection (deterministic, no LLM) ──────────────────────────────
// Native script wins immediately; otherwise score romanized keyword hits.
const SCRIPT_RANGES: { lang: Lang; re: RegExp }[] = [
  { lang: "bn", re: /[ঀ-৿]/ }, // Bengali
  { lang: "hi", re: /[ऀ-ॿ]/ }, // Devanagari (Hindi)
];

const ROMAN_HINTS: Record<Exclude<Lang, "en">, string[]> = {
  hi: [
    "haan", "nahi", "hai", "hain", "kya", "aap", "hum", "karunga", "karungi",
    "chahiye", "bhej", "kripya", "dhanyavaad", "theek", "thik", "bilkul",
    "mujhe", "mera", "kar", "denge", "chalega", "bahut", "acha", "accha",
    "aapko", "aapka", "aapke", "humein", "chahte", "banane", "dena", "kaam",
    "liye", "karenge", "raha", "rahe", "sakta", "sakte", "wala", "wale",
  ],
  bn: [
    "ami", "apni", "apnar", "korbo", "korchi", "chai", "kore", "hobe", "hae",
    "hyan", "obosshoi", "dhonnobad", "doya", "jonno", "kemon", "bananor",
    "ache", "achhe", "thik ache", "darun", "korben",
    "amader", "amar", "tomar", "niye", "korte", "korar", "koreche", "kajti",
    "kaj", "sathe", "ekta", "icche", "prokash", "achi", "achhi", "moto",
    "holo", "bolchi", "theke", "pathate", "jogajog", "bhalo", "valo", "khub",
  ],
  mr: [
    // Distinctive romanized Marathi markers (avoid ultra-short ambiguous ones).
    "aamhi", "aamchya", "aamchi", "aamcha", "tumhala", "tumcha", "tumchya",
    "tumchyasobat", "tumhi", "tumchyashi", "tyana", "tyanna", "aahe", "ahe",
    "aahat", "ahat", "aahot", "karto", "karte", "karaycha", "karaychi",
    "sobat", "kelyabaddal", "krupaya", "jenekarun", "lavkarach", "banvaayla",
    "mala", "tula", "kaay", "kasa", "kashi", "chhaan", "dya", "shakel", "ho",
  ],
};

export function detectLanguage(text: string): Lang {
  for (const { lang, re } of SCRIPT_RANGES) {
    if (re.test(text)) return lang;
  }
  const tokens = new Set(norm(text).split(/[^a-z]+/).filter(Boolean));
  const lower = " " + norm(text) + " ";
  const scores: Record<Exclude<Lang, "en">, number> = { hi: 0, bn: 0, mr: 0 };
  for (const lang of Object.keys(ROMAN_HINTS) as Exclude<Lang, "en">[]) {
    for (const hint of ROMAN_HINTS[lang]) {
      if (hint.includes(" ")) {
        if (lower.includes(" " + hint + " ")) scores[lang] += 1;
      } else if (tokens.has(hint)) {
        scores[lang] += 1;
      }
    }
  }
  const best = (Object.entries(scores) as [Exclude<Lang, "en">, number][])
    .sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] > 0) return best[0];
  // Latin script, no regional hints, some letters present → treat as English.
  return "en";
}

/**
 * The language the conversation is committed to. If we've already sent a
 * scripted template, that template's language is authoritative (we must not
 * switch mid-flow). Otherwise detect from the manual opener / creator text.
 */
export function conversationLanguage(
  history: { role: "user" | "assistant"; content: string }[]
): Lang {
  for (const m of history) {
    if (m.role === "assistant") {
      const t = identifyTemplate(m.content);
      if (t) return t.lang;
    }
  }
  // No template sent yet: prefer the opener (first assistant msg), else the
  // creator's own words.
  const opener = history.find((m) => m.role === "assistant");
  if (opener) return detectLanguage(opener.content);
  const firstUser = history.find((m) => m.role === "user");
  return firstUser ? detectLanguage(firstUser.content) : FALLBACK_LANG;
}

// ── Yes / No classification (deterministic keyword lists) ────────────────────
const YES_TOKENS = new Set([
  // English
  "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "okey", "y", "ye",
  "interested", "done", "ready", "confirm", "confirmed", "in", "cool",
  // Hindi (romanized)
  "haan", "han", "ha", "haa", "haanji", "ji", "jee", "bilkul", "zaroor",
  "karunga", "karungi", "chalega", "theek", "thik", "hoga", "hn",
  // Bengali (romanized)
  "hyan", "hae", "hmm", "obosshoi", "korbo", "raji", "hobe", "achha",
  // Marathi (romanized) — "Ho" is the Marathi quick-reply Yes button label
  "ho", "hoy", "chalel", "nakki",
]);
const YES_PHRASES = [
  "i am in", "im in", "i'm in", "ji haan", "haan ji", "theek hai", "thik hai",
  "thik ache", "thik achhe", "ho jayega", "kar dunga", "kar dungi",
  "interested hu", "interested hoon", "count me in",
];
const NO_TOKENS = new Set([
  // English
  "no", "nope", "nah", "cant", "cannot", "wont", "sorry", "busy", "later",
  "n", "stop", "leave", "pass",
  // Hindi (romanized)
  "nahi", "nahin", "na", "nai", "naa", "mat", "rehnedo",
  // Bengali (romanized)
  "thak", "pore",
]);
const NO_PHRASES = [
  "not interested", "no thanks", "no thank you", "can't", "won't", "not now",
  "nahi chahiye", "interested nahi", "nahi karunga", "nahi karungi",
  "baad mein", "rehne do", "chai na", "korbo na", "interested na",
  "ekhon na", "abhi nahi",
];
// Native-script yes/no.
const YES_NATIVE = ["হ্যাঁ", "হ্যা", "হা", "হ্যাঁ", "हाँ", "हां", "जी", "बिल्कुल", "ठीक है", "हा"];
const NO_NATIVE = ["না", "नहीं", "नही", "ना"];

export type YesNo = "yes" | "no" | "unclear";

export function classifyYesNo(text: string): YesNo {
  let yes = false;
  let no = false;

  // Match multi-word phrases first and REMOVE them from the working string, so a
  // negated positive ("nahi interested", "not interested") is scored as NO and
  // its "interested" doesn't later fire the YES token. Negation phrases win.
  let work = norm(text);
  for (const p of NO_PHRASES) {
    if (work.includes(p)) { no = true; work = work.split(p).join(" "); }
  }
  for (const p of YES_PHRASES) {
    if (work.includes(p)) { yes = true; work = work.split(p).join(" "); }
  }

  const tokens = new Set(work.split(/[^a-z]+/).filter(Boolean));
  for (const t of tokens) {
    if (NO_TOKENS.has(t)) no = true;
    if (YES_TOKENS.has(t)) yes = true;
  }
  for (const w of NO_NATIVE) if (text.includes(w)) no = true;
  for (const w of YES_NATIVE) if (text.includes(w)) yes = true;

  if (yes && !no) return "yes";
  if (no && !yes) return "no";
  return "unclear"; // both or neither
}

// ── Phone extraction (Indian mobile) ─────────────────────────────────────────
/**
 * Extract a valid Indian mobile number from free text, or null. Accepts spaced/
 * dashed forms, an optional +91 / 91 / 0 prefix, and returns the bare 10 digits.
 */
export function extractPhone(text: string): string | null {
  const digitsOnly = text.replace(/[^\d]/g, "");
  // Try, in order: 12-digit 91XXXXXXXXXX, 11-digit 0XXXXXXXXXX, plain 10-digit.
  const candidates: string[] = [];
  const m10 = text.match(/(?:\+?91[\s-]?|0)?([6-9]\d{9})(?!\d)/);
  if (m10) candidates.push(m10[1]);
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) candidates.push(digitsOnly.slice(2));
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) candidates.push(digitsOnly.slice(1));
  if (digitsOnly.length === 10) candidates.push(digitsOnly);
  for (const c of candidates) {
    if (/^[6-9]\d{9}$/.test(c)) return c;
  }
  return null;
}

// ── The state machine ────────────────────────────────────────────────────────
export type FlowStage =
  | "AWAITING_FIRST_REPLY"
  | "AWAITING_YESNO"
  | "AWAITING_PHONE"
  | "DONE";

// Backstop: no matter what, never let the bot send more than this many scripted
// messages in one conversation (defense-in-depth against any loop).
export const MAX_BOT_MESSAGES = 4;

export interface FlowDecision {
  send: string | null; // message to send, or null for silence
  lock: boolean; // set mode="human" so the bot stops replying
  quickReplies?: QuickReply[]; // tappable buttons to attach to `send`
  capturedPhone?: string; // set when a valid WhatsApp number was received
  reason: string; // for logging/analytics
}

// Build the offer decision with tappable Haan/Nahi quick replies in `lang`.
function offerDecision(lang: Lang, reason: string): FlowDecision {
  const q = QUICK_YESNO[lang] ?? QUICK_YESNO[FALLBACK_LANG];
  return {
    send: template("OFFER", lang),
    lock: false,
    quickReplies: [
      { title: q.yes, payload: QR_YES_PAYLOAD },
      { title: q.no, payload: QR_NO_PAYLOAD },
    ],
    reason,
  };
}

/**
 * Decide what to do given the full chronological transcript. The last message
 * MUST be the just-received creator (user) message.
 */
export function decide(
  history: { role: "user" | "assistant"; content: string }[],
  forcedLang?: string
): FlowDecision {
  const assistantMsgs = history.filter((m) => m.role === "assistant");
  if (assistantMsgs.length >= MAX_BOT_MESSAGES) {
    return { send: null, lock: true, reason: "max_bot_messages_reached" };
  }

  // If the webhook resolved a language, use it when it's a hardcoded template
  // language; otherwise emit the ENGLISH canonical template (which the webhook
  // then AI-translates before sending). English also keeps identifyTemplate/
  // currentStage working, since the stored transcript stays in a known language.
  const lang: Lang = forcedLang
    ? isHardcodedLang(forcedLang)
      ? forcedLang
      : "en"
    : conversationLanguage(history);
  const stage = currentStage(history);

  if (stage === "DONE") {
    return { send: null, lock: true, reason: "already_done" };
  }

  if (stage === "AWAITING_FIRST_REPLY") {
    // Any first reply from the creator triggers the offer (with Yes/No buttons).
    return offerDecision(lang, "sent_offer");
  }

  if (stage === "AWAITING_YESNO") {
    const verdict = classifyYesNo(lastUser(history));
    if (verdict === "yes") {
      return { send: template("WHATSAPP_ASK", lang), lock: false, reason: "yes_ask_whatsapp" };
    }
    if (verdict === "no") {
      return { send: null, lock: true, reason: "declined_silent" };
    }
    // unclear
    if (alreadyRetried(history, "OFFER")) {
      return { send: null, lock: true, reason: "yesno_unclear_twice_end" };
    }
    return offerDecision(lang, "yesno_unclear_retry");
  }

  // AWAITING_PHONE
  const phone = extractPhone(lastUser(history));
  if (phone) {
    return { send: template("CONFIRM", lang), lock: true, capturedPhone: phone, reason: "phone_captured" };
  }
  if (alreadyRetried(history, "WHATSAPP_ASK")) {
    return { send: null, lock: true, reason: "phone_invalid_twice_end" };
  }
  return { send: template("WHATSAPP_ASK", lang), lock: false, reason: "phone_invalid_retry" };
}

function lastUser(history: { role: "user" | "assistant"; content: string }[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].content;
  }
  return "";
}

// The last scripted template we sent determines the stage. If the last
// assistant message isn't a known template (it's the manual opener, or there's
// no assistant message yet), we're waiting for the creator's first reply.
export function currentStage(
  history: { role: "user" | "assistant"; content: string }[]
): FlowStage {
  let lastTemplate: TemplateKind | null = null;
  for (const m of history) {
    if (m.role === "assistant") {
      const t = identifyTemplate(m.content);
      lastTemplate = t ? t.kind : lastTemplate; // opener (non-template) doesn't reset
      if (t?.kind === "CONFIRM") lastTemplate = "CONFIRM";
    }
  }
  switch (lastTemplate) {
    case "OFFER":
      return "AWAITING_YESNO";
    case "WHATSAPP_ASK":
      return "AWAITING_PHONE";
    case "CONFIRM":
      return "DONE";
    default:
      return "AWAITING_FIRST_REPLY";
  }
}

// True if the last two assistant messages are BOTH the given kind — i.e. we've
// already re-asked once and the creator's latest reply is still ambiguous.
function alreadyRetried(
  history: { role: "user" | "assistant"; content: string }[],
  kind: TemplateKind
): boolean {
  const kinds = history
    .filter((m) => m.role === "assistant")
    .map((m) => identifyTemplate(m.content)?.kind)
    .filter((k): k is TemplateKind => !!k);
  const n = kinds.length;
  return n >= 2 && kinds[n - 1] === kind && kinds[n - 2] === kind;
}
