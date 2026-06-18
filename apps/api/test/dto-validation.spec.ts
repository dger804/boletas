import "reflect-metadata";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { CreateUserDto } from "../src/auth/dto";
import {
  CreateEventDto,
  CreateTicketBatchDto,
  RegisterSaleDto,
  UpdateEventDto
} from "../src/events/dto";
import { EventsController } from "../src/events/events.controller";

const pipe = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true
});

describe("DTO validation", () => {
  it("keeps DTO classes available to NestJS route metadata", () => {
    const paramTypes = Reflect.getMetadata(
      "design:paramtypes",
      EventsController.prototype,
      "createEvent"
    );

    expect(paramTypes[0]).toBe(CreateEventDto);
  });

  it("transforms numeric ticket batch fields", async () => {
    const value = await pipe.transform(
      {
        capitalizationAmount: "15000",
        codePrefix: "VIP",
        price: "90000",
        quantity: "3"
      },
      { metatype: CreateTicketBatchDto, type: "body" }
    );

    expect(value).toBeInstanceOf(CreateTicketBatchDto);
    expect(value).toMatchObject({
      capitalizationAmount: 15000,
      price: 90000,
      quantity: 3
    });
  });

  it("transforms numeric event update fields", async () => {
    const value = await pipe.transform(
      {
        expectedAttendees: "250",
        status: "active"
      },
      { metatype: UpdateEventDto, type: "body" }
    );

    expect(value).toBeInstanceOf(UpdateEventDto);
    expect(value).toMatchObject({
      expectedAttendees: 250,
      status: "active"
    });
  });

  it("rejects invalid money amounts", async () => {
    await expect(
      pipe.transform(
        {
          amount: -1,
          buyerName: "Comprador",
          method: "transfer"
        },
        { metatype: RegisterSaleDto, type: "body" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unexpected payload fields", async () => {
    await expect(
      pipe.transform(
        {
          amount: 90000,
          buyerName: "Comprador",
          method: "cash",
          status: "paid"
        },
        { metatype: RegisterSaleDto, type: "body" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unsupported user roles", async () => {
    await expect(
      pipe.transform(
        {
          email: "usuario@example.com",
          name: "Usuario",
          password: "PruebaSegura2026",
          role: "owner"
        },
        { metatype: CreateUserDto, type: "body" }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
