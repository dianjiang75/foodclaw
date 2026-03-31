import { Clock } from "lucide-react";

interface WaitBadgeProps {
  minutes: number | null;
}

export function WaitBadge({ minutes }: WaitBadgeProps) {
  if (minutes == null) return null;

  const style = minutes <= 5
    ? "bg-ns-green-light text-ns-green"
    : minutes <= 20
    ? "bg-ns-amber-light text-ns-amber"
    : "bg-ns-red-light text-ns-red";

  const label = minutes <= 5 ? "No wait" : `~${minutes} min`;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${style}`}>
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
}
