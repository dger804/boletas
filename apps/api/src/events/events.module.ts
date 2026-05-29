import { Module } from "@nestjs/common";
import { AdminTokenGuard } from "../auth/admin-token.guard";
import { DatabaseModule } from "../database/database.module";
import { EventStoreService } from "./event-store.service";
import { EventsController } from "./events.controller";
import { PaymentsController } from "./payments.controller";
import { TicketsController } from "./tickets.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [EventsController, TicketsController, PaymentsController],
  providers: [AdminTokenGuard, EventStoreService]
})
export class EventsModule {}
