import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Users } from "lucide-react";
import { EmptyState } from "../empty-state";
import { Button } from "../button";

describe("EmptyState", () => {
  it("renders title, description and icon", () => {
    render(
      <EmptyState
        icon={Users}
        title="No targets found"
        description="Add a target to begin tracking."
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("No targets found")).toBeInTheDocument();
    expect(screen.getByText("Add a target to begin tracking.")).toBeInTheDocument();
  });

  it("renders optional action button", () => {
    render(
      <EmptyState
        title="Empty List"
        action={<Button>Create Item</Button>}
      />
    );

    expect(screen.getByRole("button", { name: "Create Item" })).toBeInTheDocument();
  });
});
