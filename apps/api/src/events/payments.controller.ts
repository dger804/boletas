import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { AdminTokenGuard } from "../auth/admin-token.guard";
import { VerifyPaymentDto } from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("payments")
@UseGuards(AdminTokenGuard)
export class PaymentsController {
  constructor(private readonly store: EventStoreService) {}

  @Get()
  listPayments(@Query("eventId") eventId?: string) {
    return this.store.listPayments(eventId);
  }

  @Patch(":paymentId/verify")
  verifyPayment(
    @Param("paymentId") paymentId: string,
    @Body() body: VerifyPaymentDto
  ) {
    return this.store.verifyPayment(paymentId, body);
  }
}
