import React from "react";
import { ToastAction } from "@/components/ui/toast";

export async function deleteWithUndo({ entity, record, toast, onChanged, label = "Item excluído" }) {
  if (!record) return;
  const deleted = await entity.delete(record.id);
  window.dispatchEvent(new Event("database-updated"));
  await onChanged?.();
  toast({
    title: label,
    description: "Você pode desfazer esta ação por alguns segundos.",
    duration: 10000,
    action: (
      <ToastAction
        altText="Desfazer exclusão"
        onClick={async () => {
          await entity.restore(deleted || record);
          window.dispatchEvent(new Event("database-updated"));
          await onChanged?.();
        }}
      >
        Desfazer
      </ToastAction>
    ),
  });
}
