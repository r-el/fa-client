import { describe, expect, it } from "vitest";
import { validateTargetForm, validateWatchlistForm } from "../validation";

describe("validateWatchlistForm", () => {
  const validState = {
    name: "VIP List",
    targetType: "person" as const,
    kind: "watchlist" as const,
    face: "0.45",
    appearance: "0.75",
    metadata: "{}",
  };

  it("produces valid payload for valid inputs", () => {
    const payload = validateWatchlistForm(validState);
    expect(payload).toEqual({
      name: "VIP List",
      target_type: "person",
      kind: "watchlist",
      face_match_threshold_ratio: 0.45,
      appearance_match_threshold_ratio: 0.75,
      metadata: {},
    });
  });

  it("throws for whitespace-only name", () => {
    expect(() => validateWatchlistForm({ ...validState, name: "   " }))
      .toThrow("watchlist name is required");
  });

  it.each(["-0.1", "1.1", "abc", ""])(
    "throws for invalid face threshold '%s'",
    (face) => {
      expect(() => validateWatchlistForm({ ...validState, face }))
        .toThrow("Match thresholds must be numbers between 0 and 1.");
    }
  );

  it.each(["-0.1", "1.1", "abc", ""])(
    "throws for invalid appearance threshold '%s'",
    (appearance) => {
      expect(() => validateWatchlistForm({ ...validState, appearance }))
        .toThrow("Match thresholds must be numbers between 0 and 1.");
    }
  );
});

describe("validateTargetForm", () => {
  it("throws for whitespace-only label", () => {
    expect(() =>
      validateTargetForm({ label: "   ", metadata: "{}", enabled: true, files: [] })
    ).toThrow("target label is required");
  });

  it("formats update and specification payloads correctly", () => {
    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    const result = validateTargetForm({
      label: "  John Doe  ",
      metadata: '{"dept":"security"}',
      enabled: true,
      files: [file],
    });

    expect(result.update).toEqual({
      label: "John Doe",
      metadata: { dept: "security" },
      is_enabled: true,
    });
    expect(result.specification).toEqual({
      label: "John Doe",
      metadata: { dept: "security" },
      image_file_names: ["photo.jpg"],
    });
  });
});
