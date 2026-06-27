"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOrderProposals } from "@/app/actions/orders";

export function GenerateOrdersButton() {
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    start(async () => {
      const res = await generateOrderProposals();
      if (!res.ok) {
        toast.error(res.error ?? "Nepodařilo se vytvořit návrhy.");
        return;
      }
      toast.success(res.message ?? "Návrhy vytvořeny.");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      <Sparkles className="size-4" />
      {pending ? "Generuji…" : "Vygenerovat návrhy z docházejících"}
    </Button>
  );
}
