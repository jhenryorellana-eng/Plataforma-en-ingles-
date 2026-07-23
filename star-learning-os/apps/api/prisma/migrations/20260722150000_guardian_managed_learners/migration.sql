BEGIN;

ALTER TABLE "identity"."users"
  ADD COLUMN "loginName" TEXT,
  ADD COLUMN "birthYear" INTEGER,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "users_loginName_key"
  ON "identity"."users"("loginName");

ALTER TABLE "identity"."users"
  ADD CONSTRAINT "users_login_name_format_check"
    CHECK (
      "loginName" IS NULL OR (
        "loginName" = lower("loginName")
        AND char_length("loginName") BETWEEN 4 AND 30
        AND "loginName" ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
      )
    ),
  ADD CONSTRAINT "users_managed_learner_identity_check"
    CHECK (
      "loginName" IS NULL OR (
        "role" = 'learner'
        AND "email" IS NULL
      )
    ),
  ADD CONSTRAINT "users_initial_password_role_check"
    CHECK (
      NOT "mustChangePassword" OR (
        "role" = 'learner' AND "loginName" IS NOT NULL
      )
    ),
  ADD CONSTRAINT "users_birth_year_range_check"
    CHECK ("birthYear" IS NULL OR "birthYear" BETWEEN 1900 AND 2100);

COMMIT;
