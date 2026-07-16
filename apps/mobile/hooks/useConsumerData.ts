import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { type DiscountCode } from "@funfsterne/shared-types";

export interface ConsumerDiscountCode extends DiscountCode {
  redeemed: boolean;
}

export function useConsumerDiscountCodes() {
  return useQuery<ConsumerDiscountCode[]>({
    queryKey: ["consumer", "discount-codes"],
    queryFn: () => apiFetch<ConsumerDiscountCode[]>("/consumer/me/discount-codes"),
  });
}
