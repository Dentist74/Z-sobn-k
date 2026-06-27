import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { db } from "@/lib/db";
import { updateProduct } from "@/app/actions/products";
import { ProductForm } from "@/components/product-form";
import { toNumber } from "@/lib/format";

export const metadata = { title: "Úprava položky – Zásobník" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER");
  const { id } = await params;

  const [product, warehouses, suppliers, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { barcodes: { select: { code: true } }, levels: true },
    }),
    db.warehouse.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  if (!product) notFound();

  const action = updateProduct.bind(null, product.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Úprava: {product.name}
      </h1>
      <ProductForm
        action={action}
        warehouses={warehouses}
        suppliers={suppliers}
        categories={categories.map((c) => c.name)}
        submitLabel="Uložit změny"
        cancelHref={`/produkty/${product.id}`}
        defaultValues={{
          name: product.name,
          sku: product.sku,
          manufacturerCode: product.manufacturerCode,
          distributorCode: product.distributorCode,
          category: product.category,
          description: product.description,
          unit: product.unit,
          piecesPerPackage: toNumber(product.piecesPerPackage),
          packageLabel: product.packageLabel,
          defaultWarehouseId: product.defaultWarehouseId,
          defaultSupplierId: product.defaultSupplierId,
          minQuantity: toNumber(product.minQuantity),
          optimalQuantity: toNumber(product.optimalQuantity),
          reorderQuantity: toNumber(product.reorderQuantity),
          pricePurchase: toNumber(product.pricePurchase),
          vatRate: toNumber(product.vatRate),
          isMedicalDevice: product.isMedicalDevice,
          trackBatches: product.trackBatches,
          trackLevels: product.trackLevels,
          storageLocation: product.storageLocation,
          active: product.active,
          barcodes: product.barcodes.map((b) => b.code),
          levels: product.levels.map((l) => ({
            warehouseId: l.warehouseId,
            minQuantity: toNumber(l.minQuantity),
            optimalQuantity: toNumber(l.optimalQuantity),
          })),
        }}
      />
    </div>
  );
}
