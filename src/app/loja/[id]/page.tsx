"use client";

import { useParams } from "next/navigation";
import { ShopView } from "@/components/ShopView";
import { CATALOG } from "@/lib/catalogData";

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  return <ShopView shopId={id} catalog={CATALOG} />;
}
