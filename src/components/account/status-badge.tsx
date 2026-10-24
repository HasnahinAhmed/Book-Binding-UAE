import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type OrderStatus = "submitted" | "confirmed" | "in_production" | "ready" | "out_for_delivery" | "completed" | "cancelled";

const tone: Record<OrderStatus, "neutral" | "brand" | "warning" | "success"> = {
  submitted: "warning",
  confirmed: "brand",
  in_production: "brand",
  ready: "success",
  out_for_delivery: "brand",
  completed: "success",
  cancelled: "neutral",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("orderStatus");
  return <Badge tone={tone[status]}>{t(status)}</Badge>;
}
