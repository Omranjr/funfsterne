import { z } from "zod";

export const ProductCategorySchema = z.enum([
  "HAIR",
  "SKIN_CARE",
  "BEARD",
  "TOOLS",
  "OTHER",
]);

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export const DiscountCodeTypeSchema = z.enum(["PERCENTAGE", "FIXED"]);

export type DiscountCodeType = z.infer<typeof DiscountCodeTypeSchema>;

export const PlatformSchema = z.enum(["IOS", "ANDROID"]);

export type Platform = z.infer<typeof PlatformSchema>;

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
});

export type Product = z.infer<typeof ProductSchema>;

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

export const UserSchema = z.object({
  id: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  preferredBranchId: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const PushTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  platform: PlatformSchema,
  createdAt: z.coerce.date(),
});

export type PushToken = z.infer<typeof PushTokenSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  discountCodeId: z.string().optional(),
  sentAt: z.coerce.date(),
  sentToCount: z.number().int().nonnegative().default(0),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;
