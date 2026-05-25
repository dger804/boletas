import { Test } from "@nestjs/testing";
import { AppController } from "../src/app.controller";

describe("AppController", () => {
  it("returns a health payload", () => {
    const controller = new AppController();

    expect(controller.health()).toMatchObject({
      app: "boletas-api",
      status: "ok"
    });
  });

  it("can be created through a testing module", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController]
    }).compile();

    expect(moduleRef.get(AppController)).toBeInstanceOf(AppController);
  });
});
