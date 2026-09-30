import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UiPreferencesState {
  isSidebarCollapsed: boolean;
  isSoundEnabled: boolean;
  isCompactMode: boolean;
  isCommandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleCompactMode: () => void;
  setCompactMode: (enabled: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  resetPreferences: () => void;
}

export const useUiStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isSoundEnabled: true,
      isCompactMode: false,
      isCommandPaletteOpen: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSound: () =>
        set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
      toggleCompactMode: () =>
        set((state) => ({ isCompactMode: !state.isCompactMode })),
      setCompactMode: (isCompactMode) => set({ isCompactMode }),
      openCommandPalette: () => set({ isCommandPaletteOpen: true }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
      setCommandPaletteOpen: (isCommandPaletteOpen) =>
        set({ isCommandPaletteOpen }),
      resetPreferences: () =>
        set({
          isSidebarCollapsed: false,
          isSoundEnabled: true,
          isCompactMode: false,
          isCommandPaletteOpen: false,
        }),
    }),
    {
      name: "facealert-ui-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        isSoundEnabled: state.isSoundEnabled,
        isCompactMode: state.isCompactMode,
      }),
    }
  )
);
