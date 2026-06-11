import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  CreateDistributorDto,
  CreateEventDto,
  CreateTicketBatchDto
} from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("events")
@UseGuards(RolesGuard)
export class EventsController {
  constructor(private readonly store: EventStoreService) {}

  @Roles("regular", "supervisor", "admin")
  @Get()
  listEvents() {
    return this.store.listEvents();
  }

  @Roles("admin")
  @Post()
  createEvent(@Body() body: CreateEventDto) {
    return this.store.createEvent(body);
  }

  @Roles("supervisor", "admin")
  @Get(":eventId/dashboard")
  getDashboard(@Param("eventId") eventId: string) {
    return this.store.getEventDashboard(eventId);
  }

  @Roles("regular", "supervisor", "admin")
  @Get(":eventId/summary")
  getSummary(@Param("eventId") eventId: string) {
    return this.store.getPublicEventDashboard(eventId);
  }

  @Roles("supervisor", "admin")
  @Post(":eventId/distributors")
  addDistributor(
    @Param("eventId") eventId: string,
    @Body() body: CreateDistributorDto
  ) {
    return this.store.addDistributor(eventId, body);
  }

  @Roles("admin")
  @Post(":eventId/tickets/batch")
  createTicketBatch(
    @Param("eventId") eventId: string,
    @Body() body: CreateTicketBatchDto
  ) {
    return this.store.createTicketBatch(eventId, body);
  }
}
