"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast-provider";

type QueryToastSyncProps = {
  message?: string;
  title?: string;
  type?: "error" | "info" | "success";
};

export function QueryToastSync({
  message,
  title,
  type,
}: QueryToastSyncProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (!message || !type || hasShownRef.current) {
      return;
    }

    hasShownRef.current = true;

    showToast({
      message,
      title,
      type,
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("message");
    nextSearchParams.delete("type");

    const nextUrl = nextSearchParams.toString()
      ? `${pathname}?${nextSearchParams.toString()}`
      : pathname;

    router.replace(nextUrl, { scroll: false });
  }, [message, pathname, router, searchParams, showToast, title, type]);

  return null;
}
