-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MEMBER', 'MANAGER');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('OPEN', 'COOKING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "messId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mess" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "isMonthActive" BOOLEAN NOT NULL DEFAULT false,
    "currentMonthId" TEXT,
    "requestStartTime" TEXT NOT NULL DEFAULT '17:00',
    "lunchEndTime" TEXT NOT NULL DEFAULT '02:00',
    "dinnerEndTime" TEXT NOT NULL DEFAULT '12:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyData" (
    "id" TEXT NOT NULL,
    "monthName" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "totalBazaarCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "lunchCount" INTEGER NOT NULL DEFAULT 0,
    "lunchStatus" "MealStatus" NOT NULL DEFAULT 'OPEN',
    "lunchCancelledBy" TEXT,
    "dinnerCount" INTEGER NOT NULL DEFAULT 0,
    "dinnerStatus" "MealStatus" NOT NULL DEFAULT 'OPEN',
    "dinnerCancelledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealRequest" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BazaarItem" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shopperId" TEXT,
    "shopperName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BazaarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Mess_code_key" ON "Mess"("code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyData" ADD CONSTRAINT "MonthlyData_messId_fkey" FOREIGN KEY ("messId") REFERENCES "Mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthlyData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealRequest" ADD CONSTRAINT "MealRequest_logId_fkey" FOREIGN KEY ("logId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealRequest" ADD CONSTRAINT "MealRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BazaarItem" ADD CONSTRAINT "BazaarItem_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthlyData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "MonthlyData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
