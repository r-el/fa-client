import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, skipToken, useQuery } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import api from "@/services/api";
import type { CameraDetails } from "@/features/cameras/api/cameras";
import { camera, cameraQueryClient } from "@/test/camera-fixtures";
import { CameraCard } from "./CameraCard";

vi.mock("@/services/api", () => ({ default: { post: vi.fn(), delete: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let client = cameraQueryClient();
beforeEach(() => {
  vi.resetAllMocks();
  client = cameraQueryClient();
  vi.mocked(api.post).mockResolvedValue({ status: 202, data: { success: true, data: { ...camera, live_status: "running" } } });
  vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
});
afterEach(() => { client.clear(); vi.useRealTimers(); });

function show(role = "admin", initial: CameraDetails = camera) {
  client.setQueryData(["cameras"], [initial]);
  const onEdit = vi.fn();
  function Observer() {
    const { data } = useQuery<CameraDetails[]>({ queryKey: ["cameras"], queryFn: skipToken });
    return <CameraCard camera={data![0]} role={role} onEdit={onEdit} />;
  }
  render(<QueryClientProvider client={client}><MemoryRouter><Observer /></MemoryRouter></QueryClientProvider>);
  return onEdit;
}

function reportStatus(live_status: CameraDetails["live_status"]) {
  act(() => client.setQueryData<CameraDetails[]>(["cameras"], (rows) => rows!.map((row) => ({ ...row, live_status }))));
}

it("202 start records intent only; query observer updates confirm and latch completion", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(await screen.findByText(/Start accepted — waiting/)).toBeTruthy();
  expect(screen.getByText("stopped")).toBeTruthy();
  expect(screen.queryByText("running")).toBeNull();
  expect((screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(true);
  expect(api.post).toHaveBeenCalledExactlyOnceWith("/cameras/cam-1/start");
  reportStatus("starting");
  expect(await screen.findByText("starting")).toBeTruthy();
  expect(screen.getByText(/Start accepted — waiting/)).toBeTruthy();
  reportStatus("running");
  await waitFor(() => expect(screen.queryByText(/Start accepted/)).toBeNull());
  expect((screen.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(false);
  reportStatus("reconnecting");
  expect(await screen.findByText("reconnecting")).toBeTruthy();
  expect(screen.queryByText(/Start accepted/)).toBeNull();
});

it("a pre-existing failed status does not confirm a newly accepted start", async () => {
  show("admin", { ...camera, live_status: "failed" });
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect(await screen.findByText(/Start accepted — waiting/)).toBeTruthy();
  reportStatus("starting");
  await screen.findByText("starting");
  reportStatus("running");
  await waitFor(() => expect(screen.queryByText(/Start accepted/)).toBeNull());
});

it("expires unconfirmed requests without inventing a running status", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  await screen.findByText(/Start accepted — waiting/);
  // Install fake time before the next request's timer is created.
  reportStatus("running");
  await waitFor(() => expect(screen.queryByText(/Start accepted/)).toBeNull());
  reportStatus("stopped");
  await screen.findByText("stopped");
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start" })); });
  await act(async () => { await vi.advanceTimersByTimeAsync(30_001); });
  expect(screen.getByText(/outcome is not yet confirmed/)).toBeTruthy();
  expect(screen.getByText("stopped")).toBeTruthy();
});

it.each(["viewer", "unknown", ""])("%s has live view but no management controls", (role) => {
  show(role);
  expect(screen.getByRole("link", { name: "Live view" }).getAttribute("href")).toBe("/cameras/cam-1/live");
  expect(screen.queryAllByRole("button")).toHaveLength(0);
});

it("camera-level permissions deny controls even to an admin", () => {
  show("admin", { ...camera, canManage: false, live_status: null, desired_state: "running" });
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  expect(screen.getByText("unknown")).toBeTruthy();
  expect(screen.queryByText("running", { exact: true })).toBeNull();
});

it("operators may edit but may not delete", () => {
  const onEdit = show("operator");
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
});

it("stop requires confirmation and observed stopped status", async () => {
  show("operator", { ...camera, live_status: "running" });
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Request stop" }));
  await screen.findByText(/Stop accepted — waiting/);
  expect(screen.getByText("running")).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith("/cameras/cam-1/stop");
  reportStatus("stopped");
  await waitFor(() => expect(screen.queryByText(/Stop accepted/)).toBeNull());
});

it("delete cancellation does nothing; confirmed deletion calls the service", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete camera" }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/cameras/cam-1"));
});

it("rejected control displays an error without an accepted status", async () => {
  vi.mocked(api.post).mockRejectedValue(new Error("Permission denied"));
  show();
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Permission denied");
  expect(screen.queryByText(/Start accepted/)).toBeNull();
});