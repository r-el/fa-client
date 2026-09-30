import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CopyButton, CopyableText } from "./copy-button";

describe("CopyButton", () => {
  it("copies value to clipboard and shows feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyButton value="test-uuid" label="Copy Alert ID" />);
    const btn = screen.getByRole("button", { name: "Copy Alert ID" });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(writeText).toHaveBeenCalledWith("test-uuid");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
  });
});

describe("CopyableText", () => {
  it("renders text and copy button", () => {
    render(<CopyableText value="camera-123" label="Camera ID" />);
    expect(screen.getByText("camera-123")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Camera ID" })).toBeTruthy();
  });
});
