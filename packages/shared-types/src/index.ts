import { z } from "zod";

export const ProductCategorySchema = z.enum([
  "HAIR",
  "SKIN_CARE",
  "BEARD",
  "TOOLS",
  "OTHER",
]);

export type ProductCategory =
  | "HAIR"
  | "SKIN_CARE"
  | "BEARD"
  | "TOOLS"
  | "OTHER";

// Pretty label for each category, used by both the admin dashboard and the
// mobile home screen. Single source of truth so the two stay in sync.
export const ProductCategoryLabel: Record<ProductCategory, string> = {
  HAIR: "Hair",
  SKIN_CARE: "Skin Care",
  BEARD: "Beard",
  TOOLS: "Tools",
  OTHER: "Other",
};

export const CategoryImageSchema = z.object({
  category: ProductCategorySchema,
  imageUrl: z.string().url(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CategoryImage = z.infer<typeof CategoryImageSchema>;

// Admin upsert payload. The URL is required to be a non-empty http(s) URL
// when present; an empty string is allowed as the "clear" sentinel — the
// route handler treats it as "remove the image" so the admin UI can offer a
// delete affordance without us shipping a dedicated DELETE endpoint.
const CategoryImageUrlSchema = z
  .string()
  .refine(
    (value) => value === "" || /^https?:\/\//i.test(value),
    { message: "imageUrl must be an empty string or an http(s) URL" },
  );

export const UpsertCategoryImageSchema = z.object({
  imageUrl: CategoryImageUrlSchema,
});

export type UpsertCategoryImage = z.infer<typeof UpsertCategoryImageSchema>;

export const DiscountCodeTypeSchema = z.enum(["PERCENTAGE", "FIXED"]);

export type DiscountCodeType = "PERCENTAGE" | "FIXED";

export const PlatformSchema = z.enum(["IOS", "ANDROID"]);

export type Platform = "IOS" | "ANDROID";

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  postalCode: z.string(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Branch = z.infer<typeof BranchSchema>;

export const CreateBranchSchema = BranchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateBranch = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = CreateBranchSchema.partial();

export type UpdateBranch = z.infer<typeof UpdateBranchSchema>;

export const ProductBranchAvailabilitySchema = z.object({
  id: z.string(),
  productId: z.string(),
  branchId: z.string(),
  inStock: z.boolean().default(true),
  priceOverride: z.number().nonnegative().optional(),
});

export type ProductBranchAvailability = z.infer<
  typeof ProductBranchAvailabilitySchema
>;

export const UpsertProductBranchAvailabilitySchema =
  ProductBranchAvailabilitySchema.omit({ id: true });

export type UpsertProductBranchAvailability = z.infer<
  typeof UpsertProductBranchAvailabilitySchema
>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: ProductCategorySchema,
  basePrice: z.number().nonnegative(),
  images: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  availabilities: z.array(ProductBranchAvailabilitySchema).optional(),
});

export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = ProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  availabilities: true,
});

export type CreateProduct = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProduct = z.infer<typeof UpdateProductSchema>;

export const DiscountCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: DiscountCodeTypeSchema,
  value: z.number().nonnegative(),
  expiresAt: z.coerce.date().optional(),
  maxRedemptions: z.number().int().nonnegative().optional(),
  currentRedemptions: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  scopeBranchId: z.string().optional(),
});

export type DiscountCode = z.infer<typeof DiscountCodeSchema>;

export const CreateDiscountCodeSchema = DiscountCodeSchema.omit({
  id: true,
  currentRedemptions: true,
});

export type CreateDiscountCode = z.infer<typeof CreateDiscountCodeSchema>;

export const UpdateDiscountCodeSchema = CreateDiscountCodeSchema.partial();

export type UpdateDiscountCode = z.infer<typeof UpdateDiscountCodeSchema>;

export const PushTokenSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  userId: z.string().optional(),
  token: z.string(),
  platform: PlatformSchema,
  createdAt: z.coerce.date(),
});

export type PushToken = z.infer<typeof PushTokenSchema>;

export const DiscountCodeRedemptionSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  userId: z.string().optional(),
  branchId: z.string().optional(),
  discountCodeId: z.string(),
  redeemedAt: z.coerce.date(),
});

export type DiscountCodeRedemption = z.infer<typeof DiscountCodeRedemptionSchema>;

