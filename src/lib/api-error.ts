import axios from "axios";

export interface ApiErrorOverrides {
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
}

/**
 * Extracts a user-friendly error message from an unknown error or Axios response.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred.",
  overrides?: ApiErrorOverrides
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      return overrides?.unauthorized ?? "Authentication required. Please login again.";
    }
    if (status === 403) {
      return overrides?.forbidden ?? "You do not have permission to perform this action.";
    }
    if (status === 404 && overrides?.notFound) {
      return overrides.notFound;
    }
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
