import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export type PersonSummary = {
  personId: string;
  alertCount: number;
  firstSeen: string;
  lastSeen: string;
  sampleImagePath?: string;
};

const fetchPeople = async (): Promise<PersonSummary[]> => {
  try {
    const { data } = await api.get("/events/people");
    return data || [];
  } catch {
    // The people endpoint may not exist in every deployment yet.
    return [];
  }
};

export const useGetPeople = () => {
  return useQuery({
    queryKey: ["people"],
    queryFn: fetchPeople,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};
