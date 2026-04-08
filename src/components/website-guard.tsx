"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { WebsiteSelectDialog } from "@/components/website-select-dialog";

type Website = { id: string; name: string; url: string };

export function WebsiteGuard({ websites, children }: { websites: Website[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wid = searchParams.get("wid");
  const isValid = websites.some((w) => w.id === wid);

  React.useEffect(() => {
    if (!isValid && websites.length === 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("wid", websites[0].id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [isValid, websites, searchParams, pathname, router]);

  return (
    <>
      {children}
      {!isValid && websites.length > 1 && pathname.toLocaleLowerCase() !== "/dashboard/websites" && (
        <WebsiteSelectDialog websites={websites} />
      )}
    </>
  );
}
