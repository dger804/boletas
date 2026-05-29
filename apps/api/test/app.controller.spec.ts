import { Test } from "@nestjs/testing";
import { AppController } from "../src/app.controller";
import { PrismaService } from "../src/database/prisma.service";

describe("AppController", () => {
  const prisma = {
    checkConnection: jest.fn().mockResolvedValue({
      database: "mysql",
      latencyMs: 1,
      status: "ok"
    })
  };

  it("returns a health payload", () => {
    const controller = new AppController(prisma as unknown as PrismaService);

    expect(controller.health()).toMatchObject({
      app: "boletas-api",
      status: "ok"
    });
  });

  it("can be created through a testing module", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma
        }
      ]
    }).compile();

    expect(moduleRef.get(AppController)).toBeInstanceOf(AppController);
  });

  it("returns a database health payload", async () => {
    const controller = new AppController(prisma as unknown as PrismaService);

    await expect(controller.databaseHealth()).resolves.toMatchObject({
      app: "boletas-api",
      database: "mysql",
      status: "ok"
    });
  });
});
