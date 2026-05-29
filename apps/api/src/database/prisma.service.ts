import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor(config: ConfigService) {
    const databaseUrl = config.get<string>("DATABASE_URL");

    super({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl
            }
          }
        : undefined
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkConnection() {
    const startedAt = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("database connection failed");
    }

    return {
      database: "mysql",
      latencyMs: Date.now() - startedAt,
      status: "ok"
    };
  }
}
