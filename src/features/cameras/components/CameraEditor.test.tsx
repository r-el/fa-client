import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { camerasService } from "@/features/cameras/api/cameras";
import { camera, cameraInput, cameraQueryClient } from "@/test/camera-fixtures";
import { CameraEditor } from "./CameraEditor";

vi.mock("@/features/cameras/api/cameras", async (original) => ({
  ...await original<typeof import("@/features/cameras/api/cameras")>(),
  camerasService: { get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), control: vi.fn() },
}));
vi.mock("@/hooks/use-watchlists", () => ({ useWatchlists: () => ({
  data: [{ id: "list-1", name: "Staff", target_type: "person" }, { id: "list-2", name: "Visitors", target_type: "person" }],
  isPending: false, isError: false,
}) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let client = cameraQueryClient();
beforeEach(() => {
  vi.resetAllMocks();
  client = cameraQueryClient();
  vi.mocked(camerasService.get).mockResolvedValue(camera);
  vi.mocked(camerasService.create).mockResolvedValue(camera);
  vi.mocked(camerasService.update).mockResolvedValue(camera);
});
afterEach(() => client.clear());

async function show(edit = false) {
  const onClose = vi.fn();
  render(<QueryClientProvider client={client}><CameraEditor cameraId={edit ? camera.id : undefined} onClose={onClose} /></QueryClientProvider>);
  await screen.findByLabelText("Name");
  return onClose;
}

function fill(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

it("creates the trimmed CRUD body, selected watchlists and deduplicated detection classes", async () => {
  const onClose = await show();
  fill("Name", "  Entrance  ");
  fill("Source URL", " rtsp://camera.example/stream ");
  fill("Location", " Lobby ");
  fill(/Detection classes/, "person, car, person, , car");
  fireEvent.click(screen.getByRole("checkbox", { name: /Staff/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Visitors/ }));
  fireEvent.click(screen.getByRole("button", { name: "Create camera" }));
  await waitFor(() => expect(camerasService.create).toHaveBeenCalledWith({
    ...cameraInput, watchlist_ids: ["list-1", "list-2"], detection_classes: ["person", "car"],
  }));
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
});

it("edit keeps stored credentials by omitting them, never pre-filling a password", async () => {
  await show(true);
  expect(screen.queryByLabelText("Password")).toBeNull();
  expect(screen.getByText(/never returned by the server/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(camerasService.update).toHaveBeenCalledWith(camera.id, cameraInput));
  expect(camerasService.create).not.toHaveBeenCalled();
});

it("edit explicitly replaces credentials only after both fields are supplied", async () => {
  await show(true);
  fill("Credentials", "replace");
  expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  fill("Username", "replacement-user");
  fill("Password", "synthetic-password");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(camerasService.update).toHaveBeenCalledWith(camera.id, {
    ...cameraInput, credentials: { username: "replacement-user", password: "synthetic-password" },
  }));
});

it("edit clears stored credentials with an explicit null", async () => {
  await show(true);
  fill("Credentials", "clear");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(camerasService.update).toHaveBeenCalledWith(camera.id, { ...cameraInput, credentials: null }));
});

it.each(["file:///camera", "rtsp://camera.example/has space", "rtsp://fake:synthetic@camera.example/stream"])(
  "rejects unsafe source %s before mutation", async (url) => {
    await show(true);
    fill("Source URL", url);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(camerasService.update).not.toHaveBeenCalled();
  },
);

it("preserves unavailable watchlist selections during edits", async () => {
  vi.mocked(camerasService.get).mockResolvedValue({ ...camera, watchlist_ids: ["missing-list"] });
  await show(true);
  expect(screen.getByRole("checkbox", { name: /missing-list/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(camerasService.update).toHaveBeenCalledWith(
    camera.id, { ...cameraInput, watchlist_ids: ["missing-list"] },
  ));
});

it("failed save retains entered values and keeps the editor open", async () => {
  vi.mocked(camerasService.update).mockRejectedValue(new Error("Save rejected"));
  const onClose = await show(true);
  fill("Name", "Changed name");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Save rejected");
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Changed name");
  expect(onClose).not.toHaveBeenCalled();
});