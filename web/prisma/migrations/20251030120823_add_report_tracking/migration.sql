-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RECEPTOR', 'EMISSOR');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SENT', 'RECEIVED', 'VIEWED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'RECEPTOR';

-- CreateTable
CREATE TABLE "emissor_info" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "cnpj" TEXT,
    "address" TEXT,
    "contact" TEXT,

    CONSTRAINT "emissor_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'SENT',
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "notificationId" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emissor_info_userId_key" ON "emissor_info"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_protocol_key" ON "reports"("protocol");

-- CreateIndex
CREATE UNIQUE INDEX "reports_notificationId_key" ON "reports"("notificationId");

-- AddForeignKey
ALTER TABLE "emissor_info" ADD CONSTRAINT "emissor_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
