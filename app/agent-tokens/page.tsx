"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentTokensRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/tokens#agent"); }, [router]);
  return null;
}
