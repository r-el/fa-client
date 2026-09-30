import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getApiErrorMessage } from "../api-error";

describe("getApiErrorMessage", () => {
  it("returns fallback for unknown non-error values", () => {
    expect(getApiErrorMessage(null, "Fallback error")).toBe("Fallback error");
    expect(getApiErrorMessage("string error", "Fallback error")).toBe("Fallback error");
  });

  it("returns error message for standard Error instance", () => {
    expect(getApiErrorMessage(new Error("Database disconnected"), "Fallback")).toBe("Database disconnected");
  });

  it("handles 401 Unauthorized with default and override message", () => {
    const error401 = new AxiosError("Unauthorized", "401", undefined, undefined, {
      status: 401,
      statusText: "Unauthorized",
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    });
    expect(getApiErrorMessage(error401)).toBe("Authentication required. Please login again.");
    expect(getApiErrorMessage(error401, "Fallback", { unauthorized: "Please sign in to proceed." }))
      .toBe("Please sign in to proceed.");
  });

  it("handles 403 Forbidden with default and override message", () => {
    const error403 = new AxiosError("Forbidden", "403", undefined, undefined, {
      status: 403,
      statusText: "Forbidden",
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    });
    expect(getApiErrorMessage(error403)).toBe("You do not have permission to perform this action.");
    expect(getApiErrorMessage(error403, "Fallback", { forbidden: "Admin access required." }))
      .toBe("Admin access required.");
  });

  it("extracts error field from axios response data", () => {
    const apiError = new AxiosError("Bad Request", "400", undefined, undefined, {
      status: 400,
      statusText: "Bad Request",
      data: { error: "Camera name is already taken" },
      headers: {},
      config: { headers: new AxiosHeaders() },
    });
    expect(getApiErrorMessage(apiError)).toBe("Camera name is already taken");
  });
});
