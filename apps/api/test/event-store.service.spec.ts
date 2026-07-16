import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "@boletas/shared";
import { PrismaService } from "../src/database/prisma.service";
import { EventStoreService } from "../src/events/event-store.service";

describe("EventStoreService", () => {
  it("completes the MVP ticket lifecycle from event setup to closeout", async () => {
    const store = new EventStoreService();
    const admin: AuthenticatedUser = {
      email: "admin@example.com",
      id: "usr_admin",
      name: "Admin MVP",
      role: "admin"
    };
    const supervisor: AuthenticatedUser = {
      email: "supervisor@example.com",
      id: "usr_supervisor",
      name: "Supervisor MVP",
      role: "supervisor"
    };
    const regular: AuthenticatedUser = {
      email: "regular@example.com",
      id: "usr_regular",
      name: "Operador MVP",
      role: "regular"
    };

    const event = await store.createEvent(
      {
        date: "2026-08-15T20:00:00.000Z",
        expectedAttendees: 2,
        name: "MVP Ciclo Completo",
        status: "active",
        venue: "Auditorio MVP"
      },
      admin
    );
    const distributor = await store.addDistributor(
      event.id,
      {
        name: "Responsable MVP",
        phone: "+57 300 111 2222",
        userId: regular.id
      },
      admin
    );
    const tickets = await store.createTicketBatch(
      event.id,
      {
        capitalizationAmount: 10000,
        codePrefix: "MVP",
        price: 50000,
        quantity: 2
      },
      admin
    );
    const soldTicket = tickets[0];
    const pendingTicket = tickets[1];
    if (!soldTicket || !pendingTicket) {
      throw new Error("MVP tickets were not created");
    }

    await store.assignTicket(
      soldTicket.id,
      {
        distributorId: distributor.id,
        recipientName: "Comprador MVP"
      },
      supervisor
    );
    await store.assignTicket(
      pendingTicket.id,
      {
        distributorId: distributor.id,
        recipientName: "Reserva MVP"
      },
      supervisor
    );

    const reserved = await store.reserveTicket(
      soldTicket.id,
      {
        notes: "Apartada por llamada",
        recipientName: "Comprador MVP"
      },
      regular
    );
    expect(reserved.status).toBe("reserved");

    const sale = await store.registerSale(
      soldTicket.id,
      {
        amount: 50000,
        buyerName: "Comprador MVP",
        buyerPhone: "+57 311 111 2222",
        method: "transfer",
        reference: "TRX-MVP-001"
      },
      regular
    );
    expect(sale.ticket.status).toBe("sold");
    expect(sale.payment.status).toBe("pending");

    const approved = await store.verifyPayment(
      sale.payment.id,
      {
        status: "approved"
      },
      supervisor
    );
    expect(approved.payment.reviewedBy).toBe("Supervisor MVP");
    expect(approved.ticket.status).toBe("paid");

    const used = await store.checkInTicket(soldTicket.id, {}, regular);
    expect(used).toMatchObject({
      checkedInBy: "Operador MVP",
      status: "used"
    });

    const regularTickets = await store.listTickets(event.id, regular);
    expect(regularTickets.map((ticket) => ticket.id).sort()).toEqual(
      [pendingTicket.id, soldTicket.id].sort()
    );

    const summary = await store.getPublicEventDashboard(event.id);
    expect(JSON.stringify(summary)).not.toContain("Comprador MVP");
    expect(summary.totals).toMatchObject({
      paid: 1,
      pendingToCollect: 0,
      sold: 1,
      used: 1
    });

    const closeout = await store.getEventCloseout(event.id);
    expect(closeout).toMatchObject({
      entry: {
        allowedTickets: 1,
        remainingAllowedTickets: 0,
        usedTickets: 1
      },
      payments: {
        approved: 1,
        approvedAmount: 50000,
        pending: 0
      },
      totals: {
        capitalization: 10000,
        grossSales: 50000,
        paid: 1,
        used: 1
      }
    });
    expect(closeout.pendingTickets).toEqual([
      expect.objectContaining({
        id: pendingTicket.id,
        status: "assigned"
      })
    ]);

    await store.updateEvent(event.id, { status: "closed" }, admin);

    await expect(
      store.registerSale(
        pendingTicket.id,
        {
          amount: 50000,
          buyerName: "Compra tardia",
          method: "cash"
        },
        regular
      )
    ).rejects.toThrow("closed events do not accept operational changes");
  });

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

  it("scopes protected summaries for regular users to linked distributors", async () => {
    const store = new EventStoreService();
    const regular: AuthenticatedUser = {
      email: "regular@example.com",
      id: "usr_regular",
      name: "Regular",
      role: "regular"
    };
    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 50,
      name: "Resumen Granular",
      status: "active",
      venue: "Auditorio Test"
    });
    const ownDistributor = await store.addDistributor(event.id, {
      name: "Responsable Propio",
      phone: "+57 300 000 0001",
      userId: regular.id
    });
    const otherDistributor = await store.addDistributor(event.id, {
      name: "Responsable Otro",
      phone: "+57 300 000 0002",
      userId: "usr_other"
    });
    const tickets = await store.createTicketBatch(event.id, {
      price: 50000,
      quantity: 2
    });
    const ownTicket = tickets[0];
    const otherTicket = tickets[1];
    if (!ownTicket || !otherTicket) {
      throw new Error("tickets were not created");
    }

    await store.assignTicket(ownTicket.id, {
      distributorId: ownDistributor.id
    });
    await store.assignTicket(otherTicket.id, {
      distributorId: otherDistributor.id
    });
    const ownSale = await store.registerSale(
      ownTicket.id,
      {
        amount: 50000,
        buyerName: "Comprador Propio",
        method: "cash"
      },
      regular
    );
    await store.verifyPayment(ownSale.payment.id, {
      reviewedBy: "Supervisor Test",
      status: "approved"
    });
    const otherSale = await store.registerSale(otherTicket.id, {
      amount: 50000,
      buyerName: "Comprador Otro",
      method: "cash"
    });
    await store.verifyPayment(otherSale.payment.id, {
      reviewedBy: "Supervisor Test",
      status: "approved"
    });

    const regularSummary = await store.getPublicEventDashboard(event.id, regular);
    const publicSummary = await store.getPublicEventDashboard(event.id);

    expect(regularSummary.totals).toMatchObject({
      grossSales: 50000,
      paid: 1,
      tickets: 1
    });
    expect(regularSummary.distributors).toHaveLength(1);
    expect(regularSummary.ticketSamples).toHaveLength(1);
    expect(regularSummary.recentPayments).toHaveLength(1);
    expect(publicSummary.totals).toMatchObject({
      grossSales: 100000,
      paid: 2,
      tickets: 2
    });
  });

  it("builds an operational closeout for supervisors", async () => {
    const store = new EventStoreService();
    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 30,
      name: "Cierre Test",
      status: "active",
      venue: "Auditorio Test"
    });
    const distributor = await store.addDistributor(event.id, {
      name: "Responsable Corte",
      phone: "+57 300 000 0001"
    });
    const tickets = await store.createTicketBatch(event.id, {
      capitalizationAmount: 10000,
      price: 50000,
      quantity: 2
    });
    const firstTicket = tickets[0];
    const secondTicket = tickets[1];

    if (!firstTicket || !secondTicket) {
      throw new Error("tickets were not created");
    }

    await store.assignTicket(secondTicket.id, {
      distributorId: distributor.id,
      recipientName: "Titular Pendiente"
    });
    const sale = await store.registerSale(firstTicket.id, {
      amount: 50000,
      buyerName: "Comprador Corte",
      method: "cash"
    });
    await store.verifyPayment(sale.payment.id, {
      reviewedBy: "Supervisor Corte",
      status: "approved"
    });

    const closeout = await store.getEventCloseout(event.id);

    expect(closeout.event.id).toBe(event.id);
    expect(closeout.payments).toMatchObject({
      approved: 1,
      approvedAmount: 50000,
      cashApprovedAmount: 50000,
      pending: 0
    });
    expect(closeout.entry).toMatchObject({
      allowedTickets: 1,
      remainingAllowedTickets: 1,
      usedTickets: 0
    });
    expect(closeout.distributors[0]).toMatchObject({
      name: "Responsable Corte",
      assignedTickets: 1,
      pendingTickets: 1
    });
    expect(closeout.pendingTickets).toEqual([
      expect.objectContaining({
        code: secondTicket.code,
        recipientName: "Titular Pendiente",
        status: "assigned"
      })
    ]);
  });

  it("filters operational closeout by distributor", async () => {
    const store = new EventStoreService();
    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 30,
      name: "Corte por Responsable",
      status: "active",
      venue: "Auditorio Test"
    });
    const firstDistributor = await store.addDistributor(event.id, {
      name: "Responsable Uno",
      phone: "+57 300 000 0001"
    });
    const secondDistributor = await store.addDistributor(event.id, {
      name: "Responsable Dos",
      phone: "+57 300 000 0002"
    });
    const tickets = await store.createTicketBatch(event.id, {
      capitalizationAmount: 10000,
      price: 50000,
      quantity: 2
    });
    const firstTicket = tickets[0];
    const secondTicket = tickets[1];
    if (!firstTicket || !secondTicket) {
      throw new Error("tickets were not created");
    }

    await store.assignTicket(firstTicket.id, {
      distributorId: firstDistributor.id
    });
    await store.assignTicket(secondTicket.id, {
      distributorId: secondDistributor.id
    });
    const firstSale = await store.registerSale(firstTicket.id, {
      amount: 50000,
      buyerName: "Comprador Uno",
      method: "cash"
    });
    await store.verifyPayment(firstSale.payment.id, {
      reviewedBy: "Supervisor Test",
      status: "approved"
    });
    const secondSale = await store.registerSale(secondTicket.id, {
      amount: 50000,
      buyerName: "Comprador Dos",
      method: "cash"
    });
    await store.verifyPayment(secondSale.payment.id, {
      reviewedBy: "Supervisor Test",
      status: "approved"
    });

    const closeout = await store.getEventCloseout(event.id, {
      distributorId: firstDistributor.id
    });

    expect(closeout.totals).toMatchObject({
      grossSales: 50000,
      paid: 1,
      tickets: 1
    });
    expect(closeout.distributors).toHaveLength(1);
    expect(closeout.distributors[0]).toMatchObject({
      id: firstDistributor.id,
      name: "Responsable Uno"
    });
    expect(closeout.payments).toMatchObject({
      approved: 1,
      approvedAmount: 50000
    });
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

  it("records an audit log when checking in a Prisma ticket", async () => {
    const actor: AuthenticatedUser = {
      email: "porteria@example.com",
      id: "usr_porteria",
      name: "Porteria Real",
      role: "regular"
    };
    const ticket = {
      buyerName: "Comprador DB",
      buyerPhone: "+57 311 000 0000",
      capitalizationAmount: 15000,
      checkedInBy: null,
      code: "VIP-010",
      createdAt: new Date("2026-05-29T00:00:00.000Z"),
      distributorId: "dst_db",
      eventId: "evt_db",
      id: "tck_db",
      notes: null,
      paidAt: new Date("2026-05-29T00:00:00.000Z"),
      paymentMethod: "transfer",
      price: 90000,
      recipientName: null,
      soldAt: new Date("2026-05-29T00:00:00.000Z"),
      status: "paid",
      updatedAt: new Date("2026-05-29T00:00:00.000Z"),
      usedAt: null
    };
    const updatedTicket = {
      ...ticket,
      checkedInBy: "Porteria Real",
      status: "used",
      usedAt: new Date("2026-05-29T01:00:00.000Z")
    };
    const findUnique = jest.fn().mockResolvedValue(ticket);
    const update = jest.fn().mockResolvedValue(updatedTicket);
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      auditLog: { create },
      event: {
        findUnique: jest.fn().mockResolvedValue({ id: "evt_db", status: "active" })
      },
      distributor: {
        findUnique: jest.fn().mockResolvedValue({ userId: "usr_porteria" })
      },
      isConfigured: () => true,
      ticket: { findUnique, update }
    } as unknown as PrismaService;
    const store = new EventStoreService(prisma);

    await expect(
      store.checkInTicket("tck_db", { checkedInBy: "Nombre Falso" }, actor)
    ).resolves.toMatchObject({
      checkedInBy: "Porteria Real",
      status: "used"
    });
    expect(update).toHaveBeenCalledWith({
      data: {
        checkedInBy: "Porteria Real",
        status: "used",
        usedAt: expect.any(Date)
      },
      where: { id: "tck_db" }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ticket.check_in",
        actor: "Porteria Real",
        entityId: "tck_db",
        entityType: "ticket",
        eventId: "evt_db",
        fromStatus: "paid",
        metadata: expect.objectContaining({
          actorId: "usr_porteria",
          actorRole: "regular",
          checkedInBy: "Porteria Real",
          ticketCode: "VIP-010"
        }),
        toStatus: "used"
      })
    });
  });

  it("lists sanitized Prisma audit logs", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        action: "payment.verify",
        actor: "Supervisor Real",
        createdAt: new Date("2026-05-29T01:00:00.000Z"),
        entityId: "pay_db",
        entityType: "payment_evidence",
        eventId: "evt_db",
        fromStatus: "pending",
        id: "aud_db",
        metadata: {
          actorId: "usr_supervisor",
          actorRole: "supervisor",
          nested: { ignored: true },
          reviewedBy: "Supervisor Real",
          tags: ["ignored"]
        },
        toStatus: "approved"
      }
    ]);
    const prisma = {
      auditLog: { findMany },
      isConfigured: () => true
    } as unknown as PrismaService;
    const store = new EventStoreService(prisma);

    await expect(
      store.listAuditLogs({ eventId: "evt_db", take: 500 })
    ).resolves.toEqual([
      expect.objectContaining({
        action: "payment.verify",
        actor: "Supervisor Real",
        createdAt: "2026-05-29T01:00:00.000Z",
        entityId: "pay_db",
        entityType: "payment_evidence",
        eventId: "evt_db",
        fromStatus: "pending",
        id: "aud_db",
        metadata: {
          actorId: "usr_supervisor",
          actorRole: "supervisor",
          reviewedBy: "Supervisor Real"
        },
        toStatus: "approved"
      })
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 200,
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

  it("voids an assigned ticket and records audit metadata", async () => {
    const actor: AuthenticatedUser = {
      email: "supervisor@example.com",
      id: "usr_supervisor",
      name: "Supervisor Real",
      role: "supervisor"
    };
    const ticket = {
      buyerName: null,
      buyerPhone: null,
      capitalizationAmount: 15000,
      checkedInBy: null,
      code: "VIP-099",
      createdAt: new Date("2026-05-29T00:00:00.000Z"),
      distributorId: "dst_db",
      eventId: "evt_db",
      id: "tck_void",
      notes: "Nota existente",
      paidAt: null,
      paymentMethod: null,
      price: 90000,
      recipientName: "Titular",
      soldAt: null,
      status: "assigned",
      updatedAt: new Date("2026-05-29T00:00:00.000Z"),
      usedAt: null
    };
    const updatedTicket = {
      ...ticket,
      notes: "Nota existente\nAnulada: Reporte duplicado",
      status: "void"
    };
    const findUnique = jest.fn().mockResolvedValue(ticket);
    const update = jest.fn().mockResolvedValue(updatedTicket);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const transaction = jest.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    );
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      $transaction: transaction,
      auditLog: { create },
      event: {
        findUnique: jest.fn().mockResolvedValue({ id: "evt_db", status: "active" })
      },
      isConfigured: () => true,
      paymentEvidence: { updateMany },
      ticket: { findUnique, update }
    } as unknown as PrismaService;
    const store = new EventStoreService(prisma);

    await expect(
      store.voidTicket("tck_void", { reason: "Reporte duplicado" }, actor)
    ).resolves.toMatchObject({
      notes: "Nota existente\nAnulada: Reporte duplicado",
      status: "void"
    });
    expect(update).toHaveBeenCalledWith({
      data: {
        notes: "Nota existente\nAnulada: Reporte duplicado",
        status: "void"
      },
      where: { id: "tck_void" }
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ticket.void",
        actor: "Supervisor Real",
        entityId: "tck_void",
        entityType: "ticket",
        eventId: "evt_db",
        fromStatus: "assigned",
        metadata: expect.objectContaining({
          actorId: "usr_supervisor",
          actorRole: "supervisor",
          reason: "Reporte duplicado",
          rejectedPendingPayments: 0,
          ticketCode: "VIP-099"
        }),
        toStatus: "void"
      })
    });
    expect(updateMany).toHaveBeenCalledWith({
      data: {
        reviewedAt: expect.any(Date),
        reviewedBy: "Supervisor Real",
        status: "rejected"
      },
      where: {
        status: "pending",
        ticketId: "tck_void"
      }
    });
  });

  it("rejects pending evidence when voiding a sold ticket", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    const sale = await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "transfer"
    });

    await expect(
      store.voidTicket(
        ticket.id,
        { reason: "Venta cancelada" },
        {
          email: "supervisor@example.com",
          id: "usr_supervisor",
          name: "Supervisor Test",
          role: "supervisor"
        }
      )
    ).resolves.toMatchObject({ status: "void" });

    const payments = await store.listPayments("evt_demo");
    expect(payments.find((payment) => payment.id === sale.payment.id)).toMatchObject({
      notes: "Anulada: Venta cancelada",
      reviewedBy: "Supervisor Test",
      status: "rejected"
    });

    await expect(
      store.verifyPayment(sale.payment.id, {
        reviewedBy: "Supervisor Test",
        status: "approved"
      })
    ).rejects.toThrow("payment evidence has already been reviewed");
  });

  it("requires admin role to void a paid ticket", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }
    const sale = await store.registerSale(ticket.id, {
      amount: 90000,
      buyerName: "Comprador Test",
      method: "cash"
    });
    await store.verifyPayment(sale.payment.id, {
      reviewedBy: "Admin Test",
      status: "approved"
    });

    await expect(
      store.voidTicket(
        ticket.id,
        { reason: "Solicitud de anulacion" },
        {
          email: "supervisor@example.com",
          id: "usr_supervisor",
          name: "Supervisor Test",
          role: "supervisor"
        }
      )
    ).rejects.toThrow("paid tickets can only be voided by admin");
  });

  it("reserves and releases a ticket before sale", async () => {
    const store = new EventStoreService();
    const distributor = await store.addDistributor("evt_demo", {
      name: "Responsable Reserva",
      phone: "+57 310 123 4567"
    });
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    const assigned = await store.assignTicket(ticket.id, {
      distributorId: distributor.id
    });

    const reserved = await store.reserveTicket(assigned.id, {
      notes: "Apartada por llamada",
      recipientName: "Comprador Reserva"
    });

    expect(reserved).toMatchObject({
      distributorName: "Responsable Reserva",
      notes: "Apartada por llamada",
      recipientName: "Comprador Reserva",
      status: "reserved"
    });

    const released = await store.releaseTicketReservation(reserved.id, {
      notes: "Reserva liberada"
    });

    expect(released).toMatchObject({
      distributorName: "Responsable Reserva",
      notes: "Reserva liberada",
      status: "assigned"
    });
    expect(released.recipientName).toBeUndefined();
  });

  it("does not allow releasing tickets that are not reserved", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const ticket = tickets[0];
    if (!ticket) {
      throw new Error("ticket was not created");
    }

    await expect(store.releaseTicketReservation(ticket.id)).rejects.toThrow(
      "only reserved tickets can be released"
    );
  });

  it("blocks operational ticket changes when the event is closed", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 1
    });
    const availableTicket = tickets[0];
    if (!availableTicket) {
      throw new Error("available ticket was not created");
    }

    await store.updateEvent("evt_demo", { status: "closed" });

    await expect(
      store.createTicketBatch("evt_demo", {
        price: 90000,
        quantity: 1
      })
    ).rejects.toThrow("closed events do not accept operational changes");

    await expect(
      store.registerSale(availableTicket.id, {
        amount: 90000,
        buyerName: "Comprador Cerrado",
        method: "cash"
      })
    ).rejects.toThrow("closed events do not accept operational changes");
    await expect(
      store.reserveTicket(availableTicket.id, {
        recipientName: "Reserva Cerrada"
      })
    ).rejects.toThrow("closed events do not accept operational changes");
  });

  it("blocks payment verification and check-in when the event is closed", async () => {
    const store = new EventStoreService();
    const tickets = await store.createTicketBatch("evt_demo", {
      price: 90000,
      quantity: 2
    });
    const pendingTicket = tickets[0];
    const paidTicket = tickets[1];
    if (!pendingTicket || !paidTicket) {
      throw new Error("tickets were not created");
    }

    const pendingSale = await store.registerSale(pendingTicket.id, {
      amount: 90000,
      buyerName: "Comprador Pendiente",
      method: "transfer"
    });
    const paidSale = await store.registerSale(paidTicket.id, {
      amount: 90000,
      buyerName: "Comprador Pagado",
      method: "cash"
    });
    await store.verifyPayment(paidSale.payment.id, {
      reviewedBy: "Admin Test",
      status: "approved"
    });

    await store.updateEvent("evt_demo", { status: "closed" });

    await expect(
      store.verifyPayment(pendingSale.payment.id, {
        reviewedBy: "Supervisor Test",
        status: "approved"
      })
    ).rejects.toThrow("closed events do not accept operational changes");
    await expect(
      store.checkInTicket(paidTicket.id, {
        checkedInBy: "Porteria Test"
      })
    ).rejects.toThrow("closed events do not accept operational changes");
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

  it("limits regular users to tickets assigned to their linked distributor", async () => {
    const store = new EventStoreService();
    const regularUser: AuthenticatedUser = {
      email: "regular@example.com",
      id: "usr_regular",
      name: "Usuario Regular",
      role: "regular"
    };
    const event = await store.createEvent({
      date: "2026-08-01T20:00:00.000Z",
      expectedAttendees: 50,
      name: "Evento Granular",
      status: "active",
      venue: "Auditorio Test"
    });
    const ownDistributor = await store.addDistributor(event.id, {
      name: "Responsable Propio",
      phone: "+57 300 000 0001",
      userId: regularUser.id
    });
    const otherDistributor = await store.addDistributor(event.id, {
      name: "Responsable Otro",
      phone: "+57 300 000 0002",
      userId: "usr_other"
    });
    const tickets = await store.createTicketBatch(event.id, {
      price: 90000,
      quantity: 2
    });
    const ownTicket = tickets[0];
    const otherTicket = tickets[1];
    if (!ownTicket || !otherTicket) {
      throw new Error("tickets were not created");
    }

    await store.assignTicket(ownTicket.id, {
      distributorId: ownDistributor.id
    });
    await store.assignTicket(otherTicket.id, {
      distributorId: otherDistributor.id
    });

    await expect(store.listTickets(event.id, regularUser)).resolves.toMatchObject([
      {
        distributorId: ownDistributor.id,
        id: ownTicket.id
      }
    ]);
    await expect(
      store.lookupTicketByCode(event.id, ownTicket.code.toLowerCase(), regularUser)
    ).resolves.toMatchObject({
      distributorId: ownDistributor.id,
      id: ownTicket.id
    });
    await expect(
      store.lookupTicketByCode(event.id, otherTicket.code, regularUser)
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      store.registerSale(
        otherTicket.id,
        {
          amount: 90000,
          buyerName: "Comprador Otro",
          method: "cash"
        },
        regularUser
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      store.registerSale(
        ownTicket.id,
        {
          amount: 90000,
          buyerName: "Comprador Propio",
          method: "cash"
        },
        regularUser
      )
    ).resolves.toMatchObject({
      ticket: {
        id: ownTicket.id,
        status: "sold"
      }
    });
  });

  it("allows admins to link existing distributors to users", async () => {
    const store = new EventStoreService();
    const admin: AuthenticatedUser = {
      email: "admin@example.com",
      id: "usr_admin",
      name: "Admin",
      role: "admin"
    };
    const distributor = await store.addDistributor("evt_demo", {
      name: "Responsable sin vinculo",
      phone: "+57 300 000 0003"
    });

    await expect(
      store.updateDistributor(
        "evt_demo",
        distributor.id,
        {
          userId: "usr_regular"
        },
        admin
      )
    ).resolves.toMatchObject({
      id: distributor.id,
      userId: "usr_regular"
    });
  });

  it("prevents supervisors from changing distributor user links", async () => {
    const store = new EventStoreService();
    const supervisor: AuthenticatedUser = {
      email: "supervisor@example.com",
      id: "usr_supervisor",
      name: "Supervisor",
      role: "supervisor"
    };
    const distributor = await store.addDistributor("evt_demo", {
      name: "Responsable sin vinculo",
      phone: "+57 300 000 0004"
    });

    await expect(
      store.updateDistributor(
        "evt_demo",
        distributor.id,
        {
          userId: "usr_regular"
        },
        supervisor
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
