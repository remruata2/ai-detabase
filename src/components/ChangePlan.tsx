'use client';

import { Button } from "@/components/ui/button";

interface Plan {
  id: number;
  name: string;
  price: number;
  interval: string;
}

interface ChangePlanProps {
  currentPlanId: number;
  allPlans: Plan[];
}

export function ChangePlan({ currentPlanId, allPlans }: ChangePlanProps) {
  const handleChangePlan = async (newPlanId: number) => {
    try {
      const response = await fetch('/api/stripe/change-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to change plan');
      }
    } catch (error) {
      alert('Error changing plan');
    }
  };

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Change Plan</h4>
      <div className="space-y-2">
        {allPlans.filter(p => p.id !== currentPlanId).map(p => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            onClick={() => handleChangePlan(p.id)}
          >
            Switch to {p.name} (${p.price}/{p.interval})
          </Button>
        ))}
      </div>
    </div>
  );
}