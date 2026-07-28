/**
 * The conversation-language contract.
 *
 * Run: npm test   (zero dependencies — Node's built-in runner + type stripping)
 *
 * This logic has caused two production bugs that produced no error, just wrong
 * behaviour: creators stranded in English after a Bengali opener, and the bot
 * going silent because human messages spent its message budget. The rules below
 * are the intended contract; keep them passing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  creatorLanguageSwitch,
  decide,
  detectLanguage,
  hasLanguageSignal,
  languageSource,
  signalLanguage,
  template,
  MAX_BOT_MESSAGES,
} from "../src/lib/flow.ts";

type Msg = { role: "user" | "assistant"; content: string };
const A = (content: string): Msg => ({ role: "assistant", content });
const U = (content: string): Msg => ({ role: "user", content });

const BN_OPENER =
  "Hi! Ami Bharat Content Company theke bolchi. Amra apnar sathe collaboration korte chai. Apni ki interested achen?";
const HI_OPENER =
  "Namaste! Hum aapke content dekhe hain aur aapke sathe collaboration karna chahte hain. Kya aapko interest hai?";
const EN_OPENER =
  "Hi! We loved your content and would like to collaborate with you on a paid reel.";

/**
 * Mirrors the resolution the webhook performs, minus the DB writes and the AI
 * naming call for languages we hold no templates for. Kept in lockstep with
 * src/app/api/webhook/route.ts.
 */
function resolveLanguage(history: Msg[], stored: string | null = null): string {
  let lang = stored;

  const source = languageSource(history, { committed: lang !== null });
  if (source.kind === "manual" || !lang) {
    let resolved: string | null = null;
    if (source.kind === "template") {
      resolved = source.lang;
    } else if (source.kind === "manual" || source.kind === "creator") {
      const quick = detectLanguage(source.text);
      if (quick !== "en") resolved = quick;
      else if (!lang && hasLanguageSignal(source.text)) resolved = "en";
    }
    if (resolved && resolved !== lang) lang = resolved;
  }

  if (lang) {
    const switched = creatorLanguageSwitch(history, lang);
    if (switched) lang = switched;
  }

  return lang ?? "unresolved";
}

test("the human-written message sets the language", () => {
  assert.equal(resolveLanguage([A(BN_OPENER)]), "bn");
  assert.equal(resolveLanguage([A(HI_OPENER)]), "hi");
  assert.equal(resolveLanguage([A(EN_OPENER)]), "en");
  assert.equal(
    resolveLanguage([A("আপনার কনটেন্ট দারুণ হয়েছে, আমরা কোলাবরেশন করতে চাই")]),
    "bn",
    "native script must be detected too"
  );
});

test("a re-opened thread follows the newest opener, not a stale one", () => {
  // Seen in production on @imdebojyotiii: an English opener one day, a Bengali
  // opener into the same thread the next. Honouring the FIRST human message left
  // the bot answering the Bengali pitch in English.
  const history = [
    A(EN_OPENER),
    U("Hiii"),
    A(template("OFFER", "en")),
    U("Yes"),
    A(template("WHATSAPP_ASK", "en")),
    A(BN_OPENER), // operator re-opens in Bengali the next day
    U("Intarested"),
  ];
  assert.equal(
    resolveLanguage(history, "en"),
    "bn",
    "the operator's newest choice must win over yesterday's"
  );
});

test("an operator's 'ok' does not flip the thread's language", () => {
  // The newest-wins rule must not be hijacked by a throwaway line: "ok" carries
  // no language signal, so the Bengali opener still governs.
  assert.equal(resolveLanguage([A(BN_OPENER), U("Intarested"), A("ok")], "bn"), "bn");
  assert.equal(resolveLanguage([A(BN_OPENER), A("ok done")], null), "bn");
});

test("the opener's language survives a creator replying in English", () => {
  assert.equal(resolveLanguage([A(BN_OPENER), U("yes ok send details")]), "bn");
});

test("too little text does not commit the conversation", () => {
  // A bare "hi" used to pin the thread to English for good.
  assert.equal(resolveLanguage([U("HI")]), "unresolved");
  assert.equal(hasLanguageSignal("hi"), false);
  assert.equal(hasLanguageSignal("HI there"), false);
});

test("a fallback reply sent while unresolved cannot lock the language", () => {
  // The regression: "hi" -> bot answers in English -> creator writes Bengali.
  // The bot's own English template must not become the authority.
  const history = [
    U("HI"),
    A(template("OFFER", "en")),
    U("amar sathe kaj korte chai, apnar offer ta ki"),
  ];
  assert.equal(resolveLanguage(history), "bn");
});

