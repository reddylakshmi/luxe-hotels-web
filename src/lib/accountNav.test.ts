import { describe, expect, it } from "vitest";
import {
  isSidebarItemCurrent,
  resolveSidebarHref,
  type SidebarItem,
} from "./accountNav";

const profileItem: SidebarItem = { id: "profile", label: "Profile" };
const tripsItem: SidebarItem = { id: "trips", label: "Recent trips" };
const loyaltyItem: SidebarItem = {
  id: "loyalty",
  label: "Loyalty hub",
  href: "/account/loyalty",
};
const eventsItem: SidebarItem = {
  id: "events",
  label: "Events & RFPs",
  href: "/account/events",
};

describe("resolveSidebarHref", () => {
  it("renders section anchors as bare fragments on /account", () => {
    expect(resolveSidebarHref(profileItem, "/account")).toBe("#profile");
    expect(resolveSidebarHref(tripsItem, "/account")).toBe("#trips");
  });

  it("rewrites section anchors to /account#<id> from any subpage", () => {
    expect(resolveSidebarHref(profileItem, "/account/loyalty")).toBe(
      "/account#profile",
    );
    expect(resolveSidebarHref(tripsItem, "/account/events")).toBe(
      "/account#trips",
    );
  });

  it("returns the explicit href for subpage items regardless of where you are", () => {
    expect(resolveSidebarHref(loyaltyItem, "/account")).toBe("/account/loyalty");
    expect(resolveSidebarHref(loyaltyItem, "/account/events")).toBe(
      "/account/loyalty",
    );
  });
});

describe("isSidebarItemCurrent", () => {
  it("marks the matching subpage as current", () => {
    expect(isSidebarItemCurrent(loyaltyItem, "/account/loyalty")).toBe(true);
    expect(isSidebarItemCurrent(eventsItem, "/account/events")).toBe(true);
  });

  it("does not cross-mark subpage entries on different routes", () => {
    expect(isSidebarItemCurrent(loyaltyItem, "/account/events")).toBe(false);
    expect(isSidebarItemCurrent(eventsItem, "/account/loyalty")).toBe(false);
  });

  it("never marks section anchors as current (they're not pages)", () => {
    expect(isSidebarItemCurrent(profileItem, "/account")).toBe(false);
    expect(isSidebarItemCurrent(profileItem, "/account/loyalty")).toBe(false);
  });

  it("returns false on the hub itself for every subpage entry", () => {
    expect(isSidebarItemCurrent(loyaltyItem, "/account")).toBe(false);
    expect(isSidebarItemCurrent(eventsItem, "/account")).toBe(false);
  });
});
