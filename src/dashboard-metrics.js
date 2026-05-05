import {
  calculateAssignmentCost,
  calculateEffectiveCapacity,
  getVacationCoefficient
} from "./calculations.js";
import { getAge } from "./date-utils.js";

export { getAge };

/**
 * Calculates project metrics from assignments.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} project Project object.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {{assignments: Array, usedCapacity: number, income: number}}
 */
export function getProjectMetrics(data, project, period) {
  const assignments = data.employees.flatMap((employee) => {
    return employee.assignments
      .filter((assignment) => assignment.projectId === project.id)
      .map((assignment) => getAssignmentMetrics(data, employee, assignment, period));
  }).filter(Boolean);
  const usedCapacity = assignments.reduce((sum, item) => sum + item.effectiveCapacity, 0);
  const revenue = assignments.reduce((sum, item) => sum + item.revenue, 0);
  const cost = assignments.reduce((sum, item) => sum + item.cost, 0);
  return { assignments, usedCapacity, income: revenue - cost };
}

/**
 * Calculates employee metrics.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} employee Employee object.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {{assignedCapacity: number, estimatedPayment: number, projectedIncome: number}}
 */
export function getEmployeeMetrics(data, employee, period) {
  const items = employee.assignments.map((assignment) => getAssignmentMetrics(data, employee, assignment, period)).filter(Boolean);
  const assignedCapacity = getAssignedCapacity(employee);
  const estimatedPayment = items.length
    ? items.reduce((sum, item) => sum + item.cost, 0)
    : employee.salary * 0.5;
  const projectedIncome = items.reduce((sum, item) => sum + item.profit, 0);
  return { assignedCapacity, estimatedPayment, projectedIncome };
}

/**
 * Calculates metrics for a single assignment.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} employee Employee object.
 * @param {object} assignment Assignment object.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {object|null}
 */
export function getAssignmentMetrics(data, employee, assignment, period) {
  const project = data.projects.find((item) => item.id === assignment.projectId);
  if (!project) {
    return null;
  }
  const allEffectiveCapacity = data.employees.reduce((sum, currentEmployee) => {
    const matching = currentEmployee.assignments.find((item) => item.projectId === project.id);
    if (!matching) return sum;
    const vacationCoefficient = getVacationCoefficient(period.currentYear, period.currentMonth, currentEmployee.vacations);
    return sum + calculateEffectiveCapacity(matching.capacity, matching.fit, vacationCoefficient);
  }, 0);
  const capacityForRevenue = Math.max(project.capacity, allEffectiveCapacity);
  const revenuePerEffectiveCapacity = project.budget / capacityForRevenue;
  const vacationCoefficient = getVacationCoefficient(period.currentYear, period.currentMonth, employee.vacations);
  const effectiveCapacity = calculateEffectiveCapacity(assignment.capacity, assignment.fit, vacationCoefficient);
  const revenue = revenuePerEffectiveCapacity * effectiveCapacity;
  const cost = calculateAssignmentCost(employee.salary, assignment.capacity);
  return {
    employee,
    project,
    assignment,
    effectiveCapacity,
    revenue,
    cost,
    profit: revenue - cost
  };
}

/**
 * Calculates dashboard total income including bench employees.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {{totalEstimatedIncome: number}}
 */
export function getDashboardMetrics(data, period) {
  const projectIncome = data.projects.reduce((sum, project) => sum + getProjectMetrics(data, project, period).income, 0);
  const benchCost = data.employees
    .filter((employee) => employee.assignments.length === 0)
    .reduce((sum, employee) => sum + employee.salary * 0.5, 0);
  return { totalEstimatedIncome: projectIncome - benchCost };
}

/**
 * Gets total assigned capacity for an employee.
 * @param {object} employee Employee object.
 * @returns {number}
 */
export function getAssignedCapacity(employee) {
  return employee.assignments.reduce((sum, assignment) => sum + Number(assignment.capacity), 0);
}
