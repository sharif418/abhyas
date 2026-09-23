"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { fireConfetti } from "@/lib/confetti";
import { toBn } from "@/lib/date-bn";
import type {
  CreateTrackInput,
  LearningResponse,
  ReviewGrade,
  ReviewResponse,
  TrackDetailResponse,
  TrackPatchAction,
  TrackPatchResponse,
} from "@/types/learning";

/** Fetch all learning tracks + summary. */
export function useLearning() {
  return useQuery<LearningResponse>({
    queryKey: ["learning"],
    queryFn: () => api.get<LearningResponse>("/api/learning"),
  });
}

/** Fetch one track's full detail. */
export function useTrackDetail(id: string | null) {
  return useQuery<TrackDetailResponse>({
    queryKey: ["learning", id],
    queryFn: () => api.get<TrackDetailResponse>(`/api/learning/${id}`),
    enabled: !!id,
  });
}

export function useCreateTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrackInput) =>
      api.post<{ trackId: string }>("/api/learning", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast.success("নতুন ট্র্যাক তৈরি হয়েছে", {
        description: "প্রতিদিন অল্প অল্প করে — ইনশাআল্লাহ শেষ হবে।",
      });
    },
    onError: () => toast.error("ট্র্যাক তৈরি করা যায়নি"),
  });
}

function announcePatch(res: TrackPatchResponse) {
  if (res.trackCompleted) {
    void fireConfetti();
    toast.success("🎉 পুরো ট্র্যাক শেষ!", {
      description: `মাশাআল্লাহ! +${toBn(res.xpAwarded)} XP অর্জন করেছেন।`,
      duration: 6000,
    });
  }
  if (res.leveledUp) {
    toast.success(`লেভেল ${toBn(res.level)} আনলক!`, { duration: 5000 });
  }
}

export function usePatchTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...action }: TrackPatchAction & { id: string }) =>
      api.patch<TrackPatchResponse>(`/api/learning/${id}`, action),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      qc.invalidateQueries({ queryKey: ["learning", vars.id] });
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      announcePatch(res);
    },
    onError: () => toast.error("পরিবর্তন করা যায়নি, আবার চেষ্টা করুন"),
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/learning/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      toast.success("ট্র্যাক মুছে ফেলা হয়েছে", {
        description: "যুক্ত অভ্যাস ও লক্ষ্য অক্ষত আছে।",
      });
    },
    onError: () => toast.error("ট্র্যাক মুছে ফেলা যায়নি"),
  });
}

/** Grade a flashcard review (SM-2). */
export function useReviewCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, grade }: { cardId: string; grade: ReviewGrade }) =>
      api.post<ReviewResponse>("/api/learning/review", { cardId, grade }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["learning"] });
      if (res.leveledUp) {
        toast.success(`লেভেল ${toBn(res.level)} আনলক!`, { duration: 5000 });
      }
    },
    // Per-card grading failures are quiet — the session keeps flowing.
    onError: () => undefined,
  });
}
