import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Výstupní schéma extrakce z dodacího listu.
const DeliveryNoteSchema = z.object({
  supplierName: z.string().nullable(),
  pricesIncludeVat: z.boolean(),
  currency: z.string().nullable(),
  items: z.array(
    z.object({
      name: z.string(),
      code: z.string().nullable(), // jakýkoli kód na řádku (EAN / ref / kat. č.)
      quantity: z.number(),
      unitPrice: z.number().nullable(), // cena za jednotku, jak je vytištěná
      lineTotal: z.number().nullable(),
      packGuess: z.number().nullable(), // odhad počtu ks v 1 balení z názvu (4x400g→4, "4 role"→4, "80ks"→80), jinak null
    }),
  ),
});

export type DeliveryNote = z.infer<typeof DeliveryNoteSchema>;

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const PROMPT = `Jsi asistent pro zpracování dodacích listů a faktur zubní kliniky.
Z přiloženého obrázku/skenu přečti všechny položky a vrať je strukturovaně.
- name: název položky tak, jak je na dokladu.
- code: jakýkoli kód u položky (EAN, katalogové/objednací číslo, ref). Pokud žádný, null.
- quantity: objednané/dodané množství (číslo).
- unitPrice: jednotková cena tak, jak je vytištěná (číslo bez měny), jinak null.
- lineTotal: cena za řádek celkem, jinak null.
- packGuess: pokud z názvu plyne, kolik kusů obsahuje 1 balení, vrať to číslo (např. "4x400g"→4, "4 role"→4, "balení 80 ks"→80, "100ks/bal"→100). Když to z názvu nejde poznat, dej null.
- pricesIncludeVat: true pokud jsou ceny uvedené s DPH, false pokud bez DPH (rozhodni podle dokladu; když nejisté, dej false).
- supplierName: název dodavatele, jinak null.
- currency: měna (např. "CZK"), jinak null.
Čísla čti v desetinné tečce. Nehádej položky, které na dokladu nejsou.`;

export async function extractDeliveryNote(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<DeliveryNote> {
  if (!isAiConfigured()) {
    throw new Error("AI není nakonfigurováno (chybí ANTHROPIC_API_KEY).");
  }
  const client = new Anthropic();
  const model = process.env.AI_MODEL || "claude-opus-4-8";

  const response = await client.messages.parse({
    model,
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(DeliveryNoteSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Model nevrátil strukturovaný výstup.");
  }
  return response.parsed_output;
}
