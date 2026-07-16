import type { AuthenticatedUser } from "@boletas/shared";
import "reflect-metadata";
import { ROLES_KEY } from "../src/auth/roles.decorator";
import { PaymentsController } from "../src/events/payments.controller";
import { TicketsController } from "../src/events/tickets.controller";
import type { EventStoreService } from "../src/events/event-store.service";

const user: AuthenticatedUser = {
  email: "supervisor@example.com",
  id: "usr_supervisor",
  name: "Supervisor Real",
  role: "supervisor"
};

describe("event action actors", () => {
  it("uses the authenticated user as payment reviewer", () => {
    const store = {
      verifyPayment: jest.fn()
    } as unknown as EventStoreService;
    const controller = new PaymentsController(store);

    controller.verifyPayment(
      "pay_1",
      { reviewedBy: "Nombre Falso", status: "approved" },
      { headers: {}, user }
    );

    expect(store.verifyPayment).toHaveBeenCalledWith(
      "pay_1",
      { reviewedBy: "Supervisor Real", status: "approved" },
      user
    );
  });

  it("uses the authenticated user as check-in actor", () => {
    const store = {
      checkInTicket: jest.fn()
    } as unknown as EventStoreService;
    const controller = new TicketsController(store);

    controller.checkInTicket(
      "tck_1",
      { checkedInBy: "Porteria Falsa" },
      { headers: {}, user }
    );

    expect(store.checkInTicket).toHaveBeenCalledWith(
      "tck_1",
      { checkedInBy: "Supervisor Real" },
      user
    );
  });

  it("uses the authenticated user for ticket code lookup", () => {
    const store = {
      lookupTicketByCode: jest.fn()
    } as unknown as EventStoreService;
    const controller = new TicketsController(store);

    controller.lookupTicket(
      "evt_demo",
      "VIP-001",
      { headers: {}, user }
    );

    expect(store.lookupTicketByCode).toHaveBeenCalledWith(
      "evt_demo",
      "VIP-001",
      user
    );
  });

  it("limits ticket voiding to management roles", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      TicketsController.prototype.voidTicket
    );

    expect(roles).toEqual(["supervisor", "admin"]);
  });

  it("allows reservation actions to operational roles", () => {
    const reserveRoles = Reflect.getMetadata(
      ROLES_KEY,
      TicketsController.prototype.reserveTicket
    );
    const releaseRoles = Reflect.getMetadata(
      ROLES_KEY,
      TicketsController.prototype.releaseTicketReservation
    );

    expect(reserveRoles).toEqual(["regular", "supervisor", "admin"]);
    expect(releaseRoles).toEqual(["regular", "supervisor", "admin"]);
  });

  it("allows operational roles to look up tickets by code", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      TicketsController.prototype.lookupTicket
    );

    expect(roles).toEqual(["regular", "supervisor", "admin"]);
  });
});
