export type EventStatus = "draft" | "active" | "closed";

export type TicketStatus =
  | "available"
  | "assigned"
  | "reserved"
  | "sold"
  | "paid"
  | "used"
  | "void";

export type PaymentMethod = "transfer" | "cash";

export type EvidenceStatus = "pending" | "approved" | "rejected";

export interface EventRecord {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: EventStatus;
  expectedAttendees: number;
  createdAt: string;
}

export interface Distributor {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  eventId: string;
  code: string;
  price: number;
  status: TicketStatus;
  distributorId?: string;
  recipientName?: string;
  buyerName?: string;
  buyerPhone?: string;
  paymentMethod?: PaymentMethod;
  soldAt?: string;
  paidAt?: string;
  usedAt?: string;
  checkedInBy?: string;
  capitalizationAmount: number;
  notes?: string;
  createdAt: string;
}

export interface PaymentEvidence {
  id: string;
  eventId: string;
  ticketId: string;
  method: PaymentMethod;
  amount: number;
  capitalizationAmount: number;
  evidenceUrl?: string;
  reference?: string;
  status: EvidenceStatus;
  receivedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface EventDashboard {
  event: EventRecord;
  totals: {
    tickets: number;
    available: number;
    assigned: number;
    sold: number;
    paid: number;
    used: number;
    void: number;
    grossSales: number;
    capitalization: number;
    pendingToCollect: number;
  };
  distributors: Array<
    Distributor & {
      assignedTickets: number;
      paidTickets: number;
      usedTickets: number;
      grossSales: number;
    }
  >;
  recentPayments: PaymentEvidence[];
}
