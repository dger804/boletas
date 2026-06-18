import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { EventStoreService } from "./event-store.service";

@Controller("audit")
@UseGuards(RolesGuard)
export class AuditController {
  constructor(private readonly store: EventStoreService) {}

  @Roles("supervisor", "admin")
  @Get()
  async listAuditLogs(
    @Query("eventId") eventId?: string,
    @Query("take") take?: string
  ) {
    const parsedTake = take ? Number(take) : undefined;

    return {
      logs: await this.store.listAuditLogs({
        eventId: eventId?.trim() || undefined,
        take: parsedTake
      })
    };
  }
}
