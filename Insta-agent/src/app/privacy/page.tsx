import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — AI Collective",
  description: "How AI Collective collects, uses, and protects data in its creator outreach messaging service.",
};

// Static privacy policy served at /privacy. Used as the Privacy Policy URL for
// Meta App Review (Instagram Messaging + Facebook Messenger / pages_messaging).
// Update the CONTACT and ENTITY values below to match the registered business.
const ENTITY = "AI Collective";
const CONTACT_EMAIL = "finance@aicollective.agency";
const LAST_UPDATED = "23 July 2026";

export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-400">Last updated: {LAST_UPDATED}</p>

      <section className="mt-8 space-y-4 leading-relaxed">
        <p>
          {ENTITY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates an automated
          messaging assistant that helps brands run content-creator
          collaboration campaigns on Instagram and Facebook Messenger. This
          policy explains what we collect when you message one of our pages,
          how we use it, and the choices you have.
        </p>

        <h2 className="pt-4 text-xl font-medium text-white">Information we collect</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Messages you send us.</strong> The content of the messages
            you send to our Instagram account or Facebook Page, and our replies.
          </li>
          <li>
            <strong>Basic profile information</strong> provided by Meta when you
            message us — such as your name and profile picture — so we can
            recognise and respond to you.
          </li>
          <li>
            <strong>Contact details you choose to share</strong> — for example a
            WhatsApp number you provide so our team can follow up about a
            collaboration.
          </li>
          <li>
            <strong>Conversation metadata</strong> such as language and
            timestamps, used to reply in your language and manage the chat.
          </li>
        </ul>
        <p>
          We only receive messages from people who message our page first. We do
          not send unsolicited messages, and we do not access your private
          content beyond the conversation you have with us.
        </p>

        <h2 className="pt-4 text-xl font-medium text-white">How we use it</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>To respond to your messages and answer questions.</li>
          <li>To explain and coordinate a paid content-collaboration offer.</li>
          <li>
            To pass your contact details to our human team, and to the specific
            brand client for the campaign you agree to take part in, so they can
            complete the collaboration with you.
          </li>
          <li>To operate, secure, and improve our messaging service.</li>
        </ul>
        <p>We do not sell your personal information to anyone.</p>

        <h2 className="pt-4 text-xl font-medium text-white">Service providers</h2>
        <p>
          We share data only with providers that help us run the service:
          Meta Platforms (Instagram &amp; Messenger delivery), an AI language
          provider used to translate our own message templates, and our cloud
          hosting and database providers. They process data on our behalf under
          their own terms.
        </p>

        <h2 className="pt-4 text-xl font-medium text-white">Data retention</h2>
        <p>
          We keep conversation data for as long as needed to run the campaign
          and for our records, and delete or anonymise it when it is no longer
          required, or on your request (see below).
        </p>

        <h2 id="data-deletion" className="pt-4 text-xl font-medium text-white">
          Your rights &amp; data deletion
        </h2>
        <p>
          You can ask us to access or delete the personal data we hold about
          you, and you can stop the conversation at any time. To request
          deletion, email{" "}
          <a className="text-sky-400 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          from the account you used, or send us a message saying &ldquo;delete my
          data&rdquo;. We will remove your conversation data and any contact
          details you shared within 30 days.
        </p>

        <h2 className="pt-4 text-xl font-medium text-white">Contact</h2>
        <p>
          Questions about this policy or your data? Contact us at{" "}
          <a className="text-sky-400 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
