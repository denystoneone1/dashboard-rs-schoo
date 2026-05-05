/**
 * Counts weekdays for a calendar month.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {number}
 */
export function countWorkingDays(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month, day).getDay();
    if (weekday !== 0 && weekday !== 6) {
      workingDays += 1;
    }
  }
  return workingDays;
}

/**
 * Calculates the availability coefficient after vacation weekdays are removed.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @param {number[]} vacationDays Selected vacation day numbers.
 * @returns {number}
 */
export function getVacationCoefficient(year, month, vacationDays = []) {
  const workingDays = countWorkingDays(year, month);
  if (workingDays === 0) {
    return 1;
  }
  const vacationWorkingDays = vacationDays.filter((day) => {
    const weekday = new Date(year, month, day).getDay();
    return weekday !== 0 && weekday !== 6;
  }).length;

  return (workingDays - vacationWorkingDays) / workingDays;
}

/**
 * Calculates assignment capacity adjusted by project fit and vacation days.
 * @param {number} capacity Assigned capacity.
 * @param {number} fit Project fit coefficient.
 * @param {number} vacationCoefficient Employee availability coefficient.
 * @returns {number}
 */
export function calculateEffectiveCapacity(capacity, fit, vacationCoefficient) {
  return capacity * fit * vacationCoefficient;
}

/**
 * Calculates employee cost for an assignment with minimum bench payment.
 * @param {number} salary Monthly salary.
 * @param {number} capacity Assigned capacity.
 * @returns {number}
 */
export function calculateAssignmentCost(salary, capacity) {
  return salary * Math.max(0.5, capacity);
}

/**
 * Checks whether an employee has at least one assignment linked to an existing project.
 * @param {{assignments: Array}} employee Employee object.
 * @param {Array<{id: string}>} projects Project list.
 * @returns {boolean}
 */
export function hasValidAssignments(employee, projects) {
  return employee.assignments.some((assignment) => {
    return projects.some((project) => project.id === assignment.projectId);
  });
}

/**
 * Sums all effective capacities assigned to a project across all employees.
 * @param {Array} employees Employee list.
 * @param {string} projectId Project id.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {number}
 */
export function calculateProjectEffectiveCapacity(employees, projectId, year, month) {
  return employees.reduce((sum, currentEmployee) => {
    const matchingAssignments = currentEmployee.assignments.filter((item) => item.projectId === projectId);
    if (!matchingAssignments.length) return sum;
    const vacationCoefficient = getVacationCoefficient(year, month, currentEmployee.vacations);
    const employeeEffectiveCapacity = matchingAssignments.reduce((total, matching) => {
      return total + calculateEffectiveCapacity(matching.capacity, matching.fit, vacationCoefficient);
    }, 0);
    return sum + employeeEffectiveCapacity;
  }, 0);
}

/**
 * Formats a number as USD currency for dashboard tables.
 * @param {number} value Numeric amount.
 * @returns {string}
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(value);
}
