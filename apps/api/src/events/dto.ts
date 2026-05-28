import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min
} from "class-validator";
import {
  EVENT_STATUSES,
  EVIDENCE_STATUSES,
  PAYMENT_METHODS
} from "@boletas/shared";

const OPTIONAL_URL_OPTIONS = { require_protocol: true };

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  venue!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  expectedAttendees?: number;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: (typeof EVENT_STATUSES)[number];
}

export class CreateDistributorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateTicketBatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  codePrefix?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  capitalizationAmount?: number;
}

export class AssignTicketDto {
  @IsString()
  @IsNotEmpty()
  distributorId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RegisterSaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  buyerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  buyerPhone?: string;

  @IsIn(PAYMENT_METHODS)
  method!: (typeof PAYMENT_METHODS)[number];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  capitalizationAmount?: number;

  @IsOptional()
  @IsUrl(OPTIONAL_URL_OPTIONS)
  @MaxLength(500)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CheckInTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  checkedInBy!: string;
}

export class VerifyPaymentDto {
  @IsIn(EVIDENCE_STATUSES)
  status!: (typeof EVIDENCE_STATUSES)[number];

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reviewedBy!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
