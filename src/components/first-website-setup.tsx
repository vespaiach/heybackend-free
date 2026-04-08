"use client";

import { useRouter } from "next/navigation";
import { WebsiteFormModal } from "@/components/website-form-modal";

export function FirstWebsiteSetup() {
  const router = useRouter();
  return (
    <WebsiteFormModal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.refresh();
      }}
      isRequired={true}
    />
  );
}
