import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

async function main() {
  // --- Uživatelé ---
  const adminPass = await bcrypt.hash("admin123", 10);
  await db.user.upsert({
    where: { email: "admin@klinika.cz" },
    update: {},
    create: {
      name: "Správce kliniky",
      email: "admin@klinika.cz",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  const staffPass = await bcrypt.hash("staff123", 10);
  await db.user.upsert({
    where: { email: "sestra@klinika.cz" },
    update: {},
    create: {
      name: "Sestra Nováková",
      email: "sestra@klinika.cz",
      passwordHash: staffPass,
      role: "STAFF",
    },
  });

  // --- Sklady ---
  const skladSpotrebni = await db.warehouse.upsert({
    where: { id: "wh-spotrebni" },
    update: {},
    create: {
      id: "wh-spotrebni",
      name: "Spotřební materiál – Praha",
      type: "CONSUMABLE",
      locationLabel: "Budova A / přízemí",
    },
  });

  await db.warehouse.upsert({
    where: { id: "wh-vybaveni" },
    update: {},
    create: {
      id: "wh-vybaveni",
      name: "Malé vybavení – Praha",
      type: "SMALL_EQUIPMENT",
      locationLabel: "Budova A / 1. patro",
    },
  });

  // --- Ordinace ---
  for (const [id, name] of [
    ["ord-1", "Ordinace 1"],
    ["ord-2", "Ordinace 2"],
    ["ord-3", "Ordinace 3"],
    ["ord-dh", "Dentální hygiena"],
  ] as const) {
    await db.ordinace.upsert({
      where: { id },
      update: {},
      create: { id, name },
    });
  }

  // --- Dodavatel ---
  const dodavatel = await db.supplier.upsert({
    where: { id: "sup-dental" },
    update: {},
    create: {
      id: "sup-dental",
      name: "DentalMarket s.r.o.",
      ico: "12345678",
      orderEmail: "objednavky@dentalmarket.cz",
      contacts: {
        create: {
          name: "Jan Obchodník",
          email: "jan@dentalmarket.cz",
          phone: "+420 777 123 456",
          isPrimary: true,
        },
      },
    },
  });

  // --- Produkty ---
  const rukavice = await db.product.upsert({
    where: { sku: "RUK-NIT-M" },
    update: {},
    create: {
      sku: "RUK-NIT-M",
      manufacturerCode: "NIT-M-100",
      distributorCode: "DM-12345",
      name: "Nitrilové rukavice M (bez pudru)",
      category: "Ochranné pomůcky",
      unit: "BOX",
      defaultWarehouseId: skladSpotrebni.id,
      defaultSupplierId: dodavatel.id,
      minQuantity: 10,
      optimalQuantity: 40,
      reorderQuantity: 40,
      pricePurchase: 149.9,
      vatRate: 21,
      isMedicalDevice: false,
      trackBatches: false,
      barcodes: { create: [{ code: "8595000000017" }] },
    },
  });

  const anestetikum = await db.product.upsert({
    where: { sku: "ANE-ARTI-4" },
    update: {},
    create: {
      sku: "ANE-ARTI-4",
      manufacturerCode: "ART4-ADR",
      name: "Artikain 4% s adrenalinem (karpule)",
      category: "Anestetika",
      unit: "PCS", // skladová jednotka = kus (karpule)
      piecesPerPackage: 50, // 50 ks v balení
      packageLabel: "balení",
      defaultWarehouseId: skladSpotrebni.id,
      defaultSupplierId: dodavatel.id,
      minQuantity: 100,
      optimalQuantity: 1000,
      reorderQuantity: 500,
      pricePurchase: 320.0, // cena za kus (balení 16 000 Kč / 50)
      vatRate: 21,
      isMedicalDevice: true,
      trackBatches: true,
      barcodes: { create: [{ code: "8595000000024" }, { code: "8595000000031" }] },
    },
  });

  const vypln = await db.product.upsert({
    where: { sku: "VYP-KOMP-A2" },
    update: {},
    create: {
      sku: "VYP-KOMP-A2",
      manufacturerCode: "KOMP-A2",
      name: "Kompozitní výplň A2",
      category: "Výplňové materiály",
      unit: "PCS",
      defaultWarehouseId: skladSpotrebni.id,
      defaultSupplierId: dodavatel.id,
      minQuantity: 3,
      optimalQuantity: 10,
      reorderQuantity: 10,
      pricePurchase: 540.0,
      vatRate: 21,
      isMedicalDevice: true,
      trackBatches: true,
    },
  });

  // --- Per-sklad hladiny (přepisují default) ---
  await db.productWarehouseLevel.upsert({
    where: {
      productId_warehouseId: {
        productId: rukavice.id,
        warehouseId: skladSpotrebni.id,
      },
    },
    update: {},
    create: {
      productId: rukavice.id,
      warehouseId: skladSpotrebni.id,
      minQuantity: 10,
      optimalQuantity: 40,
    },
  });

  // --- Šarže ---
  await db.stockBatch.create({
    data: {
      productId: rukavice.id,
      warehouseId: skladSpotrebni.id,
      supplierId: dodavatel.id,
      quantity: 6, // pod min. zásobou → upozornění
      pricePurchase: 149.9,
    },
  });

  await db.stockBatch.create({
    data: {
      productId: anestetikum.id,
      warehouseId: skladSpotrebni.id,
      supplierId: dodavatel.id,
      lotNumber: "LOT-A-2025",
      expiryDate: new Date("2026-08-31"),
      quantity: 400, // 8 balení × 50 ks
      pricePurchase: 320.0,
    },
  });
  await db.stockBatch.create({
    data: {
      productId: anestetikum.id,
      warehouseId: skladSpotrebni.id,
      supplierId: dodavatel.id,
      lotNumber: "LOT-B-2026",
      expiryDate: new Date("2027-03-31"),
      quantity: 600, // 12 balení × 50 ks
      pricePurchase: 320.0,
    },
  });
  void vypln;

  console.log("Seed hotový.");
  console.log("Admin: admin@klinika.cz / admin123");
  console.log("Staff: sestra@klinika.cz / staff123");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
