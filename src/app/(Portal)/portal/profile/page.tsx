"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ProfileActionsSection,
  ProfileDetailsCard,
  ProfileHeader,
} from "@/components/profile-page-sections";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";

function resolveAccessLabel(isNative: boolean, biometricEnabled: boolean, dictionary: ReturnType<typeof useLanguage>["dictionary"]) {
  if (!isNative) {
    return dictionary.profile.accessWeb;
  }

  return biometricEnabled ? dictionary.profile.accessBiometricEnabled : dictionary.profile.accessBiometricDisabled;
}

export default function ProfilePage() {
  const router = useRouter();
  const { dictionary, locale } = useLanguage();
  const { theme, setTheme, fontPreset, setFontPreset } = useTheme();
  const { biometricEnabled, session, signOut } = useAuth();
  const { isNative, shellMode } = useDevice();
  const [expanded, setExpanded] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);

  const profileName = session?.username ?? dictionary.profile.guestName;
  const accessLabel = resolveAccessLabel(isNative, biometricEnabled, dictionary);

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-6 py-8">
      <ProfileHeader
        name={profileName}
        email={session?.email ?? dictionary.profile.guestEmail}
        subtitle={dictionary.profile.subtitle}
      />

      <ProfileDetailsCard
        dictionary={dictionary}
        email={session?.email ?? dictionary.profile.guestEmail}
        expanded={expanded}
        fontPreset={fontPreset}
        locale={locale}
        loggedAt={session?.loggedAt ?? null}
        name={profileName}
        onToggleExpanded={() => setExpanded((current) => !current)}
        theme={theme}
        accessLabel={accessLabel}
      />

      <ProfileActionsSection
        configExpanded={configExpanded}
        dictionary={dictionary}
        fontPreset={fontPreset}
        mobileShell={shellMode === "mobile"}
        onLogout={() => {
          signOut();
          router.replace("/home");
        }}
        onSetFontPreset={setFontPreset}
        onSetTheme={setTheme}
        onToggleExpanded={() => setConfigExpanded((current) => !current)}
        sessionActive={Boolean(session)}
        theme={theme}
      />
    </section>
  );
}
