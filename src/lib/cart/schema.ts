/**
 * A cart item holds choices only. Prices are always recalculated on the
 * server from these choices; nothing price-related is trusted from the cart.
 */
import { z } from "zod";
import { coverTextSchema } from "@/lib/configurator/state";
import { quoteRequestSchema } from "@/lib/quote/server-quote";

export const MAX_CART_ITEMS = 20;

export const designSchema = z
  .object({
    language: z.enum(["en", "ar", "both"]),
    direction: z.enum(["auto", "ltr", "rtl"]),
    text: coverTextSchema,
    /** a logo was added in the builder; the file itself stays on the customer's device */
    hasLogo: z.boolean().default(false),
  })
  .strict();
export type Design = z.output<typeof designSchema>;

export const uploadRefSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
    name: z.string().max(200),
    pages: z.number().int().min(1),
    sizeBytes: z.number().int().min(1),
  })
  .strict();

export const cartItemSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    request: quoteRequestSchema,
    design: designSchema.nullable().default(null),
    upload: uploadRefSchema.nullable().default(null),
    addedAt: z.number().int(),
  })
  .strict();
export type CartItem = z.output<typeof cartItemSchema>;
export type CartItemInput = z.input<typeof cartItemSchema>;

export const cartSchema = z.array(cartItemSchema).max(MAX_CART_ITEMS);
