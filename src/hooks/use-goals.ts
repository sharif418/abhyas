"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { fireConfetti } from "@/lib/confetti";
import { toBn } from "@/lib/date-bn";
import type { Goal, GoalProgressResponse, GoalsResponse } from "@/types/goals";

/** Fetch all goals + summary. */
export function useGoals() {
  return useQuery<GoalsResponse>({
    queryKey: ["goals"],
    queryFn: () => api.get<GoalsResponse>("/api/goals"),
  });
}

export interface GoalInput {
  title: string;
  category: string;
  icon: string;
  color: string;
  unit: string;
  targetValue: number;
  deadline?: string | null;
  milestones: { title: string; value: number; done?: boolean }[];
  note?: string | null;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GoalInput) => api.post<{ goal: Goal }>("/api/goals", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("নতুন লক্ষ্য যোগ হয়েছে", { description: "মাইলফলক ধরে এগোন — পারবেন!" });
    },
    onError: () => toast.error("লক্ষ্য যোগ করা যায়নি, আবার চেষ্টা করুন"),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: GoalInput & { id: string }) =>
      api.patch<{ goal: Goal }>(`/api/goals/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("লক্ষ্য হালনাগাদ হয়েছে");
    },
    onError: () => toast.error("লক্ষ্য হালনাগাদ করা যায়নি"),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("লক্ষ্য মুছে ফেলা হয়েছে");
    },
    onError: () => toast.error("লক্ষ্য মুছে ফেলা যায়নি"),
  });
}

/** Log progress (±delta) — celebration on milestones & completion. */
export function useLogGoalProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      api.post<GoalProgressResponse>(`/api/goals/${id}/progress`, { delta }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      if (res.goalCompleted) {
        void fireConfetti();
        toast.success("🎉 লক্ষ্য পূর্ণ হয়েছে!", {
          description: `মাশাআল্লাহ! +${toBn(res.xpAwarded)} XP অর্জন করেছেন।`,
          duration: 6000,
        });
      } else if (res.newlyCompletedMilestones.length > 0) {
        toast.success(`মাইলফলক পূর্ণ: ${res.newlyCompletedMilestones.join(", ")}`, {
          description: `+${toBn(res.xpAwarded)} XP`,
          duration: 5000,
        });
      }
      if (res.leveledUp) {
        toast.success(`লেভেল ${toBn(res.level)} আনলক!`, { duration: 5000 });
      }
    },
    onError: () => toast.error("অগ্রগতি যোগ করা যায়নি"),
  });
}
