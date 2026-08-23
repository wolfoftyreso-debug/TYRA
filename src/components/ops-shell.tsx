import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Home,
  PackageSearch,
  Settings,
  Tags,
  Users,
  Warehouse,
} from "lucide-react";

const links = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/check-in", label: "Checka in", icon: ClipboardCheck },
  { href: "/pick", label: "Plock", icon: PackageSearch },
  { href: "/inventory", label: "Lager", icon: Warehouse },
  { href: "/customers", label: "Kunder", icon: Users },
  { href: "/quotes", label: "Offerter", icon: Tags },
  { href: "/bookings", label: "Bokningar", icon: CalendarDays },
  { href: "/settings", label: "Inställningar", icon: Settings },
];

export function OpsShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0c0e] text-[#f4f5f6] lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-[#2a2e35] bg-[#101215] p-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-lg">
          <span className="grid size-9 place-items-center bg-[#d8ff57] text-sm font-black text-[#0b0c0e]">
            T
          </span>
          <span>
            <strong className="block text-sm tracking-[0.18em]">TYRA</strong>
            <span className="text-xs text-[#9299a4]">Werkstad Tyresö</span>
          </span>
        </Link>
        <nav className="mt-5 flex gap-1 overflow-x-auto pb-1 lg:mt-10 lg:block lg:space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#b8bdc5] transition hover:bg-[#1b1e23] hover:text-white"
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">
        <header className="flex min-h-20 items-center justify-between border-b border-[#2a2e35] px-5 md:px-8">
          <div>
            <p className="eyebrow">Däckhotell</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          {action}
        </header>
        <div className="mx-auto max-w-6xl p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}
