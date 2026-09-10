/**
 * Every URL the app hands to the operating system.
 *
 * Collected here because they were previously inline literals -- the privacy
 * policy URL appeared verbatim in two screens, so changing the domain meant
 * remembering both. Apple checks that the privacy link works, which makes a
 * missed copy a review problem rather than only a broken button.
 */

/** Served by the admin app. Linked from Home and from Account. */
export const PRIVACY_URL =
  "https://funfsterne-admin-eight.vercel.app/privacy";

/** The shop's Instagram, offered as "share" on a product. */
export const SHOP_INSTAGRAM = "https://instagram.com/mido.barbar7";

/** Used to build the sms:/tel: link on a product. */
export const SHOP_PHONE = "+4928234198333";
