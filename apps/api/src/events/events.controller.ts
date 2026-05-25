import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type {
  CreateDistributorDto,
  CreateEventDto,
  CreateTicketBatchDto
} from "./dto";
import { EventStoreService } from "./event-store.service";

@Controller("events")
export class EventsController {
  constructor(private readonly store: EventStoreService) {}

  @Get()
  listEvents() {
    return this.store.listEvents();
  }

  @Post()
  createEvent(@Body() body: CreateEventDto) {
    return this.store.createEvent(body);
  }

  @Get(":eventId/dashboard")
  getDashboard(@Param("eventId") eventId: string) {
    return this.store.getEventDashboard(eventId);
  }

  @Post(":eventId/distributors")
  addDistributor(
    @Param("eventId") eventId: string,
    @Body() body: CreateDistributorDto
  ) {
    return this.store.addDistributor(eventId, body);
  }

  @Post(":eventId/tickets/batch")
  createTicketBatch(
    @Param("eventId") eventId: string,
    @Body() body: CreateTicketBatchDto
  ) {
    return this.store.createTicketBatch(eventId, body);
  }
}
