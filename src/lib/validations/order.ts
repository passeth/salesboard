import { z } from "zod";

export const orderItemSchema = z.object({
  product_id: z.uuid(),
  requested_qty: z.number().int().min(1),
  units_per_case: z.number().int().positive().nullable(),
  unit_price: z.number().nonnegative().nullable(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  requested_delivery_date: z.string().nullable(),
  ship_to_org_id: z.uuid(),
  memo: z.string().max(500),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
