-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "telegram_chat_id" BIGINT,
    "username" VARCHAR(255),
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "registered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "language_code" VARCHAR(10) NOT NULL DEFAULT 'uz',
    "currency_code" VARCHAR(10) NOT NULL DEFAULT 'UZS',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Tashkent',
    "default_report_type" VARCHAR(20) NOT NULL DEFAULT 'month',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "categories_user_id_type_is_active_idx" ON "categories"("user_id", "type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "categories_user_id_type_name_key" ON "categories"("user_id", "type", "name");

-- CreateIndex
CREATE INDEX "transactions_user_id_occurred_at_idx" ON "transactions"("user_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_user_id_type_occurred_at_idx" ON "transactions"("user_id", "type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_user_id_category_id_occurred_at_idx" ON "transactions"("user_id", "category_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
