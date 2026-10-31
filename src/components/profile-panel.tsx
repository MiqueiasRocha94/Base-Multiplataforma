"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, KeyRound, LogOut, Settings, User } from "lucide-react";

import { DRAWER_ROW_CLASS, DRAWER_ROW_INACTIVE } from "@/components/navigation/drawer-navigation";
import {
  ProfileAccountActionsSection,
  ProfileActionsSection,
  ProfileConfigFields,
  ProfileDetailsCard,
  ProfileDetailsList,
  ProfileHeader,
} from "@/components/profile-page-sections";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage, useLazyNamespace } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { useBiometricSetting } from "@/hooks/use-biometric-setting";
import { cn } from "@/lib/utils";

const RESET_PASSWORD_HREF = "/portal/redefinir-senha";

function resolveAccessLabel(isNative: boolean, biometricEnabled: boolean, dictionary: ReturnType<typeof useLanguage>["dictionary"]) {
  if (!isNative) {
    return dictionary.profile.accessWeb;
  }

  return biometricEnabled ? dictionary.profile.accessBiometricEnabled : dictionary.profile.accessBiometricDisabled;
}

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Dados comuns da conta (página e gaveta).
function useProfileData() {
  useLazyNamespace("profile");
  const { dictionary } = useLanguage();
  const { biometricEnabled, session, leaveSession } = useAuth();
  const { isNative } = useDevice();
  // Biometria disponível e desligada: o menu sinaliza (linha de acesso e Configurações).
  const biometricPending = useBiometricSetting().pending;

  return {
    dictionary,
    session,
    leaveSession,
    profileName: session?.username ?? dictionary.profile.guestName,
    email: session?.email ?? dictionary.profile.guestEmail,
    accessLabel: resolveAccessLabel(isNative, biometricEnabled, dictionary),
    biometricPending,
  };
}

/**
 * Tela /portal/profile: avatar em card, seções em card e ações da conta.
 * Carrega o namespace lazy `profile` por conta própria.
 */
