import { PrismaClient } from "@prisma/client";
import type { EvidenceStatus, PaymentMethod, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

const eventId = "evt_demo";

const eventDate = new Date("2026-07-18T20:00:00.000Z");
const soldAt = new Date("2026-05-28T15:00:00.000Z");
const paidAt = new Date("2026-05-28T16:00:00.000Z");
const usedAt = new Date("2026-07-18T21:00:00.000Z");

interface DistributorSeed {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface TicketSeed {
  id: string;
  code: string;
  price: number;
  status: TicketStatus;
  distributorId?: string;
  recipientName?: string;
  buyerName?: string;
  buyerPhone?: string;
  paymentMethod?: PaymentMethod;
  soldAt?: Date;
  paidAt?: Date;
  usedAt?: Date;
  checkedInBy?: string;
  capitalizationAmount: number;
  notes?: string;
}

interface PaymentSeed {
  id: string;
  ticketId: string;
  method: PaymentMethod;
  amount: number;
  capitalizationAmount: number;
  evidenceUrl?: string;
  reference?: string;
  status: EvidenceStatus;
  receivedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

const distributors: DistributorSeed[] = [
  {
    id: "dst_demo_equipo",
    name: "Equipo Comercial",
    phone: "+57 300 000 0000",
    email: "ventas@example.com",
    notes: "Distribuidor demo para pruebas operativas."
  },
  {
    id: "dst_demo_aliados",
    name: "Aliados Zona Norte",
    phone: "+57 301 000 0000",
    email: "aliados@example.com",
    notes: "Aliados externos con boletas asignadas."
  },
  {
    id: "dst_demo_taquilla",
    name: "Taquilla",
    phone: "+57 302 000 0000",
    email: "taquilla@example.com",
    notes: "Ventas directas del dia del evento."
  }
];

const tickets: TicketSeed[] = [
  {
    id: "tck_demo_vip001",
    code: "VIP-001",
    price: 90000,
    status: "paid",
    distributorId: "dst_demo_equipo",
    buyerName: "Comprador Demo",
    buyerPhone: "+57 311 000 0000",
    paymentMethod: "transfer",
    soldAt,
    paidAt,
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_vip002",
    code: "VIP-002",
    price: 90000,
    status: "assigned",
    distributorId: "dst_demo_equipo",
    recipientName: "Pendiente por vender",
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_vip003",
    code: "VIP-003",
    price: 90000,
    status: "paid",
    distributorId: "dst_demo_equipo",
    buyerName: "Sofia Castro",
    buyerPhone: "+57 312 000 0000",
    paymentMethod: "cash",
    soldAt,
    paidAt,
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_vip018",
    code: "VIP-018",
    price: 90000,
    status: "sold",
    distributorId: "dst_demo_aliados",
    buyerName: "Laura Mendez",
    buyerPhone: "+57 313 000 0000",
    paymentMethod: "transfer",
    soldAt,
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_gen041",
    code: "GEN-041",
    price: 90000,
    status: "used",
    distributorId: "dst_demo_taquilla",
    buyerName: "Carlos Ruiz",
    buyerPhone: "+57 314 000 0000",
    paymentMethod: "cash",
    soldAt,
    paidAt,
    usedAt,
    checkedInBy: "Porteria Demo",
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_gen057",
    code: "GEN-057",
    price: 90000,
    status: "available",
    distributorId: undefined,
    capitalizationAmount: 15000
  },
  {
    id: "tck_demo_gen058",
    code: "GEN-058",
    price: 90000,
    status: "void",
    distributorId: undefined,
    notes: "Boleta anulada para probar estados bloqueados.",
    capitalizationAmount: 15000
  }
];

const payments: PaymentSeed[] = [
  {
    id: "pay_demo_vip001",
    ticketId: "tck_demo_vip001",
    method: "transfer",
    amount: 90000,
    capitalizationAmount: 15000,
    evidenceUrl: "https://example.com/evidencia-demo-vip001.png",
    reference: "TRX-DEMO-001",
    status: "approved",
    receivedAt: soldAt,
    reviewedAt: paidAt,
    reviewedBy: "Admin Demo"
  },
  {
    id: "pay_demo_vip003",
    ticketId: "tck_demo_vip003",
    method: "cash",
    amount: 90000,
    capitalizationAmount: 15000,
    reference: "Caja evento",
    status: "approved",
    receivedAt: soldAt,
    reviewedAt: paidAt,
    reviewedBy: "Admin Demo"
  },
  {
    id: "pay_demo_vip018",
    ticketId: "tck_demo_vip018",
    method: "transfer",
    amount: 90000,
    capitalizationAmount: 15000,
    evidenceUrl: "https://example.com/evidencia-demo-vip018.png",
    reference: "Bancolombia 4182",
    status: "pending",
    receivedAt: soldAt
  },
  {
    id: "pay_demo_gen041",
    ticketId: "tck_demo_gen041",
    method: "cash",
    amount: 90000,
    capitalizationAmount: 15000,
    reference: "Caja evento",
    status: "approved",
    receivedAt: soldAt,
    reviewedAt: paidAt,
    reviewedBy: "Admin Demo"
  }
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  await prisma.event.upsert({
    create: {
      id: eventId,
      date: eventDate,
      expectedAttendees: 120,
      name: "Lanzamiento Demo",
      status: "active",
      venue: "Auditorio Principal"
    },
    update: {
      date: eventDate,
      expectedAttendees: 120,
      name: "Lanzamiento Demo",
      status: "active",
      venue: "Auditorio Principal"
    },
    where: { id: eventId }
  });

  for (const distributor of distributors) {
    await prisma.distributor.upsert({
      create: {
        ...distributor,
        eventId
      },
      update: {
        email: distributor.email,
        name: distributor.name,
        notes: distributor.notes,
        phone: distributor.phone
      },
      where: { id: distributor.id }
    });
  }

  for (const ticket of tickets) {
    await prisma.ticket.upsert({
      create: {
        buyerName: ticket.buyerName,
        buyerPhone: ticket.buyerPhone,
        capitalizationAmount: ticket.capitalizationAmount,
        checkedInBy: ticket.checkedInBy,
        code: ticket.code,
        distributorId: ticket.distributorId,
        eventId,
        notes: ticket.notes,
        paidAt: ticket.paidAt,
        paymentMethod: ticket.paymentMethod,
        price: ticket.price,
        recipientName: ticket.recipientName,
        soldAt: ticket.soldAt,
        status: ticket.status,
        usedAt: ticket.usedAt
      },
      update: {
        buyerName: ticket.buyerName,
        buyerPhone: ticket.buyerPhone,
        capitalizationAmount: ticket.capitalizationAmount,
        checkedInBy: ticket.checkedInBy,
        distributorId: ticket.distributorId,
        notes: ticket.notes,
        paidAt: ticket.paidAt,
        paymentMethod: ticket.paymentMethod,
        price: ticket.price,
        recipientName: ticket.recipientName,
        soldAt: ticket.soldAt,
        status: ticket.status,
        usedAt: ticket.usedAt
      },
      where: { id: ticket.id }
    });
  }

  for (const payment of payments) {
    await prisma.paymentEvidence.upsert({
      create: {
        ...payment,
        eventId
      },
      update: {
        amount: payment.amount,
        capitalizationAmount: payment.capitalizationAmount,
        evidenceUrl: payment.evidenceUrl,
        method: payment.method,
        notes: payment.notes,
        receivedAt: payment.receivedAt,
        reference: payment.reference,
        reviewedAt: payment.reviewedAt,
        reviewedBy: payment.reviewedBy,
        status: payment.status
      },
      where: { id: payment.id }
    });
  }

  await prisma.auditLog.upsert({
    create: {
      id: "audit_demo_seed",
      action: "seed_demo_data",
      entityId: eventId,
      entityType: "event",
      eventId,
      metadata: {
        distributors: distributors.length,
        paymentEvidences: payments.length,
        tickets: tickets.length
      },
      toStatus: "active"
    },
    update: {
      metadata: {
        distributors: distributors.length,
        paymentEvidences: payments.length,
        tickets: tickets.length
      }
    },
    where: { id: "audit_demo_seed" }
  });

  const [eventCount, distributorCount, ticketCount, paymentCount] =
    await Promise.all([
      prisma.event.count({ where: { id: eventId } }),
      prisma.distributor.count({ where: { eventId } }),
      prisma.ticket.count({ where: { eventId } }),
      prisma.paymentEvidence.count({ where: { eventId } })
    ]);

  console.log(
    JSON.stringify(
      {
        eventId,
        seeded: {
          distributors: distributorCount,
          events: eventCount,
          paymentEvidences: paymentCount,
          tickets: ticketCount
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
