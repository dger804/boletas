import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  Distributor,
  EventDashboard,
  EventRecord,
  PaymentEvidence,
  TicketRecord,
  TicketStatus
} from "@boletas/shared";
import type {
  AssignTicketDto,
  CheckInTicketDto,
  CreateDistributorDto,
  CreateEventDto,
  CreateTicketBatchDto,
  RegisterSaleDto,
  VerifyPaymentDto
} from "./dto";

const now = () => new Date().toISOString();

@Injectable()
export class EventStoreService {
  private readonly events: EventRecord[] = [
    {
      id: "evt_demo",
      name: "Lanzamiento Demo",
      date: "2026-07-18T20:00:00.000Z",
      venue: "Auditorio Principal",
      status: "active",
      expectedAttendees: 120,
      createdAt: now()
    }
  ];

  private readonly distributors: Distributor[] = [
    {
      id: "dst_demo_1",
      eventId: "evt_demo",
      name: "Equipo Comercial",
      phone: "+57 300 000 0000",
      email: "ventas@example.com",
      createdAt: now()
    }
  ];

  private readonly tickets: TicketRecord[] = [
    {
      id: "tck_demo_1",
      eventId: "evt_demo",
      code: "VIP-001",
      price: 90000,
      status: "paid",
      distributorId: "dst_demo_1",
      buyerName: "Comprador Demo",
      buyerPhone: "+57 311 000 0000",
      paymentMethod: "transfer",
      soldAt: now(),
      paidAt: now(),
      capitalizationAmount: 15000,
      createdAt: now()
    },
    {
      id: "tck_demo_2",
      eventId: "evt_demo",
      code: "VIP-002",
      price: 90000,
      status: "assigned",
      distributorId: "dst_demo_1",
      capitalizationAmount: 15000,
      createdAt: now()
    }
  ];

  private readonly payments: PaymentEvidence[] = [
    {
      id: "pay_demo_1",
      eventId: "evt_demo",
      ticketId: "tck_demo_1",
      method: "transfer",
      amount: 90000,
      capitalizationAmount: 15000,
      evidenceUrl: "https://example.com/evidencia-demo.png",
      reference: "TRX-DEMO-001",
      status: "approved",
      receivedAt: now(),
      reviewedAt: now(),
      reviewedBy: "Admin Demo"
    }
  ];

  listEvents() {
    return this.events;
  }

  createEvent(dto: CreateEventDto) {
    const event: EventRecord = {
      id: randomUUID(),
      name: dto.name,
      date: dto.date,
      venue: dto.venue,
      status: dto.status ?? "draft",
      expectedAttendees: dto.expectedAttendees ?? 0,
      createdAt: now()
    };

    this.events.push(event);
    return event;
  }

  getEventDashboard(eventId: string): EventDashboard {
    const event = this.findEvent(eventId);
    const eventTickets = this.tickets.filter((ticket) => ticket.eventId === eventId);
    const recentPayments = this.payments
      .filter((payment) => payment.eventId === eventId)
      .slice(-8)
      .reverse();

    const byStatus = (status: TicketStatus) =>
      eventTickets.filter((ticket) => ticket.status === status).length;

    const paidTickets = eventTickets.filter((ticket) =>
      ["paid", "used"].includes(ticket.status)
    );
    const soldTickets = eventTickets.filter((ticket) =>
      ["sold", "paid", "used"].includes(ticket.status)
    );

    return {
      event,
      totals: {
        tickets: eventTickets.length,
        available: byStatus("available"),
        assigned: byStatus("assigned"),
        sold: soldTickets.length,
        paid: paidTickets.length,
        used: byStatus("used"),
        void: byStatus("void"),
        grossSales: paidTickets.reduce((sum, ticket) => sum + ticket.price, 0),
        capitalization: paidTickets.reduce(
          (sum, ticket) => sum + ticket.capitalizationAmount,
          0
        ),
        pendingToCollect: soldTickets
          .filter((ticket) => ticket.status === "sold")
          .reduce((sum, ticket) => sum + ticket.price, 0)
      },
      distributors: this.distributors
        .filter((distributor) => distributor.eventId === eventId)
        .map((distributor) => {
          const assigned = eventTickets.filter(
            (ticket) => ticket.distributorId === distributor.id
          );
          const paid = assigned.filter((ticket) =>
            ["paid", "used"].includes(ticket.status)
          );

          return {
            ...distributor,
            assignedTickets: assigned.length,
            paidTickets: paid.length,
            usedTickets: assigned.filter((ticket) => ticket.status === "used").length,
            grossSales: paid.reduce((sum, ticket) => sum + ticket.price, 0)
          };
        }),
      recentPayments
    };
  }

