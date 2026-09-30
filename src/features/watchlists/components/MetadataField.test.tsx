import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetadataField } from "./MetadataField";

describe("MetadataField", () => {
  it("renders with label, description and connects textarea via id", () => {
    const onChange = vi.fn();
    render(<MetadataField id="test-meta" value="" onChange={onChange} />);

    expect(screen.getByLabelText("Metadata (JSON object)")).toBeInTheDocument();
    expect(screen.getByText("Optional JSON configuration.")).toBeInTheDocument();
  });

  it("shows real-time feedback when invalid JSON syntax is entered", () => {
    render(<MetadataField id="test-meta" value="invalid json" onChange={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Invalid JSON syntax.");
    expect(screen.getByLabelText("Metadata (JSON object)")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows feedback when JSON is an array rather than an object", () => {
    render(<MetadataField id="test-meta" value="[1, 2, 3]" onChange={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Must be a JSON object.");
  });

  it("shows no error and aria-invalid false for valid JSON object", () => {
    render(<MetadataField id="test-meta" value='{"role": "manager"}' onChange={vi.fn()} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Metadata (JSON object)")).toHaveAttribute("aria-invalid", "false");
  });
});
