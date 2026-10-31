import type { AppDictionary } from "@/lib/i18n/dictionaries";
import type { NavigationItem } from "@/lib/navigation";

export function resolveLabel(item: NavigationItem, dictionary: AppDictionary) {
  return item.label ?? (item.labelKey ? dictionary.nav[item.labelKey] : item.href);
}

export function isActiveHref(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function normalizeMenuText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function filterNavigationByQuery(
  items: NavigationItem[],
  query: string,
  dictionary: AppDictionary,
): NavigationItem[] {
  const needle = normalizeMenuText(query.trim());
  if (!needle) {
    return items;
  }

  const result: NavigationItem[] = [];
  for (const item of items) {
    const selfMatch = normalizeMenuText(resolveLabel(item, dictionary)).includes(needle);
    if (item.children?.length) {
      const children = selfMatch ? item.children : filterNavigationByQuery(item.children, query, dictionary);
      if (selfMatch || children.length) {
        result.push({ ...item, children });
      }
    } else if (selfMatch) {
      result.push(item);
    }
  }

  return result;
}

/** Nº de destinos (folhas) numa árvore de navegação — contagem de resultados da busca. */
export function countNavigationLeaves(items: NavigationItem[]): number {
  return items.reduce((total, item) => total + (item.children?.length ? countNavigationLeaves(item.children) : 1), 0);
}
