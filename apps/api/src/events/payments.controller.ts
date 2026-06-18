import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import type { RequestWithUser } from "../auth/auth-token.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { VerifyPaymentDto } from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("payments")
@UseGuards(RolesGuard)
export class PaymentsController {
  constructor(private readonly store: EventStoreService) {}

  @Roles("supervisor", "admin")
  @Get()
  listPayments(@Query("eventId") eventId?: string) {
    return this.store.listPayments(eventId);
  }

  @Roles("supervisor", "admin")
  @Patch(":paymentId/verify")
  verifyPayment(
    @Param("paymentId") paymentId: string,
    @Body() body: VerifyPaymentDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.verifyPayment(
      paymentId,
      {
        ...body,
        reviewedBy: request.user?.name ?? body.reviewedBy
      },
      request.user
    );
  }
}