export function ProfilePanel({ className }: { className?: string }) {
  const router = useRouter();
  const { fontPreset, setFontPreset } = useTheme();
  const { dictionary, session, leaveSession, profileName, email, accessLabel } = useProfileData();
  // Todas as áreas nascem colapsadas (o usuário abre o que quiser).
  const [expanded, setExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  return (
    <section className={cn("grid gap-3", className)}>
      <ProfileHeader name={profileName} email={email} />

      <ProfileDetailsCard
        dictionary={dictionary}
        email={email}
        expanded={expanded}
        loggedAt={session?.loggedAt ?? null}
        name={profileName}
        onToggleExpanded={() => setExpanded((current) => !current)}
        accessLabel={accessLabel}
      />

      <ProfileActionsSection
        configExpanded={configExpanded}
        dictionary={dictionary}
        fontPreset={fontPreset}
        onSetFontPreset={setFontPreset}
        onToggleExpanded={() => setConfigExpanded((current) => !current)}
      />

      <ProfileAccountActionsSection
        dictionary={dictionary}
        onResetPassword={() => router.push(RESET_PASSWORD_HREF)}
        onLogout={() => {
          // Com biometria ligada, volta ao login mantendo a sessão (AuthContext.leaveSession).
          void leaveSession().then(() => router.replace("/login"));
        }}
        sessionActive={Boolean(session)}
      />
    </section>
  );
}

// ─── Gaveta do Menu (barra mobile) ──────────────────────────────────────────
// Mesma linguagem das linhas de navegação: 48px, ícone à esquerda, seta à
// direita, linha inteira tocável. O conteúdo expandido reaproveita os campos da
// tela de perfil com os tokens da PÁGINA remapeados para a identidade da sidebar
// esquerda — `[data-region="drawer"]` em globals.css.

/** Rótulo de grupo da gaveta ("CONTA", "NAVEGAÇÃO"). */
export function DrawerSectionLabel({ children }: { children: ReactNode }) {
  return <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">{children}</p>;
}

function DrawerRow({
  icon,
  label,
  trailing,
  onClick,
  expanded,
  className,
}: {
  icon: ReactNode;
  label: string;
  trailing: ReactNode;
  onClick: () => void;
  expanded?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(DRAWER_ROW_CLASS, "w-full text-left", className ?? DRAWER_ROW_INACTIVE)}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center [&>svg]:size-5">
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <ChevronDown aria-hidden="true" className={cn("ml-auto size-4 shrink-0 transition-transform", open && "rotate-180")} />;
}

/**
 * Topo da gaveta do Menu: avatar (sem card) + grupo CONTA em linhas
 * (Dados do perfil ⌄, Configurações ⌄, Redefinir senha ›, Sair). A navegação
 * vem logo abaixo, na ordem do desktop — por isso "Sair" fecha o grupo CONTA.
 * `onNavigate`: chamado antes de trocar de rota (fecha a gaveta).
 */
export function ProfileDrawerSection({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { fontPreset, setFontPreset } = useTheme();
  const { dictionary, session, profileName, email, accessLabel, biometricPending } = useProfileData();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <section data-region="drawer" className="grid">
      {/* Avatar sem card; respiro no topo além da safe-area (já no container). */}
      <div className="grid justify-items-center gap-2 px-4 pb-2 pt-6 text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
          {getInitials(profileName)}
        </div>
        <div className="grid gap-1">
          <p className="text-lg font-semibold text-text">{profileName}</p>
          <p className="text-sm text-text-muted">{email}</p>
          <p className={cn("inline-flex items-center justify-center gap-1.5 text-xs", biometricPending ? "text-warning" : "text-text-muted")}>
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", biometricPending ? "bg-warning" : "bg-primary")} />
            {accessLabel}
          </p>
        </div>
      </div>

      <DrawerSectionLabel>{dictionary.nav.sectionAccount}</DrawerSectionLabel>
      <div className="grid gap-1">
        <DrawerRow
          icon={<User />}
          label={dictionary.profile.accountTitle}
          onClick={() => setDetailsOpen((current) => !current)}
          expanded={detailsOpen}
          trailing={<Chevron open={detailsOpen} />}
        />
        {detailsOpen ? (
          <div className="mx-4 mb-2 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
            <ProfileDetailsList dictionary={dictionary} email={email} loggedAt={session?.loggedAt ?? null} name={profileName} />
          </div>
        ) : null}

        <DrawerRow
          icon={<Settings />}
          label={dictionary.profile.configTitle}
          onClick={() => setConfigOpen((current) => !current)}
          expanded={configOpen}
          trailing={
            <>
              {biometricPending ? (
                <span role="img" aria-label={dictionary.profile.accessBiometricDisabled} className="size-2 shrink-0 rounded-full bg-warning" />
              ) : null}
              <Chevron open={configOpen} />
            </>
          }
        />
        {configOpen ? (
          <div className="mx-4 mb-2 grid gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
            <ProfileConfigFields dictionary={dictionary} fontPreset={fontPreset} onSetFontPreset={setFontPreset} />
          </div>
        ) : null}

        {session ? (
          <DrawerRow
            icon={<KeyRound />}
            label={dictionary.profile.resetPassword}
            onClick={() => {
              onNavigate();
              router.push(RESET_PASSWORD_HREF);
            }}
            trailing={<ChevronRight aria-hidden="true" className="ml-auto size-4 shrink-0" />}
          />
        ) : null}

        <ProfileSignOutRow onNavigate={onNavigate} />
      </div>
    </section>
  );
}

/** Última linha do grupo CONTA: "Sair" em texto vermelho, sem fundo cheio. */
function ProfileSignOutRow({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { session, leaveSession } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <DrawerRow
      icon={<LogOut />}
      label={dictionary.account.menuSignOut}
      onClick={() => {
        onNavigate();
        // Com biometria ligada, volta ao login mantendo a sessão (AuthContext.leaveSession).
        void leaveSession().then(() => router.replace("/login"));
      }}
      trailing={null}
      className="text-error hover:bg-[color:color-mix(in_srgb,var(--color-error)_12%,transparent)]"
    />
  );
}
