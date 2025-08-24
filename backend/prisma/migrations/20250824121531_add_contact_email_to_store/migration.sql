/*
  Warnings:

  - Added the required column `contactEmail` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Store" ADD COLUMN     "contactEmail" TEXT NOT NULL;
