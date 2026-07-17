/* Run: npx tsx src/lib/flow.selftest.ts  — pure-logic tests, no I/O. */
import {
  detectLanguage, classifyYesNo, extractPhone, decide, template, currentStage,
  type Lang,
} from "./flow";

let pass = 0;
let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; } else { fail++; console.log(`FAIL ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`); }
}

// ── language detection ──
eq("lang hindi romanized", detectLanguage("haan mujhe interested hai"), "hi");
eq("lang bengali romanized", detectLanguage("ami korbo, apnar number din"), "bn");
eq("lang english", detectLanguage("yes I am interested"), "en");
eq("lang bengali native", detectLanguage("হ্যাঁ আমি করবো"), "bn");
eq("lang hindi native", detectLanguage("हाँ मुझे चाहिए"), "hi");

// ── yes/no ──
eq("yes en", classifyYesNo("yes"), "yes");
eq("yes hi", classifyYesNo("haan bilkul"), "yes");
eq("yes bn", classifyYesNo("hyan obosshoi"), "yes");
eq("yes ok", classifyYesNo("ok"), "yes");
eq("no en", classifyYesNo("no thanks"), "no");
eq("no hi", classifyYesNo("nahi chahiye"), "no");
eq("no na", classifyYesNo("na"), "no");
eq("no native bn", classifyYesNo("না"), "no");
eq("unclear", classifyYesNo("what is this about?"), "unclear");
eq("unclear both", classifyYesNo("haan nahi pata"), "unclear");
// "nahi" must not be read as "ha"/yes
eq("nahi is no not yes", classifyYesNo("nahi"), "no");

// ── phone extraction ──
eq("phone plain", extractPhone("9876543210"), "9876543210");
eq("phone +91", extractPhone("+91 98765 43210"), "9876543210");
eq("phone 91 prefix", extractPhone("919876543210"), "9876543210");
eq("phone 0 prefix", extractPhone("098765 43210"), "9876543210");
eq("phone in text", extractPhone("mera number 9876543210 hai"), "9876543210");
eq("phone dashed", extractPhone("98765-43210"), "9876543210");
eq("phone invalid short", extractPhone("12345"), null);
eq("phone invalid start", extractPhone("1234567890"), null); // starts with 1
eq("phone none", extractPhone("call me maybe"), null);

// ── FSM walk-throughs ──
type Msg = { role: "user" | "assistant"; content: string };
const OFFER_HI = template("OFFER", "hi" as Lang);
const ASK_HI = template("WHATSAPP_ASK", "hi" as Lang);

// 1. Opener sent manually (assistant, free text) → creator replies → OFFER
{
  const h: Msg[] = [
    { role: "assistant", content: "Namaste! Aapki reel bahut acchi lagi 🙏" },
    { role: "user", content: "ji boliye" },
  ];
  const d = decide(h);
  eq("stage after opener", currentStage(h.slice(0, 1)), "AWAITING_FIRST_REPLY");
  eq("first reply -> offer(hi)", d.send, OFFER_HI);
  eq("first reply no lock", d.lock, false);
  // Offer carries tappable Haan/Nahi quick replies in the detected language.
  eq("offer quick replies hi", d.quickReplies, [
    { title: "Haan", payload: "FLOW_YES" },
    { title: "Nahi", payload: "FLOW_NO" },
  ]);
}

// 1b. Tapping the "Haan" quick reply sends its title as text → classifies YES
{
  const h: Msg[] = [
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "Haan" }, // exactly what a Haan-button tap delivers
  ];
  eq("tapped Haan -> ask whatsapp", decide(h).send, ASK_HI);
}

// 2. No opener stored (echo missed) → first creator msg still triggers offer
{
  const h: Msg[] = [{ role: "user", content: "haan bataiye" }];
  const d = decide(h);
  eq("no-opener first reply -> offer", d.send, OFFER_HI);
}

// 3. Offer sent → YES → ask whatsapp
{
  const h: Msg[] = [
    { role: "assistant", content: "opener" },
    { role: "user", content: "haan" },
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "haan bilkul karunga" },
  ];
  const d = decide(h);
  eq("stage awaiting yesno", currentStage(h), "AWAITING_YESNO");
  eq("yes -> ask whatsapp", d.send, ASK_HI);
  eq("yes not locked", d.lock, false);
}

// 4. Offer sent → NO → silent lock
{
  const h: Msg[] = [
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "nahi interested nahi" },
  ];
  const d = decide(h);
  eq("no -> silent", d.send, null);
  eq("no -> lock", d.lock, true);
}

// 5. Offer → unclear → retry once
{
  const h: Msg[] = [
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "matlab kya hai" },
  ];
  const d = decide(h);
  eq("unclear -> retry offer", d.send, OFFER_HI);
  eq("unclear retry no lock", d.lock, false);
}

// 6. Offer → unclear → offer again → unclear again → end (lock, silent)
{
  const h: Msg[] = [
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "hmmmm kya" },
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "pata nahi yaar" },
  ];
  const d = decide(h);
  eq("unclear twice -> silent", d.send, null);
  eq("unclear twice -> lock", d.lock, true);
}

// 7. Ask whatsapp → valid number → confirm + lock + capture
{
  const h: Msg[] = [
    { role: "assistant", content: OFFER_HI },
    { role: "user", content: "haan" },
    { role: "assistant", content: ASK_HI },
    { role: "user", content: "9876543210" },
  ];
  const d = decide(h);
  eq("stage awaiting phone", currentStage(h), "AWAITING_PHONE");
  eq("phone -> confirm", d.send, template("CONFIRM", "hi" as Lang));
  eq("phone -> lock", d.lock, true);
  eq("phone -> captured", d.capturedPhone, "9876543210");
}

// 8. Ask whatsapp → invalid → retry → invalid → end
{
  const h: Msg[] = [
    { role: "assistant", content: ASK_HI },
    { role: "user", content: "kal dunga" },
    { role: "assistant", content: ASK_HI },
    { role: "user", content: "abhi nahi" },
  ];
  const d = decide(h);
  eq("phone invalid twice -> silent", d.send, null);
  eq("phone invalid twice -> lock", d.lock, true);
}

// 9. Language sticks: offer sent in Bengali, later stages stay Bengali
{
  const h: Msg[] = [
    { role: "assistant", content: template("OFFER", "bn" as Lang) },
    { role: "user", content: "ok" },
  ];
  const d = decide(h);
  eq("bn stays bn", d.send, template("WHATSAPP_ASK", "bn" as Lang));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
