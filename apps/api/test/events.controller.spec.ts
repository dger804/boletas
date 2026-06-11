import "reflect-metadata";
import { ROLES_KEY } from "../src/auth/roles.decorator";
import { EventsController } from "../src/events/events.controller";
import { EventStoreService } from "../src/events/event-store.service";

describe("EventsController", () => {
  it("serves the protected summary with the sanitized dashboard contract", async () => {
    const summary = {
      event: {
        date: "2026-07-18T20:00:00.000Z",
        expectedAttendees: 120,
        name: "Lanzamiento Demo",
        venue: "Auditorio Principal"
      },
      totals: {
        available: 1,
        assigned: 1,
        capitalization: 45000,
        grossSales: 270000,
        paid: 3,
        pendingToCollect: 90000,
        sold: 4,
        tickets: 7,
        used: 1,
        void: 1
      },
      distributors: [],
      recentPayments: [],
      ticketSamples: []
    };
    const store = {
      getPublicEventDashboard: jest.fn().mockResolvedValue(summary)
    } as unknown as EventStoreService;
    const controller = new EventsController(store);

    await expect(controller.getSummary("evt_demo")).resolves.toBe(summary);
    expect(store.getPublicEventDashboard).toHaveBeenCalledWith("evt_demo");
  });

  it("keeps the full dashboard out of the regular role", () => {
    const fullDashboardRoles = Reflect.getMetadata(
      ROLES_KEY,
      EventsController.prototype.getDashboard
    );
    const summaryRoles = Reflect.getMetadata(
      ROLES_KEY,
      EventsController.prototype.getSummary
    );

    expect(fullDashboardRoles).toEqual(["supervisor", "admin"]);
    expect(summaryRoles).toEqual(["regular", "supervisor", "admin"]);
  });
});
