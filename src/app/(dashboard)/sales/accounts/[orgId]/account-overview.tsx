"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertAccountAssignment } from "@/app/(dashboard)/sales/_actions/accounts-actions";
import type { AccountOverview } from "@/types";
import { useState, useTransition } from "react";

type AccountOverviewTabProps = {
  overview: AccountOverview;
  internalUsers: { id: string; name: string; email: string; role: string }[];
  vendorOrgs: { id: string; name: string; code: string | null }[];
};

export function AccountOverviewTab({
  overview,
  internalUsers,
  vendorOrgs,
}: AccountOverviewTabProps) {
  const { org, country, ship_to_orgs, assignment, vendor, sales_user, logistics_user } = overview;

  const [vendorOrgId, setVendorOrgId] = useState(assignment?.vendor_org_id ?? "");
  const [salesUserId, setSalesUserId] = useState(assignment?.sales_user_id ?? "");
  const [logisticsUserId, setLogisticsUserId] = useState(assignment?.logistics_user_id ?? "");
  const [isPending, startTransition] = useTransition();

  const salesUsers = internalUsers.filter((u) => u.role === "sales" || u.role === "admin");
  const logisticsUsers = internalUsers.filter((u) => u.role === "logistics" || u.role === "admin");

  function handleSaveAssignment() {
    if (!salesUserId) {
      alert("Please select a sales owner.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertAccountAssignment({
          buyerOrgId: org.id,
          vendorOrgId: vendorOrgId || null,
          salesUserId,
          logisticsUserId: logisticsUserId || null,
        });
        alert("Assignment saved successfully.");
      } catch {
        alert("Failed to save assignment.");
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Organization Info</h3>
        <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{org.name}</dd>
          <dt className="text-muted-foreground">Code</dt>
          <dd>{org.code ?? "-"}</dd>
          <dt className="text-muted-foreground">Country</dt>
          <dd>{country?.name ?? org.country_code ?? "-"}</dd>
          <dt className="text-muted-foreground">Currency</dt>
          <dd>{org.currency_code ?? "-"}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <span
              className={
                org.status === "active"
                  ? "inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                  : "inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
              }
            >
              {org.status}
            </span>
          </dd>
        </dl>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold">Account Assignment</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Vendor</p>
            <Select
              value={vendorOrgId || "none"}
              onValueChange={(v) => setVendorOrgId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Direct (No Vendor)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Direct (No Vendor)</SelectItem>
                {vendorOrgs.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Sales Owner</p>
            <Select value={salesUserId} onValueChange={setSalesUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sales owner" />
              </SelectTrigger>
              <SelectContent>
                {salesUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Logistics Owner</p>
            <Select
              value={logisticsUserId || "none"}
              onValueChange={(v) => setLogisticsUserId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not Assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not Assigned</SelectItem>
                {logisticsUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveAssignment} disabled={isPending}>
            {isPending ? "Saving..." : "Save Assignment"}
          </Button>
        </div>
      </div>

      {ship_to_orgs.length > 0 && (
        <div className="space-y-4 rounded-xl border bg-card p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Ship-to Addresses ({ship_to_orgs.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Code</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ship_to_orgs.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{s.code ?? "-"}</td>
                    <td className="py-2">
                      <span
                        className={
                          s.status === "active"
                            ? "text-green-600"
                            : "text-red-500"
                        }
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
