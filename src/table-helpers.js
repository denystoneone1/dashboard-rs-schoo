import { getAge, getEmployeeMetrics, getProjectMetrics } from "./dashboard-metrics.js";

/**
 * Filters project rows.
 * @param {Array} projects Projects list.
 * @param {Record<string, string>} filters Active project filters.
 * @returns {Array}
 */
export function filterProjects(projects, filters) {
  return projects.filter((project) => {
    return (!filters.companyName || project.companyName.toLowerCase().includes(filters.companyName.toLowerCase()))
      && (!filters.projectName || project.projectName.toLowerCase().includes(filters.projectName.toLowerCase()));
  });
}

/**
 * Filters employee rows.
 * @param {Array} employees Employees list.
 * @param {Record<string, string>} filters Active employee filters.
 * @returns {Array}
 */
export function filterEmployees(employees, filters) {
  return employees.filter((employee) => {
    return (!filters.name || employee.name.toLowerCase().includes(filters.name.toLowerCase()))
      && (!filters.surname || employee.surname.toLowerCase().includes(filters.surname.toLowerCase()))
      && (!filters.position || employee.position === filters.position);
  });
}

/**
 * Sorts rows by calculated value.
 * @param {Array} rows Rows to sort.
 * @param {{key: string, direction: string}} sort Sort state.
 * @param {(row: object, key: string) => string|number} getter Value getter.
 * @returns {Array}
 */
export function sortRows(rows, sort, getter) {
  return [...rows].sort((a, b) => {
    const first = getter(a, sort.key);
    const second = getter(b, sort.key);
    const result = typeof first === "number" ? first - second : String(first).localeCompare(String(second));
    return sort.direction === "asc" ? result : -result;
  });
}

/**
 * Gets project sort value.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} project Project row.
 * @param {string} key Sort key.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {string|number}
 */
export function getProjectSortValue(data, project, key, period) {
  if (key === "capacity") return getProjectMetrics(data, project, period).usedCapacity;
  if (key === "income") return getProjectMetrics(data, project, period).income;
  return project[key];
}

/**
 * Gets employee sort value.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} employee Employee row.
 * @param {string} key Sort key.
 * @param {{currentYear: number, currentMonth: number}} period Current period state.
 * @returns {string|number}
 */
export function getEmployeeSortValue(data, employee, key, period) {
  if (key === "age") return getAge(employee.dateOfBirth);
  if (key === "estimatedPayment") return getEmployeeMetrics(data, employee, period).estimatedPayment;
  if (key === "projectedIncome") return getEmployeeMetrics(data, employee, period).projectedIncome;
  return employee[key];
}
