import "reflect-metadata";
import { ROLES_KEY } from "../src/auth/roles.decorator";
import { AuditController } from "../src/events/audit.controller";
import type { EventStoreService } from "../src/events/event-store.service";

describe("AuditController", () => {
  it("lists audit logs through the event store", async () => {
    const logs = [
      {
        action: "ticket.check_in",
        actor: "Porteria Real",
        createdAt: "2026-05-29T01:00:00.000Z",
        entityId: "tck_1",
        entityType: "ticket",
        eventId: "evt_demo",
        id: "aud_1"
      }
    ];
    const store = {
      listAuditLogs: jest.fn().mockResolvedValue(logs)
    } as unknown as EventStoreService;
    const controller = new AuditController(store);

    await expect(controller.listAuditLogs("evt_demo", "25")).resolves.toEqual({
      logs
    });
    expect(store.listAuditLogs).toHaveBeenCalledWith({
      eventId: "evt_demo",
      take: 25
    });
  });

  it("limits audit access to supervisor and admin roles", () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AuditController.prototype.listAuditLogs
    );

    expect(roles).toEqual(["supervisor", "admin"]);
  });
});
