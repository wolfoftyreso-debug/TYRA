import { statusLabels, type WheelSetStatus } from "@/lib/domain/status";

const colors: Record<WheelSetStatus, string> = {
  REGISTERED: "bg-slate-700 text-slate-100",
  CHECKING_IN: "bg-amber-400/15 text-amber-200",
  STORED: "bg-emerald-400/15 text-emerald-200",
  PICK_REQUESTED: "bg-orange-400/15 text-orange-200",
  PICKED: "bg-cyan-400/15 text-cyan-200",
  IN_WORKSHOP: "bg-blue-400/15 text-blue-200",
  MOUNTED: "bg-[#d8ff57]/15 text-[#d8ff57]",
  RETURN_PENDING: "bg-rose-400/15 text-rose-200",
  CHECKED_OUT: "bg-slate-400/15 text-slate-200",
  ARCHIVED: "bg-slate-700 text-slate-400",
};

export function StatusBadge({ status }: { status: WheelSetStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
