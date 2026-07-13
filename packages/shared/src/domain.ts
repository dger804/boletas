export const EVENT_STATUSES = ["draft", "active", "closed"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TICKET_STATUSES = [
  "available",
  "assigned",
  "reserved",
  "sold",
  "paid",
  "used",
  "void"
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PAYMENT_METHODS = ["transfer", "cash"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EVIDENCE_STATUSES = ["pending", "approved", "rejected"] as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const USER_ROLES = ["regular", "supervisor", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "disabled"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface ManagedUser extends AuthenticatedUser {
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: AuthenticatedUser;
}

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
  userId?: string;
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
  distributorName?: string;
  distributorPhone?: string;
  distributorEmail?: string;
  distributorNotes?: string;
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
  ticketCode?: string;
  ticketBuyerName?: string;
  ticketBuyerPhone?: string;
  ticketStatus?: TicketStatus;
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

export type AuditLogMetadata = Record<string, string | number | boolean | null>;

export interface AuditLogRecord {
  id: string;
  eventId?: string;
  entityType: string;
  entityId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  actor?: string;
  metadata?: AuditLogMetadata;
  createdAt: string;
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

export interface EventCloseout {
  event: EventRecord;
  generatedAt: string;
  totals: EventDashboard["totals"];
  payments: {
    pending: number;
    approved: number;
    rejected: number;
    pendingAmount: number;
    approvedAmount: number;
    cashApprovedAmount: number;
    transferApprovedAmount: number;
  };
  entry: {
    allowedTickets: number;
    usedTickets: number;
    remainingAllowedTickets: number;
    blockedTickets: number;
  };
  distributors: Array<
    Distributor & {
      assignedTickets: number;
      soldTickets: number;
      paidTickets: number;
      usedTickets: number;
      pendingTickets: number;
      grossSales: number;
      capitalization: number;
    }
  >;
  pendingTickets: Array<{
    id: string;
    code: string;
    status: TicketStatus;
    distributorName?: string;
    recipientName?: string;
    buyerName?: string;
    price: number;
    capitalizationAmount: number;
  }>;
  pendingPayments: Array<{
    id: string;
    ticketId: string;
    ticketCode?: string;
    method: PaymentMethod;
    amount: number;
    capitalizationAmount: number;
    status: EvidenceStatus;
    receivedAt: string;
  }>;
}

export interface PublicEventDashboard {
  event: Pick<EventRecord, "name" | "date" | "venue" | "expectedAttendees">;
  totals: EventDashboard["totals"];
  distributors: Array<{
    label: string;
    assignedTickets: number;
    paidTickets: number;
    usedTickets: number;
    grossSales: number;
  }>;
  ticketSamples: Array<{
    reference: string;
    status: TicketStatus;
    amount: number;
    detail: string;
    distributorLabel: string;
  }>;
  recentPayments: Array<{
    label: string;
    method: PaymentMethod;
    amount: number;
    status: EvidenceStatus;
  }>;
}
