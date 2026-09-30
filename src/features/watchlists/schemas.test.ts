import { describe, expect, it } from "vitest";
import { targetFormSchema, watchlistFormSchema } from "./schemas";

describe("watchlistFormSchema", () => {
  it("validates and parses valid watchlist inputs", () => {
    const result = watchlistFormSchema.safeParse({
      name: "Office Entrance",
      targetType: "person",
      kind: "watchlist",
      face: "0.45",
      appearance: "0.75",
      metadata: '{"department":"security"}',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Office Entrance");
      expect(result.data.metadata).toEqual({ department: "security" });
    }
  });

  it("fails when name is blank", () => {
    const result = watchlistFormSchema.safeParse({
      name: "   ",
      targetType: "person",
      kind: "watchlist",
      face: "0.45",
      appearance: "0.75",
      metadata: "{}",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("watchlist name is required");
    }
  });

  it("fails when face threshold is outside 0-1 range", () => {
    const result = watchlistFormSchema.safeParse({
      name: "Office Entrance",
      targetType: "person",
      kind: "watchlist",
      face: "1.5",
      appearance: "0.75",
      metadata: "{}",
    });

    expect(result.success).toBe(false);
  });
});

describe("targetFormSchema", () => {
  it("validates target label and metadata", () => {
    const result = targetFormSchema.safeParse({
      label: "John",
      metadata: "{}",
      enabled: true,
      files: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid metadata json", () => {
    const result = targetFormSchema.safeParse({
      label: "John",
      metadata: "not valid json",
      enabled: true,
      files: [],
    });

    expect(result.success).toBe(false);
  });
});
