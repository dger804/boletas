import { PrismaClient } from "@prisma/client";
import { createPasswordHash } from "../src/auth/passwords";

const prisma = new PrismaClient();

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const email = requiredEnv("AUTH_ADMIN_EMAIL").toLowerCase();
  const name = process.env.AUTH_ADMIN_NAME?.trim() || "Administrador";
  const password = requiredEnv("AUTH_ADMIN_PASSWORD");
  const passwordHash = createPasswordHash(password);

  const user = await prisma.appUser.upsert({
    create: {
      email,
      name,
      passwordHash,
      role: "admin",
      status: "active"
    },
    update: {
      name,
      passwordHash,
      role: "admin",
      status: "active"
    },
    where: { email }
  });

  console.log(`Admin user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
