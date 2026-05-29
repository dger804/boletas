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
import { AssignTicketDto, CheckInTicketDto, RegisterSaleDto } from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("tickets")
@UseGuards(AdminTokenGuard)
export class TicketsController {
  constructor(private readonly store: EventStoreService) {}

  @Get()
  listTickets(@Query("eventId") eventId?: string) {
    return this.store.listTickets(eventId);
  }

  @Patch(":ticketId/assign")
  assignTicket(@Param("ticketId") ticketId: string, @Body() body: AssignTicketDto) {
    return this.store.assignTicket(ticketId, body);
  }

  @Patch(":ticketId/sale")
  registerSale(@Param("ticketId") ticketId: string, @Body() body: RegisterSaleDto) {
    return this.store.registerSale(ticketId, body);
  }

  @Patch(":ticketId/check-in")
  checkInTicket(@Param("ticketId") ticketId: string, @Body() body: CheckInTicketDto) {
    return this.store.checkInTicket(ticketId, body);
  }
}
