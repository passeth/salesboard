"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Store, Users } from "lucide-react";
import { BuyersTab, type BuyerRow } from "./buyers-tab";
import { SalesTab, type SalesUserRow } from "./sales-tab";
import { VendorsTab, type VendorRow } from "./vendors-tab";

type AllOrgOption = {
  id: string;
  name: string;
  code: string | null;
  org_type: string;
};

type OrganizationsTabsProps = {
  buyers: BuyerRow[];
  vendors: VendorRow[];
  salesUsers: SalesUserRow[];
  allOrgs: AllOrgOption[];
};

export function OrganizationsTabs({ buyers, vendors, salesUsers, allOrgs }: OrganizationsTabsProps) {
  return (
    <Tabs defaultValue="buyers">
      <TabsList>
        <TabsTrigger value="buyers">
          <Building2 className="size-4" />
          바이어 ({buyers.length})
        </TabsTrigger>
        <TabsTrigger value="vendors">
          <Store className="size-4" />
          벤더 ({vendors.length})
        </TabsTrigger>
        <TabsTrigger value="sales">
          <Users className="size-4" />
          영업 ({salesUsers.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="buyers">
        <BuyersTab buyers={buyers} allOrgs={allOrgs} />
      </TabsContent>

      <TabsContent value="vendors">
        <VendorsTab vendors={vendors} buyers={buyers} />
      </TabsContent>

      <TabsContent value="sales">
        <SalesTab salesUsers={salesUsers} buyers={buyers} />
      </TabsContent>
    </Tabs>
  );
}
