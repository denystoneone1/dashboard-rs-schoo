import assert from "node:assert/strict";
import {
  calculateAssignmentCost,
  calculateEffectiveCapacity,
  calculateProjectEffectiveCapacity,
  countWorkingDays,
  getVacationCoefficient,
  hasValidAssignments
} from "../src/calculations.js";

assert.equal(countWorkingDays(2026, 0), 22);
assert.equal(getVacationCoefficient(2026, 0, [3, 4]), 1);
assert.equal(getVacationCoefficient(2026, 0, [5, 6]), 20 / 22);
assert.equal(calculateEffectiveCapacity(0.8, 0.9, 20 / 22), 0.8 * 0.9 * (20 / 22));
assert.equal(calculateAssignmentCost(10000, 0.2), 5000);
assert.equal(calculateAssignmentCost(10000, 0.8), 8000);
assert.equal(hasValidAssignments({ assignments: [{ projectId: "missing" }] }, [{ id: "project-1" }]), false);
assert.equal(hasValidAssignments({ assignments: [{ projectId: "project-1" }] }, [{ id: "project-1" }]), true);
assert.equal(
  calculateProjectEffectiveCapacity(
    [
      {
        vacations: [],
        assignments: [
          { projectId: "project-1", capacity: 0.4, fit: 1 },
          { projectId: "project-1", capacity: 0.3, fit: 0.5 },
          { projectId: "project-2", capacity: 1, fit: 1 }
        ]
      }
    ],
    "project-1",
    2026,
    0
  ),
  0.55
);

console.log("Calculation tests passed.");
