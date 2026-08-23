import { CalendarDays } from "lucide-react";
import { OpsShell } from "@/components/ops-shell";

const bookings = [
  { time: "08:00", registration: "ABC123", job: "Hjulskifte", customer: "Anna Andersson" },
  { time: "10:30", registration: "DEF456", job: "Hjulskifte + kontroll", customer: "Erik Eriksson" },
  { time: "14:00", registration: "KLM789", job: "Incheckning", customer: "Maria Lind" },
];

export default function BookingsPage() {
  return (
    <OpsShell title="Dagens bokningar">
      <div className="space-y-3">
        {bookings.map((booking) => (
          <article
            key={`${booking.time}-${booking.registration}`}
            className="grid gap-3 rounded-2xl border border-[#2a2e35] bg-[#14161a] p-5 sm:grid-cols-[80px_1fr_auto] sm:items-center"
          >
            <div className="flex items-center gap-2 font-mono text-[#d8ff57]">
              <CalendarDays size={16} /> {booking.time}
            </div>
            <div>
              <h2 className="font-semibold">{booking.registration}</h2>
              <p className="mt-1 text-sm text-[#9299a4]">{booking.customer}</p>
            </div>
            <span className="text-sm text-[#b8bdc5]">{booking.job}</span>
          </article>
        ))}
      </div>
    </OpsShell>
  );
}
