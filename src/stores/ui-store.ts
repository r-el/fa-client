import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface UiPreferencesState {
  isSidebarCollapsed: boolean;
  isSoundEnabled: boolean;
  isCompactMode: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleCompactMode: () => void;
  setCompactMode: (enabled: boolean) => void;
  resetPreferences: () => void;
}

export const useUiStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isSoundEnabled: true,
      isCompactMode: false,
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSound: () =>
        set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
      setSoundEnabled: (isSoundEnabled) => set({ isSoundEnabled }),
      toggleCompactMode: () =>
        set((state) => ({ isCompactMode: !state.isCompactMode })),
      setCompactMode: (isCompactMode) => set({ isCompactMode }),
      resetPreferences: () =>
        set({
          isSidebarCollapsed: false,
          isSoundEnabled: true,
          isCompactMode: false,
        }),
    }),
    {
      name: "facealert-ui-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
