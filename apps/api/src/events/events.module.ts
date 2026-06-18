import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AuditController } from "./audit.controller";
import { EventStoreService } from "./event-store.service";
import { EventsController } from "./events.controller";
import { PaymentsController } from "./payments.controller";
import { PublicEventsController } from "./public-events.controller";
import { TicketsController } from "./tickets.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    AuditController,
    EventsController,
    TicketsController,
    PaymentsController,
    PublicEventsController
  ],
  providers: [EventStoreService]
})
export class EventsModule {}
