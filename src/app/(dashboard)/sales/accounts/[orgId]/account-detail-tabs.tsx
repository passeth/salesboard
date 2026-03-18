"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AccountOverview, AccountPerformanceStats, AccountPricingRow } from "@/types";
import { useState } from "react";
import { AccountOverviewTab } from "./account-overview";
import { AccountPerformanceTab } from "./account-performance";
import { AccountPricingTab } from "./account-pricing";

type AccountDetailTabsProps = {
  overview: AccountOverview;
  pricing: AccountPricingRow[];
  performance: AccountPerformanceStats | null;
  internalUsers: { id: string; name: string; email: string; role: string }[];
  vendorOrgs: { id: string; name: string; code: string | null }[];
};

export function AccountDetailTabs({
  overview,
  pricing,
  performance,
  internalUsers,
  vendorOrgs,
}: AccountDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="pricing">
          Pricing
          <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
            {pricing.filter((p) => p.price_id !== null).length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <AccountOverviewTab
          overview={overview}
          internalUsers={internalUsers}
          vendorOrgs={vendorOrgs}
        />
      </TabsContent>

      <TabsContent value="pricing" className="mt-4">
        <AccountPricingTab
          pricing={pricing}
          buyerOrgId={overview.org.id}
          currencyCode={overview.org.currency_code}
        />
      </TabsContent>

      <TabsContent value="performance" className="mt-4">
        <AccountPerformanceTab
          performance={performance}
          currencyCode={overview.org.currency_code}
        />
      </TabsContent>
    </Tabs>
  );
}
