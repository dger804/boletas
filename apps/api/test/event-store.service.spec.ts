import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../src/database/prisma.service";
import { EventStoreService } from "../src/events/event-store.service";

describe("EventStoreService", () => {
  it("uses Prisma when the database is configured", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        createdAt: new Date("2026-05-29T00:00:00.000Z"),
        date: new Date("2026-08-01T20:00:00.000Z"),
        expectedAttendees: 120,
        id: "evt_db",
        name: "Evento DB",
        status: "active",
        updatedAt: new Date("2026-05-29T00:00:00.000Z"),
        venue: "Auditorio DB"
      }
    ]);
    const prisma = {
      event: { findMany },
      isConfigured: () => true
    } as unknown as PrismaService;
    const store = new EventStoreService(prisma);

    await expect(store.listEvents()).resolves.toMatchObject([
      {
        id: "evt_db",
        name: "Evento DB",
        status: "active"
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" }
    });
  });

  it("runs the sale, payment approval and check-in workflow", async () => {
    const store = new EventStoreService();

    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 50,
      name: "Evento Test",
      status: "active",
      venue: "Auditorio Test"
    });
    const distributor = await store.addDistributor(event.id, {
      name: "Equipo Comercial",
      phone: "+57 300 000 0000"
    });
    const tickets = await store.createTicketBatch(event.id, {
      capitalizationAmount: 15000,
      codePrefix: "VIP",
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    const assigned = await store.assignTicket(ticket.id, {
      distributorId: distributor.id,
      recipientName: "Comprador Potencial"
    });
    expect(assigned.status).toBe("assigned");
    expect(assigned.distributorName).toBe("Equipo Comercial");
    expect(assigned.distributorPhone).toBe("+57 300 000 0000");

    const sale = await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "transfer",
      reference: "TRX-TEST-001"
    });
    expect(sale.ticket.status).toBe("sold");
    expect(sale.payment.status).toBe("pending");

    const approved = await store.verifyPayment(sale.payment.id, {
      reviewedBy: "Admin Test",
      status: "approved"
    });
    expect(approved.ticket.status).toBe("paid");
    expect(approved.payment.status).toBe("approved");
    expect(approved.payment.ticketCode).toBe(ticket.code);
    expect(approved.payment.ticketStatus).toBe("paid");

    const used = await store.checkInTicket(ticket.id, {
      checkedInBy: "Porteria Test"
    });
    expect(used.status).toBe("used");
    expect(used.checkedInBy).toBe("Porteria Test");

    const dashboard = await store.getEventDashboard(event.id);
    expect(dashboard.totals).toMatchObject({
      capitalization: 15000,
      grossSales: 90000,
      paid: 1,
      used: 1
    });
  });

  it("builds a public dashboard without buyer or payment evidence details", async () => {
    const store = new EventStoreService();
    const dashboard = await store.getPublicEventDashboard("evt_demo");
    const serialized = JSON.stringify(dashboard);

    expect(dashboard.event).toMatchObject({
      name: "Lanzamiento Demo",
      venue: "Auditorio Principal"
    });
    expect(dashboard.ticketSamples[0]).toMatchObject({
      detail: "Pago validado",
      reference: "Boleta 1"
    });
    expect(serialized).not.toContain("Comprador Demo");
    expect(serialized).not.toContain("+57");
    expect(serialized).not.toContain("TRX-DEMO");
    expect(serialized).not.toContain("evidencia-demo");
  });

  it("updates event metadata", async () => {
    const store = new EventStoreService();

    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 50,
      name: "Evento Original",
      status: "draft",
      venue: "Auditorio Original"
    });

    const updated = await store.updateEvent(event.id, {
      expectedAttendees: 80,
      name: "Evento Actualizado",
      status: "active",
      venue: "Auditorio Principal"
    });

    expect(updated).toMatchObject({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 80,
      name: "Evento Actualizado",
      status: "active",
      venue: "Auditorio Principal"
    });
  });

  it("rejects empty event updates", async () => {
    const store = new EventStoreService();

    await expect(store.updateEvent("evt_demo", {})).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("includes the assigned distributor contact when listing tickets", async () => {
    const store = new EventStoreService();

    await expect(store.listTickets("evt_demo")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VIP-001",
          distributorId: "dst_demo_1",
          distributorEmail: "ventas@example.com",
          distributorName: "Equipo Comercial",
          distributorPhone: "+57 300 000 0000"
        })
      ])
    );
  });

  it("lists distributors for an event", async () => {
    const store = new EventStoreService();

    await expect(store.listDistributors("evt_demo")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: "ventas@example.com",
          id: "dst_demo_1",
          name: "Equipo Comercial",
          phone: "+57 300 000 0000"
        })
      ])
    );
  });

  it("lists payment evidence with ticket summary", async () => {
    const store = new EventStoreService();

    await expect(store.listPayments("evt_demo")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pay_demo_1",
          ticketBuyerName: "Comprador Demo",
          ticketBuyerPhone: "+57 311 000 0000",
          ticketCode: "VIP-001",
          ticketStatus: "paid"
        })
      ])
    );
  });

  it("selects distributor contact fields when listing tickets from Prisma", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        buyerName: null,
        buyerPhone: null,
        capitalizationAmount: 15000,
        checkedInBy: null,
        code: "VIP-010",
        createdAt: new Date("2026-05-29T00:00:00.000Z"),
        distributor: {
          email: "ana@example.com",
          name: "Ana Responsable",
          notes: "Zona norte",
          phone: "+57 310 000 0000"
        },
        distributorId: "dst_db",
        eventId: "evt_db",
        id: "tck_db",
        notes: null,
        paidAt: null,
        paymentMethod: null,
        price: 90000,
        recipientName: null,
        soldAt: null,
        status: "assigned",
        updatedAt: new Date("2026-05-29T00:00:00.000Z"),
        usedAt: null
      }
    ]);
    const prisma = {
      isConfigured: () => true,
      ticket: { findMany }
    } as unknown as PrismaService;
    const store = new EventStoreService(prisma);

    await expect(store.listTickets("evt_db")).resolves.toMatchObject([
      {
        code: "VIP-010",
        distributorEmail: "ana@example.com",
        distributorName: "Ana Responsable",
        distributorNotes: "Zona norte",
        distributorPhone: "+57 310 000 0000"
      }
    ]);
    expect(findMany).toHaveBeenCalledWith({
      include: {
        distributor: {
          select: {
            email: true,
            name: true,
            notes: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: "asc" },
      where: { eventId: "evt_db" }
    });
  });

  it("does not allow check-in before payment approval", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "cash"
    });

    await expect(
      store.checkInTicket(ticket.id, {
        checkedInBy: "Porteria Test"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not allow registering a sale twice for the same ticket", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "cash"
    });

    await expect(
      store.registerSale(ticket.id, {
        amount: 90000,
        buyerName: "Comprador Duplicado",
        method: "cash"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not allow assigning a ticket after sale", async () => {
    const store = new EventStoreService();
    const distributor = await store.addDistributor("evt_demo", {
      name: "Responsable Test",
      phone: "+57 320 000 0000"
    });
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "cash"
    });

    await expect(
      store.assignTicket(ticket.id, {
        distributorId: distributor.id
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
