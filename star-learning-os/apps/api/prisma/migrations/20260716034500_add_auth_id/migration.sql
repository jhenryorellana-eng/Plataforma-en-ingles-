-- Vínculo con Supabase Auth: cada cuenta con contraseña apunta a auth.users.
ALTER TABLE "identity"."users" ADD COLUMN "authId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_authId_key" ON "identity"."users"("authId");
