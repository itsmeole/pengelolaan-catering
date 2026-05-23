-- Migration: Tambah kolom isActive pada tabel profiles
-- Jalankan di Supabase SQL Editor

ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE;

-- Semua vendor yang sudah ada langsung aktif (true) secara default
