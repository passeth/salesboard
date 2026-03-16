"use client";

import { updateProfile, type ProfileActionState } from "@/app/(dashboard)/profile/_actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionState, useState } from "react";

type ProfileFormProps = {
  name: string;
  phone: string | null;
  locale: string | null;
  email: string;
  role: string;
  organizationName: string;
};

const initialState: ProfileActionState = {
  success: false,
  message: "",
};

export function ProfileForm({ name, phone, locale, email, role, organizationName }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [selectedLocale, setSelectedLocale] = useState(locale ?? "en");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg bg-muted/40 p-4 text-sm md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium capitalize text-foreground">{role}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Organization</p>
            <p className="font-medium text-foreground">{organizationName}</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={phone ?? ""} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="locale">Locale</Label>
              <input type="hidden" name="locale" value={selectedLocale} />
              <Select value={selectedLocale} onValueChange={setSelectedLocale}>
                <SelectTrigger id="locale" className="w-full">
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ko">Korean (ko)</SelectItem>
                  <SelectItem value="ja">Japanese (ja)</SelectItem>
                  <SelectItem value="zh">Chinese (zh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {state.message ? (
            <p className={state.success ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
