"use client";

import * as React from "react";

import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader } from "./card";

type MobilePriority = "primary" | "secondary" | "meta";

type ClassNameResolver<T> = string | ((item: T, index: number) => string | undefined);

export type GenericTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  mobileLabel?: React.ReactNode;
  mobilePriority?: MobilePriority;
  hideOnMobile?: boolean;
};

export type GenericTableProps<T> = {
  columns: GenericTableColumn<T>[];
  data: T[];
  getRowKey: (item: T, index: number) => React.Key;
  caption?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  rowClassName?: ClassNameResolver<T>;
  cardClassName?: ClassNameResolver<T>;
};

function resolveClassName<T>(value: ClassNameResolver<T> | undefined, item: T, index: number) {
  if (typeof value === "function") {
    return value(item, index);
  }

  return value;
}

function groupMobileColumns<T>(columns: GenericTableColumn<T>[]) {
  const visibleColumns = columns.filter((column) => !column.hideOnMobile);
  const primaryColumns = visibleColumns.filter((column) => column.mobilePriority === "primary");
  const fallbackPrimary = primaryColumns.length > 0 ? primaryColumns : visibleColumns.slice(0, 1);
  const secondaryColumns = visibleColumns.filter(
    (column) => !fallbackPrimary.includes(column) && column.mobilePriority !== "meta",
  );
  const metaColumns = visibleColumns.filter((column) => column.mobilePriority === "meta");

  return {
    fallbackPrimary,
    metaColumns,
    secondaryColumns,
    visibleColumns,
  };
}

export function GenericTable<T>({
  columns,
  data,
  getRowKey,
  caption,
  emptyMessage = "Nenhum registro encontrado.",
  className,
  tableClassName,
  rowClassName,
  cardClassName,
}: GenericTableProps<T>) {
  const { shellMode } = useDevice();
  const mobileView = shellMode === "mobile";

  if (data.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-6 text-sm text-text-muted">{emptyMessage}</CardContent>
      </Card>
    );
  }

  if (mobileView) {
    const { fallbackPrimary, metaColumns, secondaryColumns, visibleColumns } = groupMobileColumns(columns);

    return (
      <div className={cn("grid gap-4", className)}>
        {data.map((item, index) => {
          const key = getRowKey(item, index);
          const resolvedCardClassName = resolveClassName(cardClassName, item, index);

          return (
            <Card key={key} className={cn("overflow-hidden", resolvedCardClassName)}>
              <CardHeader className="gap-3 border-b border-border/60 p-5">
                {fallbackPrimary.map((column) => (
                  <div key={column.key} className="min-w-0">
                    {column.mobileLabel ? (
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">{column.mobileLabel}</p>
                    ) : null}
                    <div className={cn("text-base font-semibold text-text", column.className)}>{column.render(item, index)}</div>
                  </div>
                ))}
              </CardHeader>

              {(secondaryColumns.length > 0 || metaColumns.length > 0) && (
                <CardContent className="grid gap-4 p-5">
                  {secondaryColumns.length > 0 ? (
                    <div className="grid gap-3">
                      {secondaryColumns.map((column) => (
                        <div key={column.key} className="grid gap-1">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                            {column.mobileLabel ?? column.header}
                          </p>
                          <div className={cn("text-sm text-text", column.className)}>{column.render(item, index)}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {metaColumns.length > 0 ? (
                    <div
                      className={cn(
                        "grid gap-3 border-t border-border/60 pt-4 text-xs text-text-muted",
                        metaColumns.length > 1 && "sm:grid-cols-2",
                      )}
                    >
                      {metaColumns.map((column) => (
                        <div key={column.key} className="grid gap-1">
                          <p className="font-medium uppercase tracking-[0.18em]">{column.mobileLabel ?? column.header}</p>
                          <div className={cn("text-sm text-text-muted", column.className)}>{column.render(item, index)}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              )}

              {visibleColumns.length === 0 ? <CardContent className="p-5 text-sm text-text-muted">{emptyMessage}</CardContent> : null}
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)]", className)}>
      <div className="overflow-x-auto">
        <table className={cn("min-w-full border-collapse", tableClassName)}>
          {caption ? <caption className="px-6 py-4 text-left text-sm text-text-muted">{caption}</caption> : null}
          <thead className="bg-[color:var(--color-surface-strong)]/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-text-muted",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const key = getRowKey(item, index);
              const resolvedRowClassName = resolveClassName(rowClassName, item, index);

              return (
                <tr key={key} className={cn("border-t border-border/60 align-top", resolvedRowClassName)}>
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-6 py-4 text-sm text-text", column.className)}>
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
