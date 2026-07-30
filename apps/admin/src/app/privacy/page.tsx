import type { Metadata } from "next";
import { LegalPageShell, TodoNotice } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Fünf Sterne Friseur",
  description: "How the Fünf Sterne Friseur app handles your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="29 July 2026">
      <TodoNotice>
        replace the remaining bracketed placeholder below ([Company legal
        name] — waiting on whether this should be the shop owner or the
        developer) and the data retention period, with your real details,
        before this page is linked from the App Store listing.
      </TodoNotice>

      <p>
        This policy explains what data the Fünf Sterne Friseur mobile app
        collects, why, and what rights you have over it. The app does not
        require you to create an account or sign in — it works entirely
        through an anonymous, device-based identifier.
      </p>

      <h2>Who is responsible for this data</h2>
      <p>
        [Company legal name], Frauenstraße 5, 47574 Goch, Germany, is the
        data controller for the Fünf Sterne Friseur app. You can reach us
        at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>{" "}
        for any question about this policy or your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Device identifier.</strong> On first launch, the app
          generates a random identifier and stores it securely on your
          device. It is not derived from your name, email, or any Apple/Google
          advertising identifier, and it cannot be used to identify you
          personally. Its only purpose is to prevent the same physical device
          from redeeming a discount code more than once.
        </li>
        <li>
          <strong>Push notification token.</strong> If you allow
          notifications, we store an Expo push token linked to your device
          identifier so we can send you offers about new discount codes. If
          you decline or later disable notifications, no token is stored or
          used.
        </li>
        <li>
          <strong>Discount redemption records.</strong> When you redeem a
          discount code, we record which code, when, and (if relevant) at
          which branch — linked to your device identifier, not to you
          personally.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        The app never asks for your name, email address, phone number,
        precise location, contacts, or photos. There is no login, no user
        account, and no advertising or cross-app tracking identifier of any
        kind.
      </p>

      <h2>Why we process this data</h2>
      <p>
        We rely on our legitimate interest (GDPR Art. 6(1)(f)) in preventing
        abuse of the discount program (one redemption per device) and in
        delivering the notification service you opted into, and on the
        performance of the discount redemption itself (Art. 6(1)(b)).
      </p>

      <h2>How long we keep it</h2>
      <p>
        [Describe your retention period here — e.g. redemption and push token
        records are kept for as long as the discount program that generated
        them is active, plus a defined grace period, after which they are
        deleted.] You can request earlier deletion at any time — see
        &quot;Your rights&quot; below.
      </p>

      <h2>Who else sees this data</h2>
      <p>
        We use third-party infrastructure providers to run the app&apos;s
        backend and store this data: our API runs on{" "}
        <a href="https://render.com" target="_blank" rel="noreferrer">
          Render
        </a>{" "}
        and our database is hosted on{" "}
        <a href="https://supabase.com" target="_blank" rel="noreferrer">
          Supabase
        </a>{" "}
        — our Render service runs in Frankfurt (EU Central) and our Supabase
        project in West EU. These providers process data on our behalf under
        their own data processing agreements and do not use it for their own
        purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you have the right to request access to, correction
        of, or deletion of the data linked to your device identifier, to
        object to or restrict our processing of it, and to lodge a complaint
        with your local data protection supervisory authority. Because your
        device identifier is not tied to your name or email, please contact
        us at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>{" "}
        and describe your device/redemption history so we can locate the
        correct record — or simply uninstalling the app and clearing its
        data removes the identifier from your device going forward.
      </p>

      <h2>Children</h2>
      <p>
        This app is not directed at children and does not knowingly collect
        data from children under 16.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the app changes. Material changes will
        be reflected by updating the date at the top of this page.
      </p>
    </LegalPageShell>
  );
}
