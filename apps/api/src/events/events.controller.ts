import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { RequestWithUser } from "../auth/auth-token.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import {
  CreateDistributorDto,
  CreateEventDto,
  CreateTicketBatchDto,
  UpdateEventDto
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
  createEvent(@Body() body: CreateEventDto, @Req() request: RequestWithUser) {
    return this.store.createEvent(body, request.user);
  }

  @Roles("admin")
  @Patch(":eventId")
  updateEvent(
    @Param("eventId") eventId: string,
    @Body() body: UpdateEventDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.updateEvent(eventId, body, request.user);
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
  @Get(":eventId/distributors")
  listDistributors(@Param("eventId") eventId: string) {
    return this.store.listDistributors(eventId);
  }

  @Roles("supervisor", "admin")
  @Post(":eventId/distributors")
  addDistributor(
    @Param("eventId") eventId: string,
    @Body() body: CreateDistributorDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.addDistributor(eventId, body, request.user);
  }

  @Roles("admin")
  @Post(":eventId/tickets/batch")
  createTicketBatch(
    @Param("eventId") eventId: string,
    @Body() body: CreateTicketBatchDto,
    @Req() request: RequestWithUser
  ) {
    return this.store.createTicketBatch(eventId, body, request.user);
  }
}
