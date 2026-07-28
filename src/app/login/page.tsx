"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("ঢাকা");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        await api.post("/api/auth/register", { name, email, password, city });
        // Auto-login after register
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          toast.error("রেজিস্টার সফল কিন্তু লগইন করতে সমস্যা");
        } else {
          toast.success("স্বাগতম! আপনার অ্যাকাউন্ট তৈরি হয়েছে");
          router.push("/");
        }
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          toast.error("ভুল ইমেইল বা পাসওয়ার্ড");
        } else {
          toast.success("লগইন সফল");
          router.push("/");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "সমস্যা হয়েছে";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#0d9488] text-2xl font-bold text-primary-foreground shadow-lg">
            অ
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">অভ্যাস</h1>
            <p className="text-xs text-muted-foreground">
              স্বশাসন ও অভ্যাস ট্র্যাকিং অ্যাপ
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-2xl bg-muted/50 p-1">
          <button
            onClick={() => setMode("login")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-medium transition",
              mode === "login"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            লগইন
          </button>
          <button
            onClick={() => setMode("register")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-medium transition",
              mode === "register"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            নিবন্ধন
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">নাম</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার নাম"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">ইমেইল</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          {mode === "register" && (
            <div className="space-y-1.5">
              <Label htmlFor="city">শহর</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ঢাকা"
              />
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading
              ? "অপেক্ষা করুন..."
              : mode === "login"
              ? "লগইন করুন"
              : "অ্যাকাউন্ট তৈরি করুন"}
          </Button>
        </form>

        {/* Guest access */}
        <div className="text-center">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            অতিথি হিসেবে চালিয়ে যান →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { cn } from "@/lib/utils";
