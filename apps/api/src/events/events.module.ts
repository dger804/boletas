import { Module } from "@nestjs/common";
import { EventStoreService } from "./event-store.service";
import { EventsController } from "./events.controller";
import { PaymentsController } from "./payments.controller";
import { TicketsController } from "./tickets.controller";

@Module({
  controllers: [EventsController, TicketsController, PaymentsController],
  providers: [EventStoreService]
})
export class EventsModule {}
