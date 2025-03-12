import { PrismaClient } from "@prisma/client";

export default new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL +
        "&connection_limit=1&idle_in_transaction_session_timeout=60000",
    },
  },
});