// ---------------------------------------------------------------------------
// Consumer accounts (mobile app). Deliberately no email or phone field
// anywhere in this group -- only a first/last name and a chosen
// username/password, per product requirement.
// ---------------------------------------------------------------------------

// Letters, numbers, underscore, period -- no spaces, no @ (keeps it visually
// distinct from an email address even though we don't collect one).
const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(USERNAME_PATTERN, "Username can only contain letters, numbers, \".\" and \"_\"");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password is too long");

export const NameFieldSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(100, "This field is too long");

export const ConsumerUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ConsumerUser = z.infer<typeof ConsumerUserSchema>;

export const RegisterConsumerUserSchema = z.object({
  firstName: NameFieldSchema,
  lastName: NameFieldSchema,
  username: UsernameSchema,
  password: PasswordSchema,
});

export type RegisterConsumerUser = z.infer<typeof RegisterConsumerUserSchema>;

export const LoginConsumerUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginConsumerUser = z.infer<typeof LoginConsumerUserSchema>;

// Admin-initiated reset: sets a brand new password, never reveals the old
// one (it's hashed one-way and can't be recovered).
export const AdminResetConsumerPasswordSchema = z.object({
  newPassword: PasswordSchema,
});

export type AdminResetConsumerPassword = z.infer<
  typeof AdminResetConsumerPasswordSchema
>;

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  discountCodeId: z.string().optional(),
  sentAt: z.coerce.date(),
  sentToCount: z.number().int().nonnegative().default(0),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = NotificationSchema.omit({
  id: true,
  sentAt: true,
  sentToCount: true,
});

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

export const SendNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  discountCodeId: z.string().optional(),
  target: z.enum(["all"]),
});

export type SendNotification = z.infer<typeof SendNotificationSchema>;

export const RegisterPushTokenSchema = z.object({
  deviceId: z.string().min(1),
  token: z.string().min(1),
  platform: PlatformSchema,
});

export type RegisterPushToken = z.infer<typeof RegisterPushTokenSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

// ---------------------------------------------------------------------------
// Loyalty program. Points are earned by an admin-scanned visit (10/visit,
// once per calendar day per customer) and spent on a euro-value voucher
// (10 points = EUR 1, EUR 10 minimum) redeemable toward products in person.
// ---------------------------------------------------------------------------

export const LoyaltyTransactionTypeSchema = z.enum(["EARN", "REDEEM"]);
export type LoyaltyTransactionType = "EARN" | "REDEEM";

export const LoyaltyRewardStatusSchema = z.enum(["ACTIVE", "REDEEMED"]);
export type LoyaltyRewardStatus = "ACTIVE" | "REDEEMED";

export const POINTS_PER_VISIT = 10;
export const POINTS_PER_EURO = 10;
export const MIN_REDEEM_POINTS = 100;

export const LoyaltyTransactionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  branchId: z.string().optional(),
  points: z.number().int(),
  type: LoyaltyTransactionTypeSchema,
  note: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type LoyaltyTransaction = z.infer<typeof LoyaltyTransactionSchema>;

export const LoyaltyRewardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  eurosValue: z.number().nonnegative(),
  pointsSpent: z.number().int().nonnegative(),
  status: LoyaltyRewardStatusSchema,
  createdAt: z.coerce.date(),
  redeemedAt: z.coerce.date().optional(),
  redeemedByBranchId: z.string().optional(),
});

export type LoyaltyReward = z.infer<typeof LoyaltyRewardSchema>;

// POST /admin/loyalty/scan
export const LoyaltyScanSchema = z.object({
  userId: z.string().min(1),
  branchId: z.string().min(1),
});

export type LoyaltyScan = z.infer<typeof LoyaltyScanSchema>;

// POST /public/loyalty/redeem
export const LoyaltyRedeemSchema = z.object({
  points: z
    .number()
    .int()
    .min(MIN_REDEEM_POINTS, `Redeem at least ${MIN_REDEEM_POINTS} points`)
    .refine((p) => p % POINTS_PER_EURO === 0, {
      message: `Points must be a multiple of ${POINTS_PER_EURO}`,
    }),
});

export type LoyaltyRedeem = z.infer<typeof LoyaltyRedeemSchema>;

// POST /admin/loyalty/rewards/:id/redeem
export const LoyaltyRewardRedeemSchema = z.object({
  branchId: z.string().min(1),
});

export type LoyaltyRewardRedeem = z.infer<typeof LoyaltyRewardRedeemSchema>;
