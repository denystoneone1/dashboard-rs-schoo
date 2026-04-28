import assert from "node:assert/strict";
import {
  calculateAssignmentCost,
  calculateEffectiveCapacity,
  countWorkingDays,
  getVacationCoefficient
} from "../src/calculations.js";

assert.equal(countWorkingDays(2026, 0), 22);
assert.equal(getVacationCoefficient(2026, 0, [3, 4]), 1);
assert.equal(getVacationCoefficient(2026, 0, [5, 6]), 20 / 22);
assert.equal(calculateEffectiveCapacity(0.8, 0.9, 20 / 22), 0.8 * 0.9 * (20 / 22));
assert.equal(calculateAssignmentCost(10000, 0.2), 5000);
assert.equal(calculateAssignmentCost(10000, 0.8), 8000);

console.log("Calculation tests passed.");
