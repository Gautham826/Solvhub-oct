-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestUrgency" AS ENUM ('NORMAL', 'EMERGENCY');

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "acceptingRequests" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "urgency" "RequestUrgency" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredSlot" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "accessNotes" TEXT,
    "estimateAmount" INTEGER,
    "finalAmount" INTEGER,
    "providerNote" TEXT,
    "declineReason" TEXT,
    "cancelReason" TEXT,
    "completionNotes" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "actorRole" "Role" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_requests_reference_key" ON "service_requests"("reference");

-- CreateIndex
CREATE INDEX "service_requests_customerId_status_idx" ON "service_requests"("customerId", "status");

-- CreateIndex
CREATE INDEX "service_requests_providerId_status_idx" ON "service_requests"("providerId", "status");

-- CreateIndex
CREATE INDEX "request_events_requestId_idx" ON "request_events"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "request_attachments_storedName_key" ON "request_attachments"("storedName");

-- CreateIndex
CREATE INDEX "request_attachments_requestId_idx" ON "request_attachments"("requestId");

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
