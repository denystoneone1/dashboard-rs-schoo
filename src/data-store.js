import { STORAGE_KEY } from "./constants.js";

/**
 * Returns the localStorage key for a period.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {string}
 */
export function periodKey(year, month) {
  return `${year}-${month}`;
}

/**
 * Safely reads all saved monthly snapshots.
 * @returns {Record<string, {employees: Array, projects: Array}>}
 */
export function readMonthlyData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Writes all snapshots to localStorage.
 * @param {Record<string, {employees: Array, projects: Array}>} data Snapshot map.
 */
export function writeMonthlyData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Builds deterministic sample data for the first app load.
 * @returns {{employees: Array, projects: Array}}
 */
export function createSampleMonth() {
  const projects = [
    createProject("Analytics Hub", "Northwind Labs", 45000, 3),
    createProject("Billing Portal", "Acme Finance", 32000, 2),
    createProject("Ops Console", "Vector Cloud", 28000, 2)
  ];
  const employees = [
    createEmployee("Olivia", "Stone", "1994-03-12", "Senior", 8200, [5, 6], [
      { projectId: projects[0].id, capacity: 0.8, fit: 0.9 },
      { projectId: projects[1].id, capacity: 0.4, fit: 0.8 }
    ]),
    createEmployee("James", "Miller", "1991-10-04", "Lead", 10400, [], [
      { projectId: projects[0].id, capacity: 1, fit: 1 }
    ]),
    createEmployee("Sophia", "Clark", "1998-07-24", "Middle", 6100, [14, 15, 16], [
      { projectId: projects[2].id, capacity: 0.7, fit: 0.7 }
    ]),
    createEmployee("Daniel", "Reed", "1988-01-29", "Architect", 12600, [], [])
  ];
  return { employees, projects };
}

/**
 * Creates a project object.
 * @param {string} projectName Project name.
 * @param {string} companyName Company name.
 * @param {number} budget Monthly budget.
 * @param {number} capacity Planned employee capacity.
 * @returns {object}
 */
export function createProject(projectName, companyName, budget, capacity) {
  return {
    id: crypto.randomUUID(),
    projectName,
    companyName,
    budget: Number(budget),
    capacity: Number(capacity)
  };
}

/**
 * Creates an employee object.
 * @param {string} name Employee name.
 * @param {string} surname Employee surname.
 * @param {string} dateOfBirth Birth date in ISO format.
 * @param {string} position Position value.
 * @param {number} salary Monthly salary.
 * @param {number[]} vacations Vacation day numbers.
 * @param {Array} assignments Project assignments.
 * @returns {object}
 */
export function createEmployee(name, surname, dateOfBirth, position, salary, vacations = [], assignments = []) {
  return {
    id: crypto.randomUUID(),
    name,
    surname,
    dateOfBirth,
    position,
    salary: Number(salary),
    vacations,
    assignments
  };
}
