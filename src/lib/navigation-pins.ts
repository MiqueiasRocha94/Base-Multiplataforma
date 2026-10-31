import { MOBILE_NAV_MAX, type PinnedSlot } from "@/lib/navigation";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

/**
 * Páginas que o usuário fixou nos slots dinâmicos da barra mobile, cada uma no
 * seu slot (desafixar o 1 libera o 1; o próximo pin ocupa o menor slot livre).
 * Preferência local por usuário (mesmo padrão da biometria: chave + login), não
 * vai ao backend. Sem limite por módulo (quem trabalha num módulo só pode fixar
 * todas as páginas dele). Limite = slots dinâmicos da barra ATUAL (celular 3,
 * tablet até `MOBILE_NAV_MAX_PINS`), contando só os pins VISÍVEIS: o storage
 * guarda também os de páginas fora do menu atual (ex.: permissão retirada),
 * que voltam a valer quando o menu as tiver. A ordem da lista é a do
 * momento em que foi fixado (o mais antigo primeiro, para o FIFO).
 */
export const MOBILE_NAV_MAX_PINS = MOBILE_NAV_MAX - 2;

function pinsKey(userKey: string) {
  return `${storageKeys.mobileNavPinsByUser}:${userKey.toLowerCase()}`;
}

function isPinnedSlot(value: unknown): value is PinnedSlot {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PinnedSlot).href === "string" &&
    typeof (value as PinnedSlot).slot === "number"
  );
}

export function getMobileNavPins(userKey: string): PinnedSlot[] {
  const serialized = getStorageItem(pinsKey(userKey));
  if (!serialized) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const pins: PinnedSlot[] = [];
    parsed.forEach((entry: unknown, index) => {
      // Formato anterior (lista de hrefs): a posição na lista vira o slot.
      const pin = typeof entry === "string" ? { href: entry, slot: index + 1 } : entry;
      if (isPinnedSlot(pin) && !pins.some((saved) => saved.href === pin.href)) {
        pins.push(pin);
      }
    });
    return pins;
  } catch {
    return [];
  }
}

export function setMobileNavPins(userKey: string, pins: PinnedSlot[]) {
  setStorageItem(pinsKey(userKey), JSON.stringify(pins));
}

/**
 * Alterna o pin. Desafixar remove só aquele (o slot fica livre). Fixar ocupa o
 * menor slot livre entre os VISÍVEIS (`isVisible`); com os `limit` slots da barra
 * atual cheios, solta o visível mais antigo (FIFO) e usa o slot dele. Visíveis
 * além do limite (fixados numa barra maior) saem; pins ocultos (fora do menu
 * atual) ficam intactos.
 */
export function toggleMobileNavPin(
  current: PinnedSlot[],
  href: string,
  isVisible: (href: string) => boolean,
  limit: number = MOBILE_NAV_MAX_PINS,
): PinnedSlot[] {
  if (current.some((pin) => pin.href === href)) {
    return current.filter((pin) => pin.href !== href);
  }
  const max = Math.max(1, Math.min(limit, MOBILE_NAV_MAX_PINS));
  let next = current.filter((pin) => !(isVisible(pin.href) && pin.slot > max));
  const visible = next.filter((pin) => isVisible(pin.href));
  if (visible.length >= max) {
    const oldest = visible[0];
    next = next.filter((pin) => pin !== oldest);
  }
  const taken = new Set(next.filter((pin) => isVisible(pin.href)).map((pin) => pin.slot));
  let slot = 1;
  while (taken.has(slot)) slot += 1;
  return [...next, { href, slot }];
}
