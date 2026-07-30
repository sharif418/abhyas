"use client";

import { AppShell } from "@/components/app/app-shell";

export default function Home() {
  // NOTE: Do NOT auto-seed sample data on first visit.
  //
  // The OnboardingModal already prompts the user to pick starter habits,
  // and the home empty state offers a "নমুনা ডেটা যোগ করুন" button if they
  // want demo data. Auto-seeding here previously caused two critical bugs:
  //
  //   1. A brand-new user landed on a dashboard that already showed
  //      10 fake habits with 21 days of fabricated completion history,
  //      inflated streaks, pre-earned badges, and an AI Coach that
  //      congratulated them on streaks they had never built.
  //
  //   2. When the user finished onboarding and their selected starter
  //      habits were created, those habits were ADDED on top of the
  //      auto-seeded ones — producing duplicate habits (e.g. two
  //      "ফজরের নামাজ", two "কুরআন তিলাওয়াত", two "সকালের ব্যায়াম")
  //      that the user cannot tell apart in the list.
  //
  // Removing the auto-seed restores a true first-time experience:
  // onboarding → empty state → user-built data only.
  return <AppShell />;
}
