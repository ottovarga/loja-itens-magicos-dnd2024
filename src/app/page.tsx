"use client";

import { useRouter } from "next/navigation";
import { HomeView } from "@/components/HomeView";
import { CATALOG } from "@/lib/catalogData";

export default function HomePage() {
  const router = useRouter();
  return <HomeView catalog={CATALOG} onOpenShop={(id) => router.push(`/loja/${id}`)} />;
}
