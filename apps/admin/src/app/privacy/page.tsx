import type { Metadata } from "next";
import { LegalPageShell, TodoNotice } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy | Fünf Sterne Friseur",
  description: "How the Fünf Sterne Friseur app handles your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="10 August 2026">
      <TodoNotice>
        fill in the data retention period below before this page is linked
        from the App Store listing.
      </TodoNotice>

      <p>
        This policy explains what data the Fünf Sterne Friseur mobile app
        collects, why, and what rights you have over it. Using the app
        requires a free account — but that account only ever needs a name
        and a username/password you choose. We never ask for your email
        address or phone number, for this or anything else.
      </p>

      <h2>Who is responsible for this data</h2>
      <p>
        Mohamed Gamal Elsayed Mahmoud, Frauenstraße 5, 47574 Goch, Germany,
        is the data controller for the Fünf Sterne Friseur app. You can
        reach us at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>{" "}
        for any question about this policy or your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your name and a username/password.</strong> Creating an
          account asks for your first and last name and a username and
          password you choose. Your password is stored as a one-way
          cryptographic hash — we cannot see, recover, or read it back, even
          internally. There is no email or phone number field anywhere in
          the sign-up flow.
        </li>
        <li>
          <strong>Device identifier.</strong> Alongside your account, the
          app also generates a random identifier stored securely on your
          device. It is not derived from your name or any Apple/Google
          advertising identifier. It exists to prevent a single physical
          device from redeeming the same discount code more than once, as a
          second layer alongside the per-account limit below.
        </li>
        <li>
          <strong>Push notification token.</strong> If you allow
          notifications, we store an Expo push token linked to your account
          so we can send you offers about new discount codes. If you decline
          or later disable notifications, no token is stored or used.
        </li>
        <li>
          <strong>Discount redemption records.</strong> When you redeem a
          discount code, we record which code, when, and (if relevant) at
          which branch — linked to your account and device, so the same
          code can&apos;t be redeemed twice by the same person.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        The app never asks for your email address, phone number, precise
        location, contacts, or photos. There is no advertising or cross-app
        tracking identifier of any kind, and your password is never visible
        to us in plain text at any point.
      </p>

      <h2>Why we process this data</h2>
      <p>
        Your name, username, and password are processed to provide the
        account itself — the service you asked for by signing up (GDPR Art.
        6(1)(b)). The device identifier and redemption records rely on our
        legitimate interest (Art. 6(1)(f)) in preventing abuse of the
        discount program, and in delivering the notification service you
        opted into.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Your account (name, username, password) is kept until you delete it.
        [Describe the retention period for redemption/push-token records
        specifically here — e.g. kept for as long as your account exists,
        or a defined period after a discount program ends.] You can delete
        your account at any time from the Account tab in the app, or see
        &quot;Your rights&quot; below for other options.
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
        purposes. Shop staff can see your name and username in our admin
        system (to assist with an in-person password reset, since there is
        no email/phone-based self-service reset) — never your password,
        which is not visible to anyone.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you have the right to request access to, correction
        of, or deletion of your data, to object to or restrict our
        processing of it, and to lodge a complaint with your local data
        protection supervisory authority. You can exercise the right to
        deletion yourself at any time — open the app, go to the Account tab,
        and choose Delete account. This permanently removes your name,
        username, and password; it cannot be undone or recovered by us. For
        anything else, contact us at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>
        .
      </p>

      <h2>Forgotten passwords</h2>
      <p>
        Because we don&apos;t collect an email or phone number, there is no
        automated password reset. If you forget your password, ask a staff
        member at your next visit and we can set a new one for you in our
        admin system — we can never see or recover your old password, only
        set a new one.
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
