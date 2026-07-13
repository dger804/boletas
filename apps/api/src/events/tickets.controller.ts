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
import {
  AssignTicketDto,
  CheckInTicketDto,
  ReleaseTicketReservationDto,
  RegisterSaleDto,
  ReserveTicketDto,
  VoidTicketDto
} from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("tickets")
@UseGuards(RolesGuard)
export class TicketsController {
  constructor(private readonly store: EventStoreService) {}

  @Roles("regular", "supervisor", "admin")
  @Get()
  listTickets(
    @Query("eventId") eventId: string | undefined,
    @Req() request: RequestWithUser
  ) {
    return this.store.listTickets(eventId, request.user);
  }

  @Roles("supervisor", "admin")
  @Patch(":ticketId/assign")
  assignTicket(
    @Param("ticketId") ticketId: string,
    @Body() body: AssignTicketDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.assignTicket(ticketId, body, request.user);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/reserve")
  reserveTicket(
    @Param("ticketId") ticketId: string,
    @Body() body: ReserveTicketDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.reserveTicket(ticketId, body, request.user);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/release")
  releaseTicketReservation(
    @Param("ticketId") ticketId: string,
    @Body() body: ReleaseTicketReservationDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.releaseTicketReservation(ticketId, body, request.user);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/sale")
  registerSale(
    @Param("ticketId") ticketId: string,
    @Body() body: RegisterSaleDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.registerSale(ticketId, body, request.user);
  }

  @Roles("supervisor", "admin")
  @Patch(":ticketId/void")
  voidTicket(
    @Param("ticketId") ticketId: string,
    @Body() body: VoidTicketDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.voidTicket(ticketId, body, request.user);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/check-in")
  checkInTicket(
    @Param("ticketId") ticketId: string,
    @Body() body: CheckInTicketDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.checkInTicket(
      ticketId,
      {
        ...body,
        checkedInBy: request.user?.name ?? body.checkedInBy
      },
      request.user
    );
  }
}
