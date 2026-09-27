import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TargetForm, WatchlistForm } from "./WatchlistForms";
import { PhotoPicker } from "./PhotoPicker";

beforeEach(() => {
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const change = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
function submit() { fireEvent.submit(screen.getByRole("button", { name: "Save watchlist" }).closest("form")!); }

describe("watchlist form validation", () => {
  it.each([
    ["Name", "  ", "name is required"],
    [/Face threshold/, "", "between 0 and 1"],
    [/Face threshold/, "-0.01", "between 0 and 1"],
    [/Appearance threshold/, "1.01", "between 0 and 1"],
    ["Metadata (JSON object)", "[]", "JSON object"],
  ])("rejects invalid %s without a write", async (label, value, message) => {
    const save = vi.fn();
    render(<WatchlistForm busy={false} onClose={vi.fn()} onSave={save} />);
    change("Name", "Staff"); change(label, value); submit();
    expect((await screen.findByRole("alert")).textContent).toContain(message);
    expect(save).not.toHaveBeenCalled();
  });

  it("accepts both ratio boundaries and nested metadata", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<WatchlistForm busy={false} onClose={vi.fn()} onSave={save} />);
    change("Name", "  Staff  "); change(/Face threshold/, "0"); change(/Appearance threshold/, "1");
    change("Metadata (JSON object)", '{"team":{"id":2}}'); submit();
    await waitFor(() => expect(save).toHaveBeenCalledWith({ name: "Staff", kind: "watchlist", target_type: "person", face_match_threshold_ratio: 0, appearance_match_threshold_ratio: 1, metadata: { team: { id: 2 } } }));
  });

  it("keeps a server rejection visible and preserves input for correction", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Duplicate watchlist name"));
    render(<WatchlistForm busy={false} onClose={vi.fn()} onSave={save} />);
    change("Name", "Staff"); submit();
    expect((await screen.findByRole("alert")).textContent).toContain("Duplicate watchlist name");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Staff");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("does not submit again while a mutation is pending", () => {
    const save = vi.fn();
    render(<WatchlistForm busy onClose={vi.fn()} onSave={save} />);
    fireEvent.submit(screen.getByRole("button", { name: "Saving…" }).closest("form")!);
    expect(save).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("target form and named-photo picker", () => {
  it("submits exact file names and trims the target label", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const files = [new File(["front"], "front view.jpg", { type: "image/jpeg" }), new File(["side"], "צד.png", { type: "image/png" })];
    const { unmount } = render(<TargetForm targetType="person" busy={false} onClose={vi.fn()} onSave={save} />);
    change("Label", "  Alex  ");
    fireEvent.change(screen.getByLabelText(/Drop reference photos/), { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: "Create target" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ label: "Alex", metadata: {}, is_enabled: true }, { label: "Alex", metadata: {}, image_file_names: ["front view.jpg", "צד.png"] }, files));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:front view.jpg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:צד.png");
  });

  it("rejects whitespace-only labels", async () => {
    const save = vi.fn();
    render(<TargetForm targetType="person" busy={false} onClose={vi.fn()} onSave={save} />);
    change("Label", "  ");
    fireEvent.submit(screen.getByRole("button", { name: "Create target" }).closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("target label is required");
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects duplicate names across selections without dropping existing files", () => {
    function Picker() {
      const [files, setFiles] = useState<File[]>([]);
      return <PhotoPicker files={files} onChange={setFiles} />;
    }
    const first = new File(["one"], "same.jpg", { type: "image/jpeg" });
    const second = new File(["two"], "same.jpg", { type: "image/jpeg" });
    render(<Picker />);
    const input = screen.getByLabelText(/Drop reference photos/);
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [second] } });
    expect(screen.getByRole("alert").textContent).toContain("Duplicate file name: same.jpg");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(URL.createObjectURL).toHaveBeenCalledExactlyOnceWith(first);
    fireEvent.click(screen.getByRole("button", { name: "Remove selected photo same.jpg" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:same.jpg");
    fireEvent.change(input, { target: { files: [second] } });
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(URL.createObjectURL).toHaveBeenLastCalledWith(second);
  });

  it("does not accept dropped files while disabled", () => {
    const onChange = vi.fn();
    render(<PhotoPicker files={[]} onChange={onChange} disabled />);
    const input = screen.getByLabelText(/Drop reference photos/);
    fireEvent.drop(input.parentElement!, { dataTransfer: { files: [new File(["jpeg"], "a.jpg", { type: "image/jpeg" })] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});