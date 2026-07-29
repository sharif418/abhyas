/**
 * Root loading state — shown during initial route load.
 * Provides a branded skeleton so users see immediate feedback.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[#0d9488] text-2xl font-bold text-primary-foreground shadow-lg">
        অ
      </div>
      <div className="space-y-2 text-center">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-3 w-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
