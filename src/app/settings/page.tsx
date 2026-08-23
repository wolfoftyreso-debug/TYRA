import Link from "next/link";
import { OpsShell } from "@/components/ops-shell";

export default function SettingsPage() {
  return (
    <OpsShell title="Inställningar">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6">
          <p className="eyebrow">Organisation</p>
          <h2 className="mt-3 text-xl font-semibold">Werkstad Tyresö</h2>
          <p className="mt-2 text-sm leading-6 text-[#9299a4]">
            Roller sparas som owner/admin/personal. Behörighetskontroll per roll
            är dokumenterad men inte aktiverad i v1.
          </p>
        </section>
        <section className="rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6">
          <p className="eyebrow">Kundlänkar</p>
          <h2 className="mt-3 text-xl font-semibold">Demo och granskning</h2>
          <div className="mt-4 space-y-2 text-sm">
            <Link className="block text-[#d8ff57] underline" href="/portal/demo-anna-portal">
              Öppna kundportal
            </Link>
            <Link className="block text-[#d8ff57] underline" href="/offer/demo-xc60-offert">
              Öppna offert
            </Link>
          </div>
        </section>
        <section className="rounded-2xl border border-[#ff7657]/20 bg-[#ff7657]/5 p-6 md:col-span-2">
          <p className="eyebrow">Integrationer</p>
          <p className="mt-3 text-sm text-[#c4c8cf]">
            PARTIAL: e-post, SMS, EPREL-hämtning och ekonomi/order är inte
            kopplade. TYRA skapar inga externa ordrar och skickar inga
            meddelanden i denna version.
          </p>
        </section>
      </div>
    </OpsShell>
  );
}
