-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "distributorCode" TEXT,
    "manufacturerCode" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "piecesPerPackage" REAL NOT NULL DEFAULT 1,
    "packageLabel" TEXT,
    "description" TEXT,
    "defaultWarehouseId" TEXT,
    "defaultSupplierId" TEXT,
    "minQuantity" REAL NOT NULL DEFAULT 0,
    "optimalQuantity" REAL NOT NULL DEFAULT 0,
    "reorderQuantity" REAL NOT NULL DEFAULT 0,
    "pricePurchase" DECIMAL NOT NULL DEFAULT 0,
    "vatRate" REAL NOT NULL DEFAULT 21,
    "isMedicalDevice" BOOLEAN NOT NULL DEFAULT false,
    "trackBatches" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("active", "category", "createdAt", "defaultSupplierId", "defaultWarehouseId", "description", "distributorCode", "id", "isMedicalDevice", "manufacturerCode", "minQuantity", "name", "optimalQuantity", "pricePurchase", "reorderQuantity", "sku", "trackBatches", "unit", "updatedAt", "vatRate") SELECT "active", "category", "createdAt", "defaultSupplierId", "defaultWarehouseId", "description", "distributorCode", "id", "isMedicalDevice", "manufacturerCode", "minQuantity", "name", "optimalQuantity", "pricePurchase", "reorderQuantity", "sku", "trackBatches", "unit", "updatedAt", "vatRate" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
