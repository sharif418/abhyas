import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
        ৪০৪
      </div>
      <div>
        <h1 className="text-xl font-bold">পেজ পাওয়া যায়নি</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          আপনি যে পেজ খুঁজছেন সেটি এখানে নেই।
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:scale-105 active:scale-95"
      >
        হোমে ফিরুন
      </Link>
    </div>
  );
}
