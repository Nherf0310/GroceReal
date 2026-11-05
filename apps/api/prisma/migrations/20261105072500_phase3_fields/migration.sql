-- CreateEnum
CREATE TYPE "DeliveryFailureReason" AS ENUM ('CUSTOMER_UNAVAILABLE', 'WRONG_ADDRESS', 'OTHER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERY_FAILED';

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "status",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "failureNote" TEXT,
ADD COLUMN     "failureReason" "DeliveryFailureReason";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "substituteQuantity" INTEGER,
ADD COLUMN     "substituteUnitPrice" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "rejectionReason" TEXT;

