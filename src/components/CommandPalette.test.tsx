import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CommandPalette } from "./CommandPalette";
import { useUiStore } from "@/stores/ui-store";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user_1", username: "admin", role: "admin" },
    isAuthenticated: true,
  }),
}));

vi.mock("@/features/cameras", () => ({
  useCameras: () => ({
    data: [{ id: "cam_1", name: "Front Door", live_status: "running" }],
  }),
}));

vi.mock("@/features/watchlists", () => ({
  useWatchlists: () => ({
    data: [{ id: "wl_1", name: "VIP Guests", kind: "watchlist", target_type: "person" }],
  }),
}));

vi.mock("@/features/alerts", () => ({
  useAlerts: () => ({
    data: {
      pages: [
        {
          alerts: [
            {
              id: "alt_1",
              kind: "identity_match",
              camera_name: "Front Door",
              target_label: "Ariel",
              object_class: "person",
              review: { disposition: "unreviewed", is_acknowledged: false, note: null },
            },
          ],
        },
      ],
    },
  }),
}));

function renderCommandPalette() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommandPalette />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.getState().resetPreferences();
  });

  it("does not render dialog content when closed", () => {
    renderCommandPalette();
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
  });

  it("opens when openCommandPalette is called in store", async () => {
    renderCommandPalette();
    act(() => {
      useUiStore.getState().openCommandPalette();
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Front Door")).toBeInTheDocument();
    expect(screen.getByText("VIP Guests")).toBeInTheDocument();
  });

  it("toggles open with Ctrl+K shortcut", () => {
    renderCommandPalette();
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(true);

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it("navigates and closes palette when a navigation item is selected", async () => {
    renderCommandPalette();
    act(() => {
      useUiStore.getState().openCommandPalette();
    });

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    const overviewItem = screen.getByText("Overview");
    fireEvent.click(overviewItem);

    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it("triggers actions such as sound toggle", async () => {
    renderCommandPalette();
    act(() => {
      useUiStore.getState().openCommandPalette();
    });

    await waitFor(() => {
      expect(screen.getByText("Mute Alert Audio")).toBeInTheDocument();
    });

    expect(useUiStore.getState().isSoundEnabled).toBe(true);
    const muteAction = screen.getByText("Mute Alert Audio");
    fireEvent.click(muteAction);

    expect(useUiStore.getState().isSoundEnabled).toBe(false);
    expect(useUiStore.getState().isCommandPaletteOpen).toBe(false);
  });
});