test("a human can override a language the bot already guessed", () => {
  const history = [U("HI"), A(template("OFFER", "en")), A(BN_OPENER)];
  assert.equal(resolveLanguage(history, "en"), "bn");
});

test("a committed conversation does not drift mid-flow", () => {
  assert.equal(
    resolveLanguage([A(template("OFFER", "bn")), U("ok")], "bn"),
    "bn"
  );
  assert.equal(
    resolveLanguage([A(template("OFFER", "hi")), U("yes please")], "hi"),
    "hi"
  );
});

test("one off-language reply does not unseat the opener; two do", () => {
  const oneEnglish = [
    A(BN_OPENER),
    U("can you please tell me more about the offer"),
  ];
  assert.equal(resolveLanguage(oneEnglish), "bn", "one reply is not a preference");

  const twoEnglish = [
    ...oneEnglish,
    U("and what is the product that you want me to make"),
  ];
  assert.equal(resolveLanguage(twoEnglish), "en", "two is");
});

test("short affirmations between the two do not break the streak", () => {
  const history = [
    A(BN_OPENER),
    U("can you please tell me more about the offer"),
    U("ok"),
    U("and what is the product that you want me to make"),
  ];
  assert.equal(resolveLanguage(history), "en");
});

test("the creator can be followed back to the opener's language", () => {
  const history = [
    A(BN_OPENER),
    U("can you please tell me more about the offer"),
    U("and what is the product that you want me to make"),
    U("thik ache ami korbo, apnar product ta pathan"),
  ];
  assert.equal(resolveLanguage(history), "bn");
});

test("the switch is symmetric: an English opener yields to Bengali", () => {
  const history = [
    A(EN_OPENER),
    U("ami apnar sathe kaj korte chai khub bhalo lagbe"),
    U("amar jonno ekta bhalo offer din please"),
  ];
  assert.equal(resolveLanguage(history), "bn");
});

test("romanized regional text is never mistaken for English", () => {
  // "en" from detectLanguage means "no regional keyword matched", which includes
  // romanized Bengali we hold no keyword for. Treating that as English would
  // switch a Bengali creator into English replies.
  assert.equal(signalLanguage("amake details din ekhon"), null);
  const history = [
    A(BN_OPENER),
    U("amake details din ekhon"),
    U("amake details din ekhon"),
  ];
  assert.equal(resolveLanguage(history), "bn");
});

test("only substantive messages count as language evidence", () => {
  assert.equal(signalLanguage("yes ok"), null, "too short to read");
  assert.equal(signalLanguage("ok thanks"), null, "too short to read");
  assert.equal(signalLanguage("9635507951"), null, "a phone number says nothing");
  assert.equal(signalLanguage("can you please tell me more about the offer"), "en");
  assert.equal(signalLanguage("haan ami interested achi"), "bn");
});

test("with no human message the creator's own words decide immediately", () => {
  // Messenger: a Page cannot open a conversation, so there is no manual opener
  // and the creator's language applies without waiting for a second message.
  const history = [U("HI"), U("ami apnar sathe kaj korte chai khub bhalo lagbe")];
  assert.equal(resolveLanguage(history), "bn");
});

test("human messages do not spend the bot's message budget", () => {
  // A dashboard send lands twice (the dashboard inserts a row and Meta echoes
  // the same message back), so an operator's opener plus one follow-up used to
  // hit the cap and the bot fell silent on the creator's first "yes".
  const followUp = "Apnar kono proshno achhe? Amra 2000 taka voucher dibo.";
  const history = [
    A(BN_OPENER),
    A(BN_OPENER),
    A(followUp),
    A(followUp),
    U("haan ami interested"),
  ];
  const decision = decide(history, "bn");
  assert.notEqual(decision.reason, "max_bot_messages_reached");
  assert.ok(decision.send, "the bot must still answer the creator");
});

test("the loop backstop still fires on the bot's own messages", () => {
  const history = [
    A(template("OFFER", "bn")),
    A(template("OFFER", "bn")),
    A(template("WHATSAPP_ASK", "bn")),
    A(template("WHATSAPP_ASK", "bn")),
    U("ok"),
  ];
  const decision = decide(history, "bn");
  assert.equal(decision.reason, "max_bot_messages_reached");
  assert.equal(decision.send, null);
  assert.equal(decision.lock, true);
  assert.equal(MAX_BOT_MESSAGES, 4);
});
