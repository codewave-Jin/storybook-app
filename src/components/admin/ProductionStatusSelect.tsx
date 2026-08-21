"use client";

import { useRouter } from "next/navigation";
import type { ProductionStatus } from "@prisma/client";
import { updateOrderProductionStatus } from "@/app/actions/admin";
import { PRODUCTION_STATUS_LABEL } from "@/lib/orders";

const OPTIONS: ProductionStatus[] = [
  "WAITING",
  "ILLUSTRATING",
  "UPSCALING",
  "COMPLETED",
];

export function ProductionStatusSelect({
  orderId,
  value,
}: {
  orderId: string;
  value: ProductionStatus;
}) {
  const router = useRouter();

  return (
    <select
      defaultValue={value}
      onChange={async (event) => {
        await updateOrderProductionStatus(
          orderId,
          event.target.value as ProductionStatus,
        );
        router.refresh();
      }}
      className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm"
    >
      {OPTIONS.map((status) => (
        <option key={status} value={status}>
          {PRODUCTION_STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}
