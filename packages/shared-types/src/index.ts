import { z } from "zod";

// Placeholder schemas — expand once the Prisma schema is finalized.

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Product = z.infer<typeof ProductSchema>;

export const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Branch = z.infer<typeof BranchSchema>;

// Reserved schema names for future expansion:
// ProductBranchAvailability, DiscountCode, User, PushToken, Notification
