-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('PROFESSIONAL', 'STUDENT', 'RETIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_PROOF', 'QUALIFICATION_CERTIFICATE', 'ELECTRICAL_LICENCE', 'PROFILE_PHOTO');

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "idNumberLast4" TEXT,
ADD COLUMN     "idType" TEXT,
ADD COLUMN     "institute" TEXT,
ADD COLUMN     "licenceAuthority" TEXT,
ADD COLUMN     "licenceNumber" TEXT,
ADD COLUMN     "licenceValidUntil" TIMESTAMP(3),
ADD COLUMN     "providerType" "ProviderType",
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "serviceRadiusKm" INTEGER,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "workArrangement" TEXT,
ADD COLUMN     "workEndTime" TEXT,
ADD COLUMN     "workStartTime" TEXT,
ADD COLUMN     "workingDays" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "provider_documents" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProviderProfileToServiceCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProviderProfileToServiceCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "provider_documents_storedName_key" ON "provider_documents"("storedName");

-- CreateIndex
CREATE UNIQUE INDEX "provider_documents_profileId_type_key" ON "provider_documents"("profileId", "type");

-- CreateIndex
CREATE INDEX "_ProviderProfileToServiceCategory_B_index" ON "_ProviderProfileToServiceCategory"("B");

-- AddForeignKey
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_documents" ADD CONSTRAINT "provider_documents_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderProfileToServiceCategory" ADD CONSTRAINT "_ProviderProfileToServiceCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderProfileToServiceCategory" ADD CONSTRAINT "_ProviderProfileToServiceCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
