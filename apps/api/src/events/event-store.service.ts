import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  Distributor,
  EventDashboard,
  EventRecord,
  PaymentEvidence,
  PublicEventDashboard,
  TicketRecord,
  TicketStatus
} from "@boletas/shared";
import type {
  Distributor as PrismaDistributor,
  Event as PrismaEvent,
  PaymentEvidence as PrismaPaymentEvidence,
  Ticket as PrismaTicket
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
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

const optionalDate = (value?: Date | null) => value?.toISOString();

type PrismaTicketWithDistributor = PrismaTicket & {
  distributor?: Pick<PrismaDistributor, "name"> | null;
};

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

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async listEvents() {
    if (this.prisma?.isConfigured()) {
      const events = await this.prisma.event.findMany({
        orderBy: { createdAt: "asc" }
      });
      return events.map(this.toEventRecord);
    }

    return this.events;
  }

  async createEvent(dto: CreateEventDto) {
    if (this.prisma?.isConfigured()) {
      const event = await this.prisma.event.create({
        data: {
          date: new Date(dto.date),
          expectedAttendees: dto.expectedAttendees ?? 0,
          name: dto.name,
          status: dto.status ?? "draft",
          venue: dto.venue
        }
      });

      return this.toEventRecord(event);
    }

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

  async getEventDashboard(eventId: string): Promise<EventDashboard> {
    if (this.prisma?.isConfigured()) {
      const event = await this.findPrismaEvent(eventId);
      const [eventTickets, distributors, recentPayments] = await Promise.all([
        this.prisma.ticket.findMany({
          orderBy: { createdAt: "asc" },
          where: { eventId }
        }),
        this.prisma.distributor.findMany({
          orderBy: { createdAt: "asc" },
          where: { eventId }
        }),
        this.prisma.paymentEvidence.findMany({
          orderBy: { receivedAt: "desc" },
          take: 8,
          where: { eventId }
        })
      ]);

      return this.buildDashboard(
        this.toEventRecord(event),
        eventTickets.map(this.toTicketRecord),
        distributors.map(this.toDistributorRecord),
        recentPayments.map(this.toPaymentEvidence)
      );
    }

    const event = this.findEvent(eventId);
    const eventTickets = this.tickets.filter((ticket) => ticket.eventId === eventId);
    const recentPayments = this.payments
      .filter((payment) => payment.eventId === eventId)
      .slice(-8)
      .reverse();

    return this.buildDashboard(
      event,
      eventTickets,
      this.distributors.filter((distributor) => distributor.eventId === eventId),
      recentPayments
    );
  }

  async getPublicEventDashboard(eventId: string): Promise<PublicEventDashboard> {
    const dashboard = await this.getEventDashboard(eventId);
    const tickets = await this.listTickets(eventId);
    const distributorLabels = new Map(
      dashboard.distributors.map((distributor, index) => [
        distributor.id,
        `Responsable ${index + 1}`
      ])
    );

    return {
      event: {
        date: dashboard.event.date,
        expectedAttendees: dashboard.event.expectedAttendees,
        name: dashboard.event.name,
        venue: dashboard.event.venue
      },
      totals: dashboard.totals,
      distributors: dashboard.distributors.map((distributor, index) => ({
        assignedTickets: distributor.assignedTickets,
        grossSales: distributor.grossSales,
        label: `Responsable ${index + 1}`,
        paidTickets: distributor.paidTickets,
        usedTickets: distributor.usedTickets
      })),
      ticketSamples: tickets.slice(0, 5).map((ticket, index) => ({
        amount: ticket.price,
        detail: this.toPublicTicketDetail(ticket.status),
        distributorLabel: ticket.distributorId
          ? distributorLabels.get(ticket.distributorId) ?? "Responsable asignado"
          : "Sin asignar",
        reference: `Boleta ${index + 1}`,
        status: ticket.status
      })),
      recentPayments: dashboard.recentPayments.slice(0, 5).map((payment, index) => ({
        amount: payment.amount,
        label: `Evidencia ${index + 1}`,
        method: payment.method,
        status: payment.status
      }))
    };
  }

  async addDistributor(eventId: string, dto: CreateDistributorDto) {
    if (this.prisma?.isConfigured()) {
      await this.findPrismaEvent(eventId);

      const distributor = await this.prisma.distributor.create({
        data: {
          email: dto.email,
          eventId,
          name: dto.name,
          notes: dto.notes,
          phone: dto.phone
        }
      });

      return this.toDistributorRecord(distributor);
    }

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

  async createTicketBatch(eventId: string, dto: CreateTicketBatchDto) {
    if (this.prisma?.isConfigured()) {
      await this.findPrismaEvent(eventId);

      if (dto.quantity <= 0) {
        throw new BadRequestException("quantity must be greater than zero");
      }

      const prefix = dto.codePrefix ?? "GEN";
      const existingForEvent = await this.prisma.ticket.count({
        where: { eventId }
      });
      const start = existingForEvent + 1;

      const createTicketOperations = Array.from({ length: dto.quantity }, (_, index) => {
        const sequence = String(start + index).padStart(3, "0");

        return this.prisma!.ticket.create({
          data: {
            capitalizationAmount: dto.capitalizationAmount ?? 0,
            code: `${prefix}-${sequence}`,
            eventId,
            price: dto.price,
            status: "available"
          }
        });
      });

      const tickets = await this.prisma.$transaction(createTicketOperations);
      return tickets.map(this.toTicketRecord);
    }

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

  async listTickets(eventId?: string) {
    if (this.prisma?.isConfigured()) {
      const tickets = await this.prisma.ticket.findMany({
        include: {
          distributor: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: "asc" },
        where: eventId ? { eventId } : undefined
      });
      return tickets.map(this.toTicketRecord);
    }

    const tickets = eventId
      ? this.tickets.filter((ticket) => ticket.eventId === eventId)
      : this.tickets;
    return tickets.map((ticket) => this.withDistributorName(ticket));
  }

  async assignTicket(ticketId: string, dto: AssignTicketDto) {
    if (this.prisma?.isConfigured()) {
      const [ticket, distributor] = await Promise.all([
        this.findPrismaTicket(ticketId),
        this.findPrismaDistributor(dto.distributorId)
      ]);

      if (ticket.eventId !== distributor.eventId) {
        throw new BadRequestException("ticket and distributor belong to different events");
      }

      const updated = await this.prisma.ticket.update({
        data: {
          distributorId: distributor.id,
          notes: dto.notes ?? ticket.notes,
          recipientName: dto.recipientName,
          status: "assigned"
        },
        where: { id: ticket.id }
      });

      return this.toTicketRecord(updated);
    }

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

  async registerSale(ticketId: string, dto: RegisterSaleDto) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      if (["paid", "sold", "used", "void"].includes(ticket.status)) {
        throw new BadRequestException("ticket cannot be sold in its current status");
      }

      const capitalizationAmount =
        dto.capitalizationAmount ?? ticket.capitalizationAmount;
      const soldAt = new Date();

      const [updatedTicket, payment] = await this.prisma.$transaction([
        this.prisma.ticket.update({
          data: {
            buyerName: dto.buyerName,
            buyerPhone: dto.buyerPhone,
            capitalizationAmount,
            notes: dto.notes ?? ticket.notes,
            paymentMethod: dto.method,
            soldAt,
            status: "sold"
          },
          where: { id: ticket.id }
        }),
        this.prisma.paymentEvidence.create({
          data: {
            amount: dto.amount,
            capitalizationAmount,
            evidenceUrl: dto.evidenceUrl,
            eventId: ticket.eventId,
            method: dto.method,
            notes: dto.notes,
            reference: dto.reference,
            status: "pending",
            ticketId: ticket.id
          }
        })
      ]);

      return {
        payment: this.toPaymentEvidence(payment),
        ticket: this.toTicketRecord(updatedTicket)
      };
    }

    const ticket = this.findTicket(ticketId);

    if (["paid", "sold", "used", "void"].includes(ticket.status)) {
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

  async checkInTicket(ticketId: string, dto: CheckInTicketDto) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      if (ticket.status === "used") {
        return this.toTicketRecord(ticket);
      }

      if (ticket.status !== "paid") {
        throw new BadRequestException("only paid tickets can be checked in");
      }

      const updated = await this.prisma.ticket.update({
        data: {
          checkedInBy: dto.checkedInBy,
          status: "used",
          usedAt: new Date()
        },
        where: { id: ticket.id }
      });

      return this.toTicketRecord(updated);
    }

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

  async listPayments(eventId?: string) {
    if (this.prisma?.isConfigured()) {
      const payments = await this.prisma.paymentEvidence.findMany({
        orderBy: { receivedAt: "desc" },
        where: eventId ? { eventId } : undefined
      });
      return payments.map(this.toPaymentEvidence);
    }

    return eventId
      ? this.payments.filter((payment) => payment.eventId === eventId)
      : this.payments;
  }

  async verifyPayment(paymentId: string, dto: VerifyPaymentDto) {
    if (this.prisma?.isConfigured()) {
      const payment = await this.prisma.paymentEvidence.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new NotFoundException("payment not found");
      }

      const reviewedAt = new Date();
      const verified = await this.prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.paymentEvidence.update({
          data: {
            notes: dto.notes ?? payment.notes,
            reviewedAt,
            reviewedBy: dto.reviewedBy,
            status: dto.status
          },
          where: { id: payment.id }
        });

        const ticket =
          dto.status === "approved"
            ? await tx.ticket.update({
              data: {
                paidAt: reviewedAt,
                status: "paid"
              },
              where: { id: payment.ticketId }
            })
            : await tx.ticket.findUniqueOrThrow({
              where: { id: payment.ticketId }
            });

        return { payment: updatedPayment, ticket };
      });

      return {
        payment: this.toPaymentEvidence(verified.payment),
        ticket: this.toTicketRecord(verified.ticket)
      };
    }

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

  private buildDashboard(
    event: EventRecord,
    eventTickets: TicketRecord[],
    distributors: Distributor[],
    recentPayments: PaymentEvidence[]
  ): EventDashboard {
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
      distributors: distributors.map((distributor) => {
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

  private findEvent(eventId: string) {
    const event = this.events.find((item) => item.id === eventId);
    if (!event) {
      throw new NotFoundException("event not found");
    }
    return event;
  }

  private toPublicTicketDetail(status: TicketStatus) {
    const details: Record<TicketStatus, string> = {
      assigned: "Asignada a responsable",
      available: "Disponible para asignar",
      paid: "Pago validado",
      reserved: "Reservada",
      sold: "Pago pendiente de validar",
      used: "Ingreso registrado",
      void: "Bloqueada"
    };

    return details[status];
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

  private async findPrismaEvent(eventId: string) {
    const event = await this.prisma!.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundException("event not found");
    }

    return event;
  }

  private async findPrismaTicket(ticketId: string) {
    const ticket = await this.prisma!.ticket.findUnique({
      where: { id: ticketId }
    });

    if (!ticket) {
      throw new NotFoundException("ticket not found");
    }

    return ticket;
  }

  private async findPrismaDistributor(distributorId: string) {
    const distributor = await this.prisma!.distributor.findUnique({
      where: { id: distributorId }
    });

    if (!distributor) {
      throw new NotFoundException("distributor not found");
    }

    return distributor;
  }

  private toEventRecord(event: PrismaEvent): EventRecord {
    return {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      venue: event.venue,
      status: event.status,
      expectedAttendees: event.expectedAttendees,
      createdAt: event.createdAt.toISOString()
    };
  }

  private toDistributorRecord(distributor: PrismaDistributor): Distributor {
    return {
      id: distributor.id,
      eventId: distributor.eventId,
      name: distributor.name,
      phone: distributor.phone,
      email: distributor.email ?? undefined,
      notes: distributor.notes ?? undefined,
      createdAt: distributor.createdAt.toISOString()
    };
  }

  private withDistributorName(ticket: TicketRecord): TicketRecord {
    const distributorName = ticket.distributorId
      ? this.distributors.find((distributor) => distributor.id === ticket.distributorId)?.name
      : undefined;

    return {
      ...ticket,
      distributorName
    };
  }

  private toTicketRecord(ticket: PrismaTicketWithDistributor): TicketRecord {
    return {
      id: ticket.id,
      eventId: ticket.eventId,
      code: ticket.code,
      price: ticket.price,
      status: ticket.status,
      distributorId: ticket.distributorId ?? undefined,
      distributorName: ticket.distributor?.name,
      recipientName: ticket.recipientName ?? undefined,
      buyerName: ticket.buyerName ?? undefined,
      buyerPhone: ticket.buyerPhone ?? undefined,
      paymentMethod: ticket.paymentMethod ?? undefined,
      soldAt: optionalDate(ticket.soldAt),
      paidAt: optionalDate(ticket.paidAt),
      usedAt: optionalDate(ticket.usedAt),
      checkedInBy: ticket.checkedInBy ?? undefined,
      capitalizationAmount: ticket.capitalizationAmount,
      notes: ticket.notes ?? undefined,
      createdAt: ticket.createdAt.toISOString()
    };
  }

  private toPaymentEvidence(payment: PrismaPaymentEvidence): PaymentEvidence {
    return {
      id: payment.id,
      eventId: payment.eventId,
      ticketId: payment.ticketId,
      method: payment.method,
      amount: payment.amount,
      capitalizationAmount: payment.capitalizationAmount,
      evidenceUrl: payment.evidenceUrl ?? undefined,
      reference: payment.reference ?? undefined,
      status: payment.status,
      receivedAt: payment.receivedAt.toISOString(),
      reviewedAt: optionalDate(payment.reviewedAt),
      reviewedBy: payment.reviewedBy ?? undefined,
      notes: payment.notes ?? undefined
    };
  }
}
