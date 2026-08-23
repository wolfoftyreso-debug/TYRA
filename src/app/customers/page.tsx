import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { OpsShell } from "@/components/ops-shell";
import { customers, vehicles } from "@/lib/demo-data";

export default function CustomersPage() {
  return (
    <OpsShell title="Kunder">
      <div className="overflow-hidden rounded-2xl border border-[#2a2e35]">
        {customers.map((customer) => {
          const owned = vehicles.filter(
            (vehicle) => vehicle.customerId === customer.id,
          );
          return (
            <Link
              href={owned[0] ? `/vehicles/${owned[0].registration}` : "#"}
              key={customer.id}
              className="focus-ring flex items-center justify-between gap-5 border-t border-[#2a2e35] bg-[#14161a] p-5 first:border-0 hover:bg-[#1b1e23]"
            >
              <div>
                <h2 className="font-semibold">{customer.name}</h2>
                <p className="mt-1 text-sm text-[#9299a4]">
                  {customer.phone} · {owned.map((item) => item.registration).join(", ")}
                </p>
              </div>
              <ChevronRight size={19} className="text-[#9299a4]" />
            </Link>
          );
        })}
      </div>
    </OpsShell>
  );
}
