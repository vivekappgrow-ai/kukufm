export type SubscriptionPlan = {
  id: "free" | "monthly" | "yearly" | "family";
  name: string;
  amount: number;
  interval: "day" | "month" | "year";
  description: string;
  features: string[];
  highlighted?: boolean;
};

export const plans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    amount: 0,
    interval: "day",
    description: "A little learning, every day.",
    features: [
      "1 lesson per day",
      "3 AI chat messages per day",
      "5 AI voice minutes per day",
      "No camera mode",
      "No downloads",
      "Basic learning progress",
    ],
  },
  {
    id: "monthly",
    name: "Premium Monthly",
    amount: 149,
    interval: "month",
    description: "More room to follow every question.",
    features: [
      "Unlimited lessons",
      "More AI learning time",
      "Camera mode",
      "Offline downloads",
      "Detailed learning progress",
    ],
  },
  {
    id: "yearly",
    name: "Premium Yearly",
    amount: 999,
    interval: "year",
    description: "A whole year of curious moments.",
    features: [
      "Everything in Premium",
      "Unlimited lessons",
      "AI chat, voice and camera",
      "Offline downloads",
      "Detailed learning progress",
    ],
    highlighted: true,
  },
  {
    id: "family",
    name: "Family",
    amount: 1499,
    interval: "year",
    description: "Premium learning for up to 3 children.",
    features: [
      "Premium for up to 3 children",
      "Individual learning profiles",
      "AI chat, voice and camera",
      "Offline downloads",
      "Detailed learning progress",
    ],
  },
];

export const freePlan = plans.find((plan) => plan.id === "free")!;
export const monthlyPlan = plans.find((plan) => plan.id === "monthly")!;
export const yearlyPlan = plans.find((plan) => plan.id === "yearly")!;
export const familyPlan = plans.find((plan) => plan.id === "family")!;

export const yearlySavingsPercent = Math.round(
  (1 - yearlyPlan.amount / (monthlyPlan.amount * 12)) * 100,
);

export function formatPlanPrice(plan: SubscriptionPlan) {
  if (plan.id === "free") return "Free";
  return `₹${plan.amount.toLocaleString("en-IN")}/${plan.interval === "month" ? "month" : "year"}`;
}
