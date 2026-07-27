"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/app/app-shell";
import { api } from "@/lib/api-client";

export default function Home() {
  // On first ever visit, seed sample data so the app feels alive.
  // Idempotent: the /api/seed endpoint no-ops if habits already exist.
  useEffect(() => {
    api.post("/api/seed").catch(() => {});
  }, []);

  return <AppShell />;
}
