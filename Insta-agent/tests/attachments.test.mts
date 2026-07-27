/**
 * Attachment-only replies.
 *
 * Creators in this trade answer by showing their work — a video of a tiling job,
 * photos of finished tiling, a voice note. The webhook used to drop any message
 * with no text, so the bot sat silent on the clearest signal of interest it gets
 * (two real creators went a week with no reply). These tests pin the behaviour
 * that replaced it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  attachmentPlaceholder,
  creatorLanguageSwitch,
  currentStage,
  decide,
  detectLanguage,
  identifyTemplate,
  isAttachmentPlaceholder,
  languageSource,
  signalLanguage,
  template,
} from "../src/lib/flow.ts";

type Msg = { role: "user" | "assistant"; content: string };
const A = (content: string): Msg => ({ role: "assistant", content });
const U = (content: string): Msg => ({ role: "user", content });

// The exact opener sent to @gurpreet_thekedaar, who replied with a video.
const GURPREET_OPENER =
  "Hello Gurpreet!\n\nMaine aapki profile pe tiling ka kaam dekha, bahut badhiya finishing hai.\n\nAre you Interested for collaboration?";
const VIDEO = attachmentPlaceholder(["video"]);

test("a video reply is recognised as a reply, not discarded", () => {
  assert.equal(isAttachmentPlaceholder(VIDEO), true);
  assert.equal(attachmentPlaceholder([]), "[attachment]");
  assert.equal(attachmentPlaceholder(["image", "image"]), "[attachment] image");
});

test("the real case: Hinglish opener + a video reply gets the offer", () => {
  // Detected from the opener, since a video carries no language.
  assert.equal(detectLanguage(GURPREET_OPENER), "hi");

  const history = [A(GURPREET_OPENER), U(VIDEO)];
  assert.equal(currentStage(history), "AWAITING_FIRST_REPLY");

  const decision = decide(history, "hi");
  assert.ok(decision.send, "the bot must answer a creator who sent their work");
  assert.equal(decision.reason, "sent_offer");
  assert.equal(decision.lock, false);
  assert.equal(
    identifyTemplate(decision.send!)?.lang,
    "hi",
    "and it must answer in the opener's language"
  );
  assert.ok(decision.quickReplies?.length, "with tappable Haan/Nahi buttons");
});

test("an attachment never decides the conversation language", () => {
  assert.equal(signalLanguage(VIDEO), null);

  // Our own outbound attachment must not be mistaken for the manual opener.
  const source = languageSource([A(VIDEO), A(GURPREET_OPENER)], { committed: false });
  assert.equal(source.kind, "manual");
  assert.equal(
    source.kind === "manual" && detectLanguage(source.text),
    "hi",
    "the written opener sets the language, not the attachment"
  );

  // A creator-sent attachment must not be picked as the creator's language sample.
  const creatorSide = languageSource([U(VIDEO), U("ami apnar sathe kaj korte chai")], {
    committed: false,
  });
  assert.equal(creatorSide.kind, "creator");
  assert.equal(creatorSide.kind === "creator" && detectLanguage(creatorSide.text), "bn");
});

test("attachments neither trigger nor break a language switch", () => {
  // Two attachments are not two English messages.
  assert.equal(creatorLanguageSwitch([U(VIDEO), U(VIDEO)], "hi"), null);

  // A video sent between two English messages must not break the streak.
  const history = [
    A(GURPREET_OPENER),
    U("can you please tell me more about the offer"),
    U(VIDEO),
    U("and what is the product that you want me to make"),
  ];
  assert.equal(creatorLanguageSwitch(history, "hi"), "en");
});

test("a video where a yes/no was expected is treated as unclear, not as consent", () => {
  // Sending work samples is encouraging, but it is not the creator agreeing to
  // terms — the flow re-asks rather than assuming a yes and demanding a number.
  const history = [A(template("OFFER", "hi")), U(VIDEO)];
  assert.equal(currentStage(history), "AWAITING_YESNO");

  const decision = decide(history, "hi");
  assert.equal(decision.reason, "yesno_unclear_retry");
  assert.equal(identifyTemplate(decision.send!)?.kind, "OFFER");
  assert.equal(decision.lock, false, "an engaged creator must not be dropped");
});

test("a video where a phone number was expected re-asks for the number", () => {
  const history = [A(template("WHATSAPP_ASK", "hi")), U(VIDEO)];
  assert.equal(currentStage(history), "AWAITING_PHONE");

  const decision = decide(history, "hi");
  assert.equal(decision.reason, "phone_invalid_retry");
  assert.equal(identifyTemplate(decision.send!)?.kind, "WHATSAPP_ASK");
  assert.equal(decision.capturedPhone, undefined);
});
