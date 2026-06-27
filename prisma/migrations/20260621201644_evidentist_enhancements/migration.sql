/*
  Warnings:

  - You are about to drop the column `barcode` on the `Product` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Ordinace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductBarcode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    CONSTRAINT "ProductBarcode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductWarehouseLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "minQuantity" REAL NOT NULL DEFAULT 0,
    "optimalQuantity" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ProductWarehouseLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductWarehouseLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "warehouseId" TEXT,
    "supplierId" TEXT,
    "ordinaceId" TEXT,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "additionalCost" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockDocument_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockDocument_ordinaceId_fkey" FOREIGN KEY ("ordinaceId") REFERENCES "Ordinace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
INSERT INTO "new_Product" ("active", "category", "createdAt", "defaultSupplierId", "defaultWarehouseId", "id", "isMedicalDevice", "minQuantity", "name", "pricePurchase", "reorderQuantity", "sku", "trackBatches", "unit", "updatedAt") SELECT "active", "category", "createdAt", "defaultSupplierId", "defaultWarehouseId", "id", "isMedicalDevice", "minQuantity", "name", "pricePurchase", "reorderQuantity", "sku", "trackBatches", "unit", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "binId" TEXT,
    "supplierId" TEXT,
    "lotNumber" TEXT,
    "expiryDate" DATETIME,
    "quantity" REAL NOT NULL DEFAULT 0,
    "pricePurchase" DECIMAL,
    "positionRow" TEXT,
    "positionShelf" TEXT,
    "positionRack" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBatch_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockBatch" ("binId", "createdAt", "expiryDate", "id", "lotNumber", "pricePurchase", "productId", "quantity", "receivedAt", "updatedAt", "warehouseId") SELECT "binId", "createdAt", "expiryDate", "id", "lotNumber", "pricePurchase", "productId", "quantity", "receivedAt", "updatedAt", "warehouseId" FROM "StockBatch";
DROP TABLE "StockBatch";
ALTER TABLE "new_StockBatch" RENAME TO "StockBatch";
CREATE INDEX "StockBatch_productId_expiryDate_idx" ON "StockBatch"("productId", "expiryDate");
CREATE INDEX "StockBatch_warehouseId_idx" ON "StockBatch"("warehouseId");
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "documentId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "userId" TEXT NOT NULL,
    "ordinaceId" TEXT,
    "reason" TEXT,
    "reference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StockDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_ordinaceId_fkey" FOREIGN KEY ("ordinaceId") REFERENCES "Ordinace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("batchId", "createdAt", "id", "quantity", "reason", "reference", "type", "userId") SELECT "batchId", "createdAt", "id", "quantity", "reason", "reference", "type", "userId" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
CREATE INDEX "StockMovement_batchId_idx" ON "StockMovement"("batchId");
CREATE INDEX "StockMovement_type_createdAt_idx" ON "StockMovement"("type", "createdAt");
CREATE INDEX "StockMovement_ordinaceId_idx" ON "StockMovement"("ordinaceId");
CREATE INDEX "StockMovement_documentId_idx" ON "StockMovement"("documentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProductBarcode_code_idx" ON "ProductBarcode"("code");

-- CreateIndex
CREATE INDEX "ProductBarcode_productId_idx" ON "ProductBarcode"("productId");

-- CreateIndex
CREATE INDEX "ProductWarehouseLevel_warehouseId_idx" ON "ProductWarehouseLevel"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWarehouseLevel_productId_warehouseId_key" ON "ProductWarehouseLevel"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockDocument_type_createdAt_idx" ON "StockDocument"("type", "createdAt");
