"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RegisterPage() {
  const { dictionary } = useLanguage();

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{dictionary.register.title}</CardTitle>
          <CardDescription>{dictionary.register.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-text-muted">{dictionary.register.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login">
              <Button>{dictionary.nav.login}</Button>
            </Link>
            <Link href="/home">
              <Button variant="outline">{dictionary.nav.home}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
