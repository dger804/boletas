import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  AuthenticatedUser,
  AuditLogRecord,
  Distributor,
  EventCloseout,
  EventDashboard,
  EventRecord,
  EventStatus,
  PaymentEvidence,
  PublicEventDashboard,
  TicketRecord,
  TicketStatus
} from "@boletas/shared";
import type {
  AuditLog as PrismaAuditLog,
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
  ReleaseTicketReservationDto,
  RegisterSaleDto,
  ReserveTicketDto,
  UpdateEventDto,
  VoidTicketDto,
  VerifyPaymentDto
} from "./dto";

const now = () => new Date().toISOString();

const optionalDate = (value?: Date | null) => value?.toISOString();

type PrismaTicketWithDistributor = PrismaTicket & {
  distributor?: Pick<PrismaDistributor, "email" | "name" | "notes" | "phone"> | null;
};

type PrismaPaymentWithTicket = PrismaPaymentEvidence & {
  ticket?: Pick<PrismaTicket, "buyerName" | "buyerPhone" | "code" | "status"> | null;
};

type AuditMetadata = Record<string, string | number | boolean | null>;

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
      userId: undefined,
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

  async createEvent(dto: CreateEventDto, actor?: AuthenticatedUser) {
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

      await this.createAuditLog({
        action: "event.create",
        actor,
        entityId: event.id,
        entityType: "event",
        eventId: event.id,
        metadata: {
          status: event.status
        },
        toStatus: event.status
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

  async updateEvent(
    eventId: string,
    dto: UpdateEventDto,
    actor?: AuthenticatedUser
  ) {
    if (!this.hasEventUpdate(dto)) {
      throw new BadRequestException("event update requires at least one field");
    }

    if (this.prisma?.isConfigured()) {
      const existing = await this.findPrismaEvent(eventId);

      const event = await this.prisma.event.update({
        data: {
          ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
          ...(dto.expectedAttendees !== undefined
            ? { expectedAttendees: dto.expectedAttendees }
            : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.venue !== undefined ? { venue: dto.venue } : {})
        },
        where: { id: eventId }
      });

      await this.createAuditLog({
        action: "event.update",
        actor,
        entityId: event.id,
        entityType: "event",
        eventId: event.id,
        fromStatus: existing.status,
        metadata: {
          fieldsChanged: this.changedEventFields(dto).join(",")
        },
        toStatus: event.status
      });

      return this.toEventRecord(event);
    }

    const event = this.findEvent(eventId);

    if (dto.date !== undefined) {
      event.date = dto.date;
    }
    if (dto.expectedAttendees !== undefined) {
      event.expectedAttendees = dto.expectedAttendees;
    }
    if (dto.name !== undefined) {
      event.name = dto.name;
    }
    if (dto.status !== undefined) {
      event.status = dto.status;
    }
    if (dto.venue !== undefined) {
      event.venue = dto.venue;
    }

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

  async getEventCloseout(eventId: string): Promise<EventCloseout> {
    const [dashboard, tickets, payments] = await Promise.all([
      this.getEventDashboard(eventId),
      this.listTickets(eventId),
      this.listPayments(eventId)
    ]);
    const approvedPayments = payments.filter((payment) => payment.status === "approved");
    const pendingPayments = payments.filter((payment) => payment.status === "pending");
    const rejectedPayments = payments.filter((payment) => payment.status === "rejected");
    const payableStatuses: TicketStatus[] = ["paid", "used"];
    const soldStatuses: TicketStatus[] = ["sold", "paid", "used"];
    const pendingTicketStatuses: TicketStatus[] = ["assigned", "reserved", "sold"];
    const sum = <T>(items: T[], selector: (item: T) => number) =>
      items.reduce((total, item) => total + selector(item), 0);

    return {
      event: dashboard.event,
      generatedAt: now(),
      totals: dashboard.totals,
      payments: {
        pending: pendingPayments.length,
        approved: approvedPayments.length,
        rejected: rejectedPayments.length,
        pendingAmount: sum(pendingPayments, (payment) => payment.amount),
        approvedAmount: sum(approvedPayments, (payment) => payment.amount),
        cashApprovedAmount: sum(
          approvedPayments.filter((payment) => payment.method === "cash"),
          (payment) => payment.amount
        ),
        transferApprovedAmount: sum(
          approvedPayments.filter((payment) => payment.method === "transfer"),
          (payment) => payment.amount
        )
      },
      entry: {
        allowedTickets: dashboard.totals.paid,
        usedTickets: dashboard.totals.used,
        remainingAllowedTickets: Math.max(
          dashboard.totals.paid - dashboard.totals.used,
          0
        ),
        blockedTickets: dashboard.totals.void
      },
      distributors: dashboard.distributors.map((distributor) => {
        const assignedTickets = tickets.filter(
          (ticket) => ticket.distributorId === distributor.id
        );
        const soldTickets = assignedTickets.filter((ticket) =>
          soldStatuses.includes(ticket.status)
        );
        const paidTickets = assignedTickets.filter((ticket) =>
          payableStatuses.includes(ticket.status)
        );

        return {
          ...distributor,
          soldTickets: soldTickets.length,
          pendingTickets: assignedTickets.filter((ticket) =>
            pendingTicketStatuses.includes(ticket.status)
          ).length,
          capitalization: sum(
            paidTickets,
            (ticket) => ticket.capitalizationAmount
          )
        };
      }),
      pendingTickets: tickets
        .filter((ticket) => pendingTicketStatuses.includes(ticket.status))
        .map((ticket) => ({
          id: ticket.id,
          code: ticket.code,
          status: ticket.status,
          distributorName: ticket.distributorName,
          recipientName: ticket.recipientName,
          buyerName: ticket.buyerName,
          price: ticket.price,
          capitalizationAmount: ticket.capitalizationAmount
        })),
      pendingPayments: pendingPayments.map((payment) => ({
        id: payment.id,
        ticketId: payment.ticketId,
        ticketCode: payment.ticketCode,
        method: payment.method,
        amount: payment.amount,
        capitalizationAmount: payment.capitalizationAmount,
        status: payment.status,
        receivedAt: payment.receivedAt
      }))
    };
  }

  async addDistributor(
    eventId: string,
    dto: CreateDistributorDto,
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const event = await this.findPrismaEvent(eventId);

      this.assertEventAcceptsOperations(event.status);
      await this.assertPrismaUserCanOwnDistributor(dto.userId);

      const distributor = await this.prisma.distributor.create({
        data: {
          email: dto.email,
          eventId,
          name: dto.name,
          notes: dto.notes,
          phone: dto.phone,
          userId: dto.userId
        }
      });

      await this.createAuditLog({
        action: "distributor.create",
        actor,
        entityId: distributor.id,
        entityType: "distributor",
        eventId,
        metadata: {
          distributorName: distributor.name,
          userId: distributor.userId
        }
      });

      return this.toDistributorRecord(distributor);
    }

    const event = this.findEvent(eventId);

    this.assertEventAcceptsOperations(event.status);

    const distributor: Distributor = {
      id: randomUUID(),
      eventId,
      userId: dto.userId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      notes: dto.notes,
      createdAt: now()
    };

    this.distributors.push(distributor);
    return distributor;
  }

  async listDistributors(eventId: string) {
    if (this.prisma?.isConfigured()) {
      await this.findPrismaEvent(eventId);

      const distributors = await this.prisma.distributor.findMany({
        orderBy: { createdAt: "asc" },
        where: { eventId }
      });

      return distributors.map(this.toDistributorRecord);
    }

    this.findEvent(eventId);
    return this.distributors.filter((distributor) => distributor.eventId === eventId);
  }

  async createTicketBatch(
    eventId: string,
    dto: CreateTicketBatchDto,
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const event = await this.findPrismaEvent(eventId);

      this.assertEventAcceptsOperations(event.status);

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

      await this.createAuditLog({
        action: "ticket.batch_create",
        actor,
        entityId: eventId,
        entityType: "event",
        eventId,
        metadata: {
          codePrefix: prefix,
          price: dto.price,
          quantity: dto.quantity
        }
      });

      return tickets.map(this.toTicketRecord);
    }

    const event = this.findEvent(eventId);

    this.assertEventAcceptsOperations(event.status);

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

  async listTickets(eventId?: string, actor?: AuthenticatedUser) {
    if (this.prisma?.isConfigured()) {
      const tickets = await this.prisma.ticket.findMany({
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
        where: {
          ...(eventId ? { eventId } : {}),
          ...(this.isRegularActor(actor)
            ? { distributor: { is: { userId: actor.id } } }
            : {})
        }
      });
      return tickets.map(this.toTicketRecord);
    }

    const tickets = eventId
      ? this.tickets.filter((ticket) => ticket.eventId === eventId)
      : this.tickets;
    return tickets
      .filter((ticket) => this.actorCanAccessTicket(ticket, actor))
      .map((ticket) => this.withDistributorContact(ticket));
  }

  async assignTicket(
    ticketId: string,
    dto: AssignTicketDto,
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const [ticket, distributor] = await Promise.all([
        this.findPrismaTicket(ticketId),
        this.findPrismaDistributor(dto.distributorId)
      ]);

      this.assertTicketCanBeAssigned(ticket.status);

      if (ticket.eventId !== distributor.eventId) {
        throw new BadRequestException("ticket and distributor belong to different events");
      }

      const event = await this.findPrismaEvent(ticket.eventId);

      this.assertEventAcceptsOperations(event.status);

      const updated = await this.prisma.ticket.update({
        data: {
          distributorId: distributor.id,
          notes: dto.notes ?? ticket.notes,
          recipientName: dto.recipientName,
          status: "assigned"
        },
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
        where: { id: ticket.id }
      });

      await this.createAuditLog({
        action: "ticket.assign",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          distributorId: distributor.id,
          ticketCode: ticket.code
        },
        toStatus: updated.status
      });

      return this.toTicketRecord(updated);
    }

    const ticket = this.findTicket(ticketId);
    const distributor = this.findDistributor(dto.distributorId);

    this.assertTicketCanBeAssigned(ticket.status);

    if (ticket.eventId !== distributor.eventId) {
      throw new BadRequestException("ticket and distributor belong to different events");
    }

    const event = this.findEvent(ticket.eventId);

    this.assertEventAcceptsOperations(event.status);

    ticket.distributorId = distributor.id;
    ticket.recipientName = dto.recipientName;
    ticket.notes = dto.notes ?? ticket.notes;
    ticket.status = "assigned";

    return this.withDistributorContact(ticket);
  }

  async reserveTicket(
    ticketId: string,
    dto: ReserveTicketDto = {},
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      this.assertTicketCanBeReserved(ticket.status);
      await this.assertActorCanAccessPrismaTicket(ticket, actor);
      await this.assertPrismaTicketEventAcceptsOperations(ticket.eventId);

      const updated = await this.prisma.ticket.update({
        data: {
          notes: dto.notes ?? ticket.notes,
          recipientName: dto.recipientName ?? ticket.recipientName,
          status: "reserved"
        },
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
        where: { id: ticket.id }
      });

      await this.createAuditLog({
        action: "ticket.reserve",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          recipientName: updated.recipientName,
          ticketCode: ticket.code
        },
        toStatus: updated.status
      });

      return this.toTicketRecord(updated);
    }

    const ticket = this.findTicket(ticketId);

    this.assertTicketCanBeReserved(ticket.status);
    this.assertActorCanAccessTicket(ticket, actor);
    this.assertTicketEventAcceptsOperations(ticket.eventId);

    ticket.status = "reserved";
    ticket.recipientName = dto.recipientName ?? ticket.recipientName;
    ticket.notes = dto.notes ?? ticket.notes;

    return this.withDistributorContact(ticket);
  }

  async releaseTicketReservation(
    ticketId: string,
    dto: ReleaseTicketReservationDto = {},
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      this.assertTicketCanReleaseReservation(ticket.status);
      await this.assertActorCanAccessPrismaTicket(ticket, actor);
      await this.assertPrismaTicketEventAcceptsOperations(ticket.eventId);

      const nextStatus = ticket.distributorId ? "assigned" : "available";
      const updated = await this.prisma.ticket.update({
        data: {
          notes: dto.notes ?? ticket.notes,
          recipientName: null,
          status: nextStatus
        },
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
        where: { id: ticket.id }
      });

      await this.createAuditLog({
        action: "ticket.release_reservation",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          hasDistributor: Boolean(ticket.distributorId),
          ticketCode: ticket.code
        },
        toStatus: updated.status
      });

      return this.toTicketRecord(updated);
    }

    const ticket = this.findTicket(ticketId);

    this.assertTicketCanReleaseReservation(ticket.status);
    this.assertActorCanAccessTicket(ticket, actor);
    this.assertTicketEventAcceptsOperations(ticket.eventId);

    ticket.status = ticket.distributorId ? "assigned" : "available";
    ticket.recipientName = undefined;
    ticket.notes = dto.notes ?? ticket.notes;

    return this.withDistributorContact(ticket);
  }

  async registerSale(
    ticketId: string,
    dto: RegisterSaleDto,
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      if (["paid", "sold", "used", "void"].includes(ticket.status)) {
        throw new BadRequestException("ticket cannot be sold in its current status");
      }

      await this.assertActorCanAccessPrismaTicket(ticket, actor);
      await this.assertPrismaTicketEventAcceptsOperations(ticket.eventId);

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

      await this.createAuditLog({
        action: "ticket.sale",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          amount: dto.amount,
          method: dto.method,
          paymentId: payment.id,
          ticketCode: ticket.code
        },
        toStatus: updatedTicket.status
      });

      return {
        payment: this.toPaymentEvidence(payment),
        ticket: this.toTicketRecord(updatedTicket)
      };
    }

    const ticket = this.findTicket(ticketId);

    if (["paid", "sold", "used", "void"].includes(ticket.status)) {
      throw new BadRequestException("ticket cannot be sold in its current status");
    }

    this.assertActorCanAccessTicket(ticket, actor);
    this.assertTicketEventAcceptsOperations(ticket.eventId);

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

  async voidTicket(
    ticketId: string,
    dto: VoidTicketDto = {},
    actor?: AuthenticatedUser
  ) {
    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      this.assertTicketCanBeVoided(ticket.status, actor);

      if (ticket.status === "void") {
        return this.toTicketRecord(ticket);
      }

      await this.assertPrismaTicketEventAcceptsOperations(ticket.eventId);

      const notes = this.appendVoidReason(ticket.notes, dto.reason);
      const reviewedAt = new Date();
      const [updated, rejectedPendingPayments] = await this.prisma.$transaction([
        this.prisma.ticket.update({
          data: {
            notes,
            status: "void"
          },
          where: { id: ticket.id }
        }),
        this.prisma.paymentEvidence.updateMany({
          data: {
            reviewedAt,
            reviewedBy: this.actorName(actor),
            status: "rejected"
          },
          where: {
            status: "pending",
            ticketId: ticket.id
          }
        })
      ]);

      await this.createAuditLog({
        action: "ticket.void",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          reason: dto.reason?.trim() || null,
          rejectedPendingPayments: rejectedPendingPayments.count,
          ticketCode: ticket.code
        },
        toStatus: updated.status
      });

      return this.toTicketRecord(updated);
    }

    const ticket = this.findTicket(ticketId);

    this.assertTicketCanBeVoided(ticket.status, actor);

    if (ticket.status === "void") {
      return ticket;
    }

    this.assertTicketEventAcceptsOperations(ticket.eventId);

    ticket.status = "void";
    ticket.notes = this.appendVoidReason(ticket.notes, dto.reason) ?? ticket.notes;
    const reviewedAt = now();
    const rejectedPendingPayments = this.payments.filter(
      (payment) => payment.ticketId === ticket.id && payment.status === "pending"
    );

    rejectedPendingPayments.forEach((payment) => {
      payment.status = "rejected";
      payment.reviewedAt = reviewedAt;
      payment.reviewedBy = this.actorName(actor);
      payment.notes = this.appendVoidReason(payment.notes, dto.reason) ?? payment.notes;
    });

    return ticket;
  }

  async checkInTicket(
    ticketId: string,
    dto: CheckInTicketDto,
    actor?: AuthenticatedUser
  ) {
    const checkedInBy = this.actorName(actor, dto.checkedInBy);

    if (this.prisma?.isConfigured()) {
      const ticket = await this.findPrismaTicket(ticketId);

      if (ticket.status === "used") {
        return this.toTicketRecord(ticket);
      }

      await this.assertActorCanAccessPrismaTicket(ticket, actor);
      await this.assertPrismaTicketEventAcceptsOperations(ticket.eventId);

      if (ticket.status !== "paid") {
        throw new BadRequestException("only paid tickets can be checked in");
      }

      const updated = await this.prisma.ticket.update({
        data: {
          checkedInBy,
          status: "used",
          usedAt: new Date()
        },
        where: { id: ticket.id }
      });

      await this.createAuditLog({
        action: "ticket.check_in",
        actor,
        entityId: ticket.id,
        entityType: "ticket",
        eventId: ticket.eventId,
        fromStatus: ticket.status,
        metadata: {
          checkedInBy,
          ticketCode: ticket.code
        },
        toStatus: updated.status
      });

      return this.toTicketRecord(updated);
    }

    const ticket = this.findTicket(ticketId);

    if (ticket.status === "used") {
      return ticket;
    }

    this.assertActorCanAccessTicket(ticket, actor);
    this.assertTicketEventAcceptsOperations(ticket.eventId);

    if (ticket.status !== "paid") {
      throw new BadRequestException("only paid tickets can be checked in");
    }

    ticket.status = "used";
    ticket.usedAt = now();
    ticket.checkedInBy = checkedInBy;

    return ticket;
  }

  async listPayments(eventId?: string) {
    if (this.prisma?.isConfigured()) {
      const payments = await this.prisma.paymentEvidence.findMany({
        include: {
          ticket: {
            select: {
              buyerName: true,
              buyerPhone: true,
              code: true,
              status: true
            }
          }
        },
        orderBy: { receivedAt: "desc" },
        where: eventId ? { eventId } : undefined
      });
      return payments.map(this.toPaymentEvidence);
    }

    const payments = eventId
      ? this.payments.filter((payment) => payment.eventId === eventId)
      : this.payments;

    return payments.map((payment) => this.withPaymentTicketSummary(payment));
  }

  async listAuditLogs(filters: { eventId?: string; take?: number } = {}) {
    if (!this.prisma?.isConfigured()) {
      return [] satisfies AuditLogRecord[];
    }

    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: this.auditLogTake(filters.take),
      where: filters.eventId ? { eventId: filters.eventId } : undefined
    });

    return logs.map((log) => this.toAuditLogRecord(log));
  }

  async verifyPayment(
    paymentId: string,
    dto: VerifyPaymentDto,
    actor?: AuthenticatedUser
  ) {
    const reviewedBy = this.actorName(actor, dto.reviewedBy);

    if (this.prisma?.isConfigured()) {
      const payment = await this.prisma.paymentEvidence.findUnique({
        include: {
          ticket: {
            select: {
              status: true
            }
          }
        },
        where: { id: paymentId }
      });

      if (!payment) {
        throw new NotFoundException("payment not found");
      }

      this.assertPaymentCanBeReviewed(payment.status, payment.ticket.status, dto.status);
      await this.assertPrismaTicketEventAcceptsOperations(payment.eventId);

      const reviewedAt = new Date();
      const verified = await this.prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.paymentEvidence.update({
          data: {
            notes: dto.notes ?? payment.notes,
            reviewedAt,
            reviewedBy,
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

      await this.createAuditLog({
        action: "payment.verify",
        actor,
        entityId: payment.id,
        entityType: "payment_evidence",
        eventId: payment.eventId,
        fromStatus: payment.status,
        metadata: {
          reviewedBy,
          ticketId: payment.ticketId
        },
        toStatus: verified.payment.status
      });

      return {
        payment: this.toPaymentEvidence({
          ...verified.payment,
          ticket: verified.ticket
        }),
        ticket: this.toTicketRecord(verified.ticket)
      };
    }

    const payment = this.payments.find((item) => item.id === paymentId);

    if (!payment) {
      throw new NotFoundException("payment not found");
    }

    const ticket = this.findTicket(payment.ticketId);

    this.assertPaymentCanBeReviewed(payment.status, ticket.status, dto.status);
    this.assertTicketEventAcceptsOperations(payment.eventId);

    payment.status = dto.status;
    payment.reviewedAt = now();
    payment.reviewedBy = reviewedBy;
    payment.notes = dto.notes ?? payment.notes;

    if (dto.status === "approved") {
      ticket.status = "paid";
      ticket.paidAt = now();
    }

    return { payment: this.withPaymentTicketSummary(payment), ticket };
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

  private async createAuditLog(input: {
    action: string;
    actor?: AuthenticatedUser;
    entityId: string;
    entityType: string;
    eventId?: string;
    fromStatus?: string;
    metadata?: AuditMetadata;
    toStatus?: string;
  }) {
    if (!this.prisma?.isConfigured()) {
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actor: this.actorName(input.actor),
        entityId: input.entityId,
        entityType: input.entityType,
        eventId: input.eventId,
        fromStatus: input.fromStatus,
        metadata: this.auditMetadata(input.actor, input.metadata),
        toStatus: input.toStatus
      }
    });
  }

  private actorName(actor?: AuthenticatedUser, fallback?: string) {
    return actor?.name ?? fallback ?? "Sistema";
  }

  private auditMetadata(actor?: AuthenticatedUser, metadata: AuditMetadata = {}) {
    const auditMetadata: AuditMetadata = { ...metadata };

    if (actor) {
      auditMetadata.actorId = actor.id;
      auditMetadata.actorRole = actor.role;
    }

    return Object.keys(auditMetadata).length > 0 ? auditMetadata : undefined;
  }

  private auditLogTake(value?: number) {
    const numericValue =
      typeof value === "number" && Number.isFinite(value) ? value : 100;

    return Math.min(Math.max(Math.trunc(numericValue), 1), 200);
  }

  private findEvent(eventId: string) {
    const event = this.events.find((item) => item.id === eventId);
    if (!event) {
      throw new NotFoundException("event not found");
    }
    return event;
  }

  private hasEventUpdate(dto: UpdateEventDto) {
    return (
      dto.date !== undefined ||
      dto.expectedAttendees !== undefined ||
      dto.name !== undefined ||
      dto.status !== undefined ||
      dto.venue !== undefined
    );
  }

  private changedEventFields(dto: UpdateEventDto) {
    return ["date", "expectedAttendees", "name", "status", "venue"].filter(
      (field) => dto[field as keyof UpdateEventDto] !== undefined
    );
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

  private assertEventAcceptsOperations(status: EventStatus) {
    if (status === "closed") {
      throw new BadRequestException("closed events do not accept operational changes");
    }
  }

  private assertTicketEventAcceptsOperations(eventId: string) {
    const event = this.findEvent(eventId);

    this.assertEventAcceptsOperations(event.status);
  }

  private async assertPrismaTicketEventAcceptsOperations(eventId: string) {
    const event = await this.findPrismaEvent(eventId);

    this.assertEventAcceptsOperations(event.status);
  }

  private assertTicketCanBeAssigned(status: TicketStatus) {
    if (["paid", "sold", "used", "void"].includes(status)) {
      throw new BadRequestException("ticket cannot be assigned in its current status");
    }
  }

  private assertTicketCanBeReserved(status: TicketStatus) {
    if (!["available", "assigned", "reserved"].includes(status)) {
      throw new BadRequestException("ticket cannot be reserved in its current status");
    }
  }

  private assertTicketCanReleaseReservation(status: TicketStatus) {
    if (status !== "reserved") {
      throw new BadRequestException("only reserved tickets can be released");
    }
  }

  private assertTicketCanBeVoided(status: TicketStatus, actor?: AuthenticatedUser) {
    if (status === "used") {
      throw new BadRequestException("used tickets cannot be voided");
    }

    if (status === "paid" && actor?.role !== "admin") {
      throw new ForbiddenException("paid tickets can only be voided by admin");
    }
  }

  private assertPaymentCanBeReviewed(
    status: PaymentEvidence["status"],
    ticketStatus: TicketStatus,
    nextStatus: PaymentEvidence["status"]
  ) {
    if (status !== "pending") {
      throw new BadRequestException("payment evidence has already been reviewed");
    }

    if (nextStatus === "approved" && ticketStatus === "void") {
      throw new BadRequestException("void tickets cannot receive payment approval");
    }
  }

  private appendVoidReason(notes?: string | null, reason?: string) {
    const trimmedReason = reason?.trim();

    if (!trimmedReason) {
      return notes ?? undefined;
    }

    return [notes, `Anulada: ${trimmedReason}`].filter(Boolean).join("\n");
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

  private actorCanAccessTicket(ticket: TicketRecord, actor?: AuthenticatedUser) {
    if (!this.isRegularActor(actor)) {
      return true;
    }

    if (!ticket.distributorId) {
      return false;
    }

    const distributor = this.distributors.find(
      (item) => item.id === ticket.distributorId
    );

    return distributor?.userId === actor.id;
  }

  private assertActorCanAccessTicket(
    ticket: TicketRecord,
    actor?: AuthenticatedUser
  ) {
    if (!this.actorCanAccessTicket(ticket, actor)) {
      throw new ForbiddenException("ticket is not assigned to this user");
    }
  }

  private async assertActorCanAccessPrismaTicket(
    ticket: Pick<PrismaTicket, "distributorId">,
    actor?: AuthenticatedUser
  ) {
    if (!this.isRegularActor(actor)) {
      return;
    }

    if (!ticket.distributorId) {
      throw new ForbiddenException("ticket is not assigned to this user");
    }

    const distributor = await this.prisma!.distributor.findUnique({
      select: { userId: true },
      where: { id: ticket.distributorId }
    });

    if (distributor?.userId !== actor.id) {
      throw new ForbiddenException("ticket is not assigned to this user");
    }
  }

  private async assertPrismaUserCanOwnDistributor(userId?: string) {
    if (!userId) {
      return;
    }

    const user = await this.prisma!.appUser.findUnique({
      select: { status: true },
      where: { id: userId }
    });

    if (!user || user.status !== "active") {
      throw new BadRequestException("distributor user must be active");
    }
  }

  private isRegularActor(
    actor?: AuthenticatedUser
  ): actor is AuthenticatedUser & { role: "regular" } {
    return actor?.role === "regular";
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
      userId: distributor.userId ?? undefined,
      name: distributor.name,
      phone: distributor.phone,
      email: distributor.email ?? undefined,
      notes: distributor.notes ?? undefined,
      createdAt: distributor.createdAt.toISOString()
    };
  }

  private withDistributorContact(ticket: TicketRecord): TicketRecord {
    const distributor = ticket.distributorId
      ? this.distributors.find((item) => item.id === ticket.distributorId)
      : undefined;

    return {
      ...ticket,
      distributorEmail: distributor?.email,
      distributorName: distributor?.name,
      distributorNotes: distributor?.notes,
      distributorPhone: distributor?.phone
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
      distributorEmail: ticket.distributor?.email ?? undefined,
      distributorName: ticket.distributor?.name,
      distributorNotes: ticket.distributor?.notes ?? undefined,
      distributorPhone: ticket.distributor?.phone,
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

  private withPaymentTicketSummary(payment: PaymentEvidence): PaymentEvidence {
    const ticket = this.tickets.find((item) => item.id === payment.ticketId);

    return {
      ...payment,
      ticketBuyerName: ticket?.buyerName,
      ticketBuyerPhone: ticket?.buyerPhone,
      ticketCode: ticket?.code,
      ticketStatus: ticket?.status
    };
  }

  private toPaymentEvidence(payment: PrismaPaymentWithTicket): PaymentEvidence {
    return {
      id: payment.id,
      eventId: payment.eventId,
      ticketId: payment.ticketId,
      ticketBuyerName: payment.ticket?.buyerName ?? undefined,
      ticketBuyerPhone: payment.ticket?.buyerPhone ?? undefined,
      ticketCode: payment.ticket?.code,
      ticketStatus: payment.ticket?.status,
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

  private toAuditLogRecord(log: PrismaAuditLog): AuditLogRecord {
    return {
      id: log.id,
      eventId: log.eventId ?? undefined,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      fromStatus: log.fromStatus ?? undefined,
      toStatus: log.toStatus ?? undefined,
      actor: log.actor ?? undefined,
      metadata: this.toAuditLogMetadata(log.metadata),
      createdAt: log.createdAt.toISOString()
    };
  }

  private toAuditLogMetadata(metadata: unknown): AuditLogRecord["metadata"] {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return undefined;
    }

    const safeMetadata: AuditLogRecord["metadata"] = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        safeMetadata[key] = value;
      }
    }

    return Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined;
  }
}
