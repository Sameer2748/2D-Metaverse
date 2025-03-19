import { PrismaClient } from "@prisma/client";

export default new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
