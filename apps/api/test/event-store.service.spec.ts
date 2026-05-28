import { BadRequestException } from "@nestjs/common";
import { EventStoreService } from "../src/events/event-store.service";

describe("EventStoreService", () => {
  it("runs the sale, payment approval and check-in workflow", () => {
    const store = new EventStoreService();

    const event = store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 50,
      name: "Evento Test",
      status: "active",
      venue: "Auditorio Test"
    });
    const distributor = store.addDistributor(event.id, {
      name: "Equipo Comercial",
      phone: "+57 300 000 0000"
    });
    const tickets = store.createTicketBatch(event.id, {
      capitalizationAmount: 15000,
      codePrefix: "VIP",
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    const assigned = store.assignTicket(ticket.id, {
      distributorId: distributor.id,
      recipientName: "Comprador Potencial"
    });
    expect(assigned.status).toBe("assigned");

    const sale = store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "transfer",
      reference: "TRX-TEST-001"
    });
    expect(sale.ticket.status).toBe("sold");
    expect(sale.payment.status).toBe("pending");

    const approved = store.verifyPayment(sale.payment.id, {
      reviewedBy: "Admin Test",
      status: "approved"
    });
    expect(approved.ticket.status).toBe("paid");
    expect(approved.payment.status).toBe("approved");

    const used = store.checkInTicket(ticket.id, {
      checkedInBy: "Porteria Test"
    });
    expect(used.status).toBe("used");
    expect(used.checkedInBy).toBe("Porteria Test");

    const dashboard = store.getEventDashboard(event.id);
    expect(dashboard.totals).toMatchObject({
      capitalization: 15000,
      grossSales: 90000,
      paid: 1,
      used: 1
    });
  });

  it("does not allow check-in before payment approval", () => {
    const store = new EventStoreService();
    const tickets = store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "cash"
    });

    expect(() =>
      store.checkInTicket(ticket.id, {
        checkedInBy: "Porteria Test"
      })
    ).toThrow(BadRequestException);
  });
});
