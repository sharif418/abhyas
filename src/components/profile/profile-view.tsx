"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { ProfileHeaderCard } from "./profile-header";
import { ProfileAppearanceSection } from "./profile-appearance";
import { ProfilePreferencesSection } from "./profile-preferences";
import { ProfileNotificationsSection } from "./profile-notifications";
import { ProfileIbadahSection } from "./profile-ibadah";
import { ProfileDataSection } from "./profile-data";
import {
  ProfileAboutSection,
  ProfileAccountSection,
  ProfileArchiveSection,
} from "./profile-account";
import type { MeResponse } from "./profile-shared";

/**
 * প্রোফাইল — thin composition of the focused section components.
 *
 * (Split from the old 914-line monolith; each section file now owns its own
 * queries, mutations and settings wiring. This file only owns the shared
 * `me` query and the section order.)
 */
export function ProfileView() {
  const { data: me, isLoading } = useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/api/me"),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-xl font-bold">প্রোফাইল</h1>
        <p className="text-xs text-muted-foreground">অ্যাকাউন্ট ও সেটিংস</p>
      </div>

      <ProfileHeaderCard me={me} isLoading={isLoading} />
      <ProfileAppearanceSection />
      <ProfilePreferencesSection />
      <ProfileNotificationsSection />
      <ProfileIbadahSection />
      <ProfileDataSection />
      <ProfileAboutSection />
      <ProfileArchiveSection />
      <ProfileAccountSection />

      <div className="pb-4 text-center text-[10px] text-muted-foreground">
        ধৈর্য ও ধারাবাহিকতার সাথে তৈরি
      </div>
    </div>
  );
}
