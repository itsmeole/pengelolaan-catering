-- INIT SUPABASE SCHEMA
-- Create extension for UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum types
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('STUDENT', 'VENDOR', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH_PAY_LATER', 'TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop previously existing tables (if any, be careful in real prod)
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "MenuItem" CASCADE;
DROP TABLE IF EXISTS "StudentValidation" CASCADE;
DROP TABLE IF EXISTS "SystemSetting" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;

-- Profiles matching Users in auth.users
CREATE TABLE "profiles" (
    "id" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" VARCHAR,
    "email" VARCHAR UNIQUE NOT NULL,
    "role" "Role" DEFAULT 'STUDENT'::"Role" NOT NULL,
    
    -- Student specific
    "nis" VARCHAR UNIQUE,
    "class" VARCHAR,
    
    -- Vendor specific
    "vendorName" VARCHAR,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', COALESCE((new.raw_user_meta_data->>'role')::"Role", 'STUDENT'::"Role"));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Remaining tables mapped exactly
CREATE TABLE "StudentValidation" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "nis" VARCHAR UNIQUE NOT NULL,
    "name" VARCHAR NOT NULL,
    "class" VARCHAR NOT NULL
);

CREATE TABLE "SystemSetting" (
    "key" VARCHAR PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MenuItem" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "vendorId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "name" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Order" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING'::"OrderStatus",
    "paymentMethod" "PaymentMethod" NOT NULL,
    "proofImage" TEXT,
    "transferDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OrderItem" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId" VARCHAR NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
    "menuId" VARCHAR NOT NULL REFERENCES "MenuItem"(id) ON DELETE CASCADE,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" VARCHAR,
    "price" DOUBLE PRECISION NOT NULL,
    "adminFee" DOUBLE PRECISION NOT NULL DEFAULT 1000
);

CREATE TABLE "Review" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "studentId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "orderItemId" VARCHAR UNIQUE NOT NULL REFERENCES "OrderItem"(id) ON DELETE CASCADE,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Delete existing auth users if needed (optional safety for reset)
DELETE FROM auth.users WHERE email IN ('admin@school.id', 'vendor1@catering.id', 'siswa1@sekolah.sch.id');

-- Seeder for Mock Users into Supabase Auth
-- Password for all users will be 'password123'
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@school.id', crypt('password123', gen_salt('bf')), current_timestamp, '{"name": "Admin Sekolah", "role": "ADMIN"}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'vendor1@catering.id', crypt('password123', gen_salt('bf')), current_timestamp, '{"name": "Dapur Bunda", "role": "VENDOR"}', current_timestamp, current_timestamp),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'siswa1@sekolah.sch.id', crypt('password123', gen_salt('bf')), current_timestamp, '{"name": "Budi Santoso", "role": "STUDENT"}', current_timestamp, current_timestamp);

-- Let's give all grants to anon (Migration fallback - Do not use this in real production!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon;