  addDistributor(eventId: string, dto: CreateDistributorDto) {
    this.findEvent(eventId);

    const distributor: Distributor = {
      id: randomUUID(),
      eventId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      notes: dto.notes,
      createdAt: now()
    };

    this.distributors.push(distributor);
    return distributor;
  }

  createTicketBatch(eventId: string, dto: CreateTicketBatchDto) {
    this.findEvent(eventId);

    if (dto.quantity <= 0) {
      throw new BadRequestException("quantity must be greater than zero");
    }

    const prefix = dto.codePrefix ?? "GEN";
    const existingForEvent = this.tickets.filter((ticket) => ticket.eventId === eventId);
    const start = existingForEvent.length + 1;

    const tickets = Array.from({ length: dto.quantity }, (_, index) => {
      const sequence = String(start + index).padStart(3, "0");
      const ticket: TicketRecord = {
        id: randomUUID(),
        eventId,
        code: `${prefix}-${sequence}`,
        price: dto.price,
        status: "available",
        capitalizationAmount: dto.capitalizationAmount ?? 0,
        createdAt: now()
      };
      return ticket;
    });

    this.tickets.push(...tickets);
    return tickets;
  }

  listTickets(eventId?: string) {
    return eventId
      ? this.tickets.filter((ticket) => ticket.eventId === eventId)
      : this.tickets;
  }

  assignTicket(ticketId: string, dto: AssignTicketDto) {
    const ticket = this.findTicket(ticketId);
    const distributor = this.findDistributor(dto.distributorId);

    if (ticket.eventId !== distributor.eventId) {
      throw new BadRequestException("ticket and distributor belong to different events");
    }

    ticket.distributorId = distributor.id;
    ticket.recipientName = dto.recipientName;
    ticket.notes = dto.notes ?? ticket.notes;
    ticket.status = "assigned";

    return ticket;
  }

  registerSale(ticketId: string, dto: RegisterSaleDto) {
    const ticket = this.findTicket(ticketId);

    if (["paid", "used", "void"].includes(ticket.status)) {
      throw new BadRequestException("ticket cannot be sold in its current status");
    }

    ticket.status = "sold";
    ticket.buyerName = dto.buyerName;
    ticket.buyerPhone = dto.buyerPhone;
    ticket.paymentMethod = dto.method;
    ticket.soldAt = now();
    ticket.capitalizationAmount =
      dto.capitalizationAmount ?? ticket.capitalizationAmount;
    ticket.notes = dto.notes ?? ticket.notes;

    const payment: PaymentEvidence = {
      id: randomUUID(),
      eventId: ticket.eventId,
      ticketId: ticket.id,
      method: dto.method,
      amount: dto.amount,
      capitalizationAmount: ticket.capitalizationAmount,
      evidenceUrl: dto.evidenceUrl,
      reference: dto.reference,
      status: "pending",
      receivedAt: now(),
      notes: dto.notes
    };

    this.payments.push(payment);
    return { ticket, payment };
  }

  checkInTicket(ticketId: string, dto: CheckInTicketDto) {
    const ticket = this.findTicket(ticketId);

    if (ticket.status === "used") {
      return ticket;
    }

    if (ticket.status !== "paid") {
      throw new BadRequestException("only paid tickets can be checked in");
    }

    ticket.status = "used";
    ticket.usedAt = now();
    ticket.checkedInBy = dto.checkedInBy;

    return ticket;
  }

  listPayments(eventId?: string) {
    return eventId
      ? this.payments.filter((payment) => payment.eventId === eventId)
      : this.payments;
  }

  verifyPayment(paymentId: string, dto: VerifyPaymentDto) {
    const payment = this.payments.find((item) => item.id === paymentId);

    if (!payment) {
      throw new NotFoundException("payment not found");
    }

    payment.status = dto.status;
    payment.reviewedAt = now();
    payment.reviewedBy = dto.reviewedBy;
    payment.notes = dto.notes ?? payment.notes;

    const ticket = this.findTicket(payment.ticketId);
    if (dto.status === "approved") {
      ticket.status = "paid";
      ticket.paidAt = now();
    }

    return { payment, ticket };
  }

  private findEvent(eventId: string) {
    const event = this.events.find((item) => item.id === eventId);
    if (!event) {
      throw new NotFoundException("event not found");
    }
    return event;
  }

  private findTicket(ticketId: string) {
    const ticket = this.tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new NotFoundException("ticket not found");
    }
    return ticket;
  }

  private findDistributor(distributorId: string) {
    const distributor = this.distributors.find((item) => item.id === distributorId);
    if (!distributor) {
      throw new NotFoundException("distributor not found");
    }
    return distributor;
  }
}
