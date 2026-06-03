"use client";

import { LoginEntry } from "@/app/(Public)/login/_components/login-entry";

export default function LoginPage() {
  return (
    <section className="mx-auto grid max-w-xl gap-6 py-8">
      <LoginEntry />
    </section>
  );
}
