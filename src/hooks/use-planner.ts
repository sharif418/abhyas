"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { fireConfetti } from "@/lib/confetti";
import { toBn } from "@/lib/date-bn";
import { todayKey } from "@/lib/date-bn";
import type { PlannerResponse, PlannerToggleResponse } from "@/types/planner";

/** Fetch one day's plan (+ week strip + summary). Date defaults to today. */
export function usePlanner(date?: string) {
  const key = date ?? todayKey();
  return useQuery<PlannerResponse>({
    queryKey: ["planner", key],
    queryFn: () =>
      api.get<PlannerResponse>(`/api/planner?date=${encodeURIComponent(key)}`),
    staleTime: 15_000,
  });
}

export interface PlannerTaskInput {
  date?: string;
  title: string;
  isMit?: boolean;
}

export function useCreatePlannerTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlannerTaskInput) =>
      api.post<{ task: PlannerResponse["tasks"][number] }>("/api/planner", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
    onError: (err: Error) => toast.error(err.message || "কাজ যোগ করা যায়নি"),
  });
}

/** Toggle done — celebration when the last MIT completes. */
export function useTogglePlannerTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.patch<PlannerToggleResponse>(`/api/planner/${id}`, { done }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["planner"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      if (res.xpAwarded > 0) {
        if (res.allMitsDone) {
          void fireConfetti();
          toast.success("দিনের প্রধান কাজগুলো শেষ!", {
            description: `আলহামদুলিল্লাহ — +${toBn(res.xpAwarded)} XP`,
            duration: 5000,
          });
        }
        if (res.leveledUp) {
          toast.success(`লেভেল ${toBn(res.level)} আনলক!`, { duration: 5000 });
        }
      }
    },
    onError: () => toast.error("হালনাগাদ করা যায়নি"),
  });
}

/** Rename or promote/demote a task. */
export function useUpdatePlannerTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      title?: string;
      isMit?: boolean;
    }) => api.patch<PlannerToggleResponse>(`/api/planner/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
    onError: (err: Error) => toast.error(err.message || "হালনাগাদ করা যায়নি"),
  });
}

export function useDeletePlannerTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ ok: true }>(`/api/planner/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner"] });
    },
    onError: () => toast.error("মুছে ফেলা যায়নি"),
  });
}
