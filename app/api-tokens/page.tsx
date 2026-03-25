"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApiTokensRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/tokens#apikey"); }, [router]);
  return null;
}
