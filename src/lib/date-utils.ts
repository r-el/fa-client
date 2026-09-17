import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function formatDateTime(dateString: string): string {
  if (!dateString) return "—";
  const date = parseISO(dateString);
  if (!isValid(date)) return "—";
  return format(date, "MMM d, yyyy HH:mm");
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return "—";
  const date = parseISO(dateString);
  if (!isValid(date)) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}
