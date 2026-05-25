import type { EventStatus, EvidenceStatus, PaymentMethod } from "@boletas/shared";

export interface CreateEventDto {
  name: string;
  date: string;
  venue: string;
  expectedAttendees?: number;
  status?: EventStatus;
}

export interface CreateDistributorDto {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface CreateTicketBatchDto {
  quantity: number;
  price: number;
  codePrefix?: string;
  capitalizationAmount?: number;
}

export interface AssignTicketDto {
  distributorId: string;
  recipientName?: string;
  notes?: string;
}

export interface RegisterSaleDto {
  buyerName: string;
  buyerPhone?: string;
  method: PaymentMethod;
  amount: number;
  capitalizationAmount?: number;
  evidenceUrl?: string;
  reference?: string;
  notes?: string;
}

export interface CheckInTicketDto {
  checkedInBy: string;
}

export interface VerifyPaymentDto {
  status: EvidenceStatus;
  reviewedBy: string;
  notes?: string;
}
