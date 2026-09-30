import { describe, it, expect, beforeEach } from "vitest";
import { useUiStore } from "./ui-store";

describe("useUiStore", () => {
  beforeEach(() => {
    useUiStore.getState().resetPreferences();
    localStorage.clear();
  });

  it("initializes with default preferences", () => {
    const state = useUiStore.getState();
    expect(state.isSidebarCollapsed).toBe(false);
    expect(state.isSoundEnabled).toBe(true);
    expect(state.isCompactMode).toBe(false);
  });

  it("toggles and sets sidebar collapsed state", () => {
    expect(useUiStore.getState().isSidebarCollapsed).toBe(false);

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().isSidebarCollapsed).toBe(true);

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().isSidebarCollapsed).toBe(false);

    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().isSidebarCollapsed).toBe(true);
  });

  it("toggles and sets sound enabled preference", () => {
    expect(useUiStore.getState().isSoundEnabled).toBe(true);

    useUiStore.getState().toggleSound();
    expect(useUiStore.getState().isSoundEnabled).toBe(false);

    useUiStore.getState().setSoundEnabled(true);
    expect(useUiStore.getState().isSoundEnabled).toBe(true);
  });

  it("toggles and sets compact mode preference", () => {
    expect(useUiStore.getState().isCompactMode).toBe(false);

    useUiStore.getState().toggleCompactMode();
    expect(useUiStore.getState().isCompactMode).toBe(true);

    useUiStore.getState().setCompactMode(false);
    expect(useUiStore.getState().isCompactMode).toBe(false);
  });

  it("resets preferences back to defaults", () => {
    useUiStore.getState().setSidebarCollapsed(true);
    useUiStore.getState().setSoundEnabled(false);
    useUiStore.getState().setCompactMode(true);

    useUiStore.getState().resetPreferences();

    const state = useUiStore.getState();
    expect(state.isSidebarCollapsed).toBe(false);
    expect(state.isSoundEnabled).toBe(true);
    expect(state.isCompactMode).toBe(false);
  });
});
