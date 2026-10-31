"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Placeholder honesto de tela de módulo ainda não construída. A rota + o RBAC
 * já existem; a tela chega depois.
 */
export function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 p-4 lg:py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-2xl border border-dashed border-border bg-[color:var(--color-surface-strong)] p-6 text-center text-sm text-text-muted">
            Em desenvolvimento — a rota e as permissões já estão prontas; a tela chega em breve.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
