import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AssignTicketDto, CheckInTicketDto, RegisterSaleDto } from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("tickets")
@UseGuards(RolesGuard)
export class TicketsController {
  constructor(private readonly store: EventStoreService) {}

  @Roles("regular", "supervisor", "admin")
  @Get()
  listTickets(@Query("eventId") eventId?: string) {
    return this.store.listTickets(eventId);
  }

  @Roles("supervisor", "admin")
  @Patch(":ticketId/assign")
  assignTicket(@Param("ticketId") ticketId: string, @Body() body: AssignTicketDto) {
    return this.store.assignTicket(ticketId, body);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/sale")
  registerSale(@Param("ticketId") ticketId: string, @Body() body: RegisterSaleDto) {
    return this.store.registerSale(ticketId, body);
  }

  @Roles("regular", "supervisor", "admin")
  @Patch(":ticketId/check-in")
  checkInTicket(@Param("ticketId") ticketId: string, @Body() body: CheckInTicketDto) {
    return this.store.checkInTicket(ticketId, body);
  }
}
