-- Catálogo de telas e papéis dinâmicos (RBAC manager)

CREATE TABLE "ManagerScreen" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "pathSegment" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ManagerScreen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagerScreen_key_key" ON "ManagerScreen"("key");

CREATE TABLE "AppRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "mapsToRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppRole_slug_key" ON "AppRole"("slug");

CREATE TABLE "AppRoleScreen" (
    "appRoleId" INTEGER NOT NULL,
    "screenId" INTEGER NOT NULL,

    CONSTRAINT "AppRoleScreen_pkey" PRIMARY KEY ("appRoleId","screenId"),
    CONSTRAINT "AppRoleScreen_appRoleId_fkey" FOREIGN KEY ("appRoleId") REFERENCES "AppRole"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppRoleScreen_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "ManagerScreen"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "User" ADD COLUMN "appRoleId" INTEGER;

ALTER TABLE "User" ADD CONSTRAINT "User_appRoleId_fkey" FOREIGN KEY ("appRoleId") REFERENCES "AppRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
