"use server";

import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

async function validateAdminOrSales() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: userRecord } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRecord || (userRecord.role !== UserRole.Admin && userRecord.role !== UserRole.Sales)) {
    throw new Error("Unauthorized");
  }

  return { supabase, userId: user.id };
}

export async function upsertAccountAssignment(input: {
  buyerOrgId: string;
  vendorOrgId: string | null;
  salesUserId: string;
  logisticsUserId: string | null;
}) {
  const { supabase, userId } = await validateAdminOrSales();

  const { data: existing } = await supabase
    .from("account_assignments")
    .select("id")
    .eq("buyer_org_id", input.buyerOrgId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("account_assignments")
      .update({
        vendor_org_id: input.vendorOrgId,
        sales_user_id: input.salesUserId,
        logistics_user_id: input.logisticsUserId,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("account_assignments").insert({
      buyer_org_id: input.buyerOrgId,
      vendor_org_id: input.vendorOrgId,
      sales_user_id: input.salesUserId,
      logistics_user_id: input.logisticsUserId,
    });

    if (error) throw error;
  }

  revalidatePath("/sales/accounts");
  revalidatePath(`/sales/accounts/${input.buyerOrgId}`);
}

export async function upsertBuyerProductPrice(input: {
  buyerOrgId: string;
  productId: string;
  settlementPrice: number;
  finalPrice: number;
  currencyCode: string;
  note?: string;
}) {
  const { supabase, userId } = await validateAdminOrSales();

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("buyer_product_prices")
    .select("id")
    .eq("buyer_org_id", input.buyerOrgId)
    .eq("product_id", input.productId)
    .is("effective_to", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("buyer_product_prices")
      .update({
        settlement_price: input.settlementPrice,
        final_price: input.finalPrice,
        currency_code: input.currencyCode,
        note: input.note ?? null,
        created_by: userId,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("buyer_product_prices").insert({
      buyer_org_id: input.buyerOrgId,
      product_id: input.productId,
      settlement_price: input.settlementPrice,
      final_price: input.finalPrice,
      currency_code: input.currencyCode,
      effective_from: today,
      note: input.note ?? null,
      created_by: userId,
    });

    if (error) throw error;
  }

  revalidatePath(`/sales/accounts/${input.buyerOrgId}`);
}

export async function bulkUpdatePrices(input: {
  buyerOrgId: string;
  items: Array<{
    productId: string;
    settlementPrice: number;
    finalPrice: number;
  }>;
  currencyCode: string;
}) {
  const { supabase, userId } = await validateAdminOrSales();

  const today = new Date().toISOString().slice(0, 10);

  for (const item of input.items) {
    const { data: existing } = await supabase
      .from("buyer_product_prices")
      .select("id")
      .eq("buyer_org_id", input.buyerOrgId)
      .eq("product_id", item.productId)
      .is("effective_to", null)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("buyer_product_prices")
        .update({
          settlement_price: item.settlementPrice,
          final_price: item.finalPrice,
          currency_code: input.currencyCode,
          created_by: userId,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("buyer_product_prices").insert({
        buyer_org_id: input.buyerOrgId,
        product_id: item.productId,
        settlement_price: item.settlementPrice,
        final_price: item.finalPrice,
        currency_code: input.currencyCode,
        effective_from: today,
        created_by: userId,
      });
    }
  }

  revalidatePath(`/sales/accounts/${input.buyerOrgId}`);
}

export async function deleteBuyerProductPrice(priceId: string, buyerOrgId: string) {
  const { supabase } = await validateAdminOrSales();

  const { error } = await supabase
    .from("buyer_product_prices")
    .delete()
    .eq("id", priceId);

  if (error) throw error;

  revalidatePath(`/sales/accounts/${buyerOrgId}`);
}
