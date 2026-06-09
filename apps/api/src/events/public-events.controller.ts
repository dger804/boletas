import { Controller, Get, Param } from "@nestjs/common";
import { EventStoreService } from "./event-store.service";

@Controller("public/events")
export class PublicEventsController {
  constructor(private readonly store: EventStoreService) {}

  @Get(":eventId/dashboard")
  getDashboard(@Param("eventId") eventId: string) {
    return this.store.getPublicEventDashboard(eventId);
  }
}
