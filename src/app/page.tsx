import { Construction } from "lucide-react";

export default async function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:48px_48px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background via-background/90 to-background"
      />

      <div className="flex flex-col items-center text-center gap-8 px-4 max-w-lg">
        {/* Logo / brand */}
        <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
          <span className="text-primary">HB</span>
          <span className="text-foreground">HeyBackend</span>
        </div>

        {/* Icon */}
        <div className="rounded-full border bg-muted p-5">
          <Construction className="h-10 w-10 text-primary" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Something great is <span className="text-primary">coming soon.</span>
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed">
          We&apos;re putting the finishing touches on HeyBackend — the easiest way to capture subscribers from
          any static website. Stay tuned.
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-muted-foreground/50">
        &copy; {new Date().getFullYear()} HeyBackend. All rights reserved.
      </footer>
    </div>
  );
}
