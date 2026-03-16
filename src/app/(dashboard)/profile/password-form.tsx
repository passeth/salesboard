"use client";

import { changePassword, type ProfileActionState } from "@/app/(dashboard)/profile/_actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormEvent, useActionState, useEffect, useRef, useState } from "react";

const initialState: ProfileActionState = {
  success: false,
  message: "",
};

export function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState);
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const validate = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      event.preventDefault();
      setClientMessage("New password must be at least 8 characters.");
      return;
    }

    if (typeof confirmPassword !== "string" || newPassword !== confirmPassword) {
      event.preventDefault();
      setClientMessage("New password and confirmation do not match.");
      return;
    }

    setClientMessage(null);
  };

  useEffect(() => {
    if (!state.success) {
      return;
    }

    formRef.current?.reset();
  }, [state.success]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} onSubmit={validate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>

          {clientMessage ? <p className="text-sm text-destructive">{clientMessage}</p> : null}
          {!clientMessage && state.message ? (
            <p className={state.success ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Change Password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
