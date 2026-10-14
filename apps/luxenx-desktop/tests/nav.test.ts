import { describe, it, expect } from "vitest";
import { navigate, getRoute, getPreviousRoute, subscribeRoute } from "../src/lib/nav.js";

describe("routeur interne de LuxenX", () => {
  it("démarre sur l'introduction", () => {
    expect(getRoute().name).toBe("intro");
  });

  it("change de route et mémorise la précédente", () => {
    navigate({ name: "auth" });
    expect(getRoute().name).toBe("auth");
    navigate({ name: "dashboard" });
    expect(getRoute().name).toBe("dashboard");
    expect(getPreviousRoute()?.name).toBe("auth");
  });

  it("ignore une navigation vers la route courante", () => {
    navigate({ name: "dashboard" });
    const before = getPreviousRoute()?.name;
    navigate({ name: "dashboard" });
    expect(getRoute().name).toBe("dashboard");
    expect(getPreviousRoute()?.name).toBe(before);
  });

  it("notifie ses abonnés lors d'un changement, plus après désabonnement", () => {
    let calls = 0;
    const off = subscribeRoute(() => calls++);
    navigate({ name: "settings" });
    navigate({ name: "help" });
    off();
    navigate({ name: "dashboard" });
    expect(calls).toBe(2);
  });
});
