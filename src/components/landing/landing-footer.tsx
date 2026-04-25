import Link from "next/link";
import Logo from "@/components/logo";
import Separator from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap", href: "#" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "SDK Reference", href: "#" },
    { label: "GitHub", href: "https://github.com/vespaiach/bff" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "mailto:hello@bff.dev" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Logo />
              </span>
              Hey Backend
            </Link>
            <p className="max-w-[160px] text-xs leading-relaxed text-muted-foreground">
              The easiest way to collect leads from any static website.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {category}
              </p>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} BFF · Built with ♥ for the static web</p>
          <p>
            <a href="/legal/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </a>{" "}
            ·{" "}
            <a href="/legal/terms" className="transition-colors hover:text-foreground">
              Terms
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
