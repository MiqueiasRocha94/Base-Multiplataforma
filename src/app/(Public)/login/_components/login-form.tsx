"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { loginSchema } from "@/app/(Public)/login/_lib/login.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { useDevice } from "@/contexts/DeviceContext";

type LoginFormLabels = {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  submit: string;
  helper: string;
  error: string;
  biometricOptIn: string;
  quickAccessTitle: string;
  quickAccessAnalyst: string;
  quickAccessManager: string;
};

type LoginFormProps = {
  labels: LoginFormLabels;
  targetPath?: string;
};

export function LoginForm({ labels, targetPath = "/portal/home" }: LoginFormProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const { developerModeEnabled, settings } = useDeveloperMode();
  const { isNative } = useDevice();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const result = loginSchema.safeParse({
          email: formData.get("email"),
          password: formData.get("password"),
        });

        if (!result.success) {
          setError(result.error.issues[0]?.message ?? labels.error);
          return;
        }

        startTransition(async () => {
          try {
            await signIn(result.data.email, formData.get("biometricOptIn") === "on");
            router.push(targetPath);
          } catch {
            setError(labels.error);
          }
        });
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Label>
            <span className="font-medium">{labels.email}</span>
            <Input type="email" name="email" placeholder="name@company.com" autoComplete="email" required />
          </Label>

          <Label>
            <span className="font-medium">{labels.password}</span>
            <Input type="password" name="password" placeholder="******" autoComplete="current-password" required />
          </Label>

          <p className="text-sm text-text-muted">{labels.helper}</p>
          {isNative ? (
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-[color:var(--color-surface-strong)] px-4 py-3 text-sm">
              <input type="checkbox" name="biometricOptIn" className="size-4 accent-[var(--color-primary)]" />
              <span>{labels.biometricOptIn}</span>
            </label>
          ) : null}

          {developerModeEnabled && settings.quickAccessEnabled ? (
            <div className="grid gap-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-[color:var(--color-surface-strong)] p-4">
              <p className="text-sm font-semibold">{labels.quickAccessTitle}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await signIn("analista@demo.local", false);
                    router.push(targetPath);
                  }}
                >
                  {labels.quickAccessAnalyst}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await signIn("gestor@demo.local", isNative);
                    router.push(targetPath);
                  }}
                >
                  {labels.quickAccessManager}
                </Button>
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-error">{error}</p> : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "..." : labels.submit}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
