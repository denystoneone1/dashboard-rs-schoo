import { countWorkingDays, formatCurrency } from "../calculations.js";
import { MONTHS, POSITIONS, YEARS } from "../constants.js";
import { formatVacationRanges, getAge, isWeekday } from "../date-utils.js";
import {
  getAssignmentMetrics,
  getAssignedCapacity,
  getDashboardMetrics,
  getEmployeeMetrics,
  getProjectMetrics
} from "../dashboard-metrics.js";
import {
  filterEmployees,
  filterProjects,
  getEmployeeSortValue,
  getProjectSortValue,
  sortRows
} from "../table-helpers.js";
import { detailTable, emptyRow, escapeHtml, formatNumber, labelFor, option } from "../view-utils.js";

let state;
let allMonthlyData;

/**
 * Renders the full dashboard.
 */
export function renderDashboard({ state: nextState, data, monthlyData }) {
  state = nextState;
  allMonthlyData = monthlyData;
  return `
    <div class="dashboard ${state.sidebarCollapsed ? "is-collapsed" : ""}">
      ${renderSidebar()}
      <main class="main">
        ${renderHeader(data)}
        ${renderFilterChips()}
        ${state.currentTab === "projects" ? renderProjectsView(data) : renderEmployeesView(data)}
      </main>
      ${state.panel ? renderPanel(data) : ""}
      ${state.modal ? renderModal(data) : ""}
      ${state.floating ? renderFloating(data) : ""}
      ${state.actionMenu ? renderActionMenu(data) : ""}
    </div>
  `;
}

/**
 * Renders sidebar navigation and period controls.
 * @returns {string}
 */
function renderSidebar() {
  return `
    <aside class="sidebar" aria-label="Dashboard navigation">
      <button class="icon-button sidebar-toggle" data-action="toggle-sidebar" aria-label="Toggle sidebar">
        ${state.sidebarCollapsed ? ">" : "<"}
      </button>
      <div class="brand">
        <span class="brand-mark">D</span>
        <div>
          <h1>Dashboard</h1>
          <p>Planning workspace</p>
        </div>
      </div>
      <label class="field-label" for="month-select">Month</label>
      <select id="month-select" data-action="change-month">
        ${MONTHS.map((month, index) => option(index, month, state.currentMonth)).join("")}
      </select>
      <label class="field-label" for="year-select">Year</label>
      <select id="year-select" data-action="change-year">
        ${YEARS.map((year) => option(year, year, state.currentYear)).join("")}
      </select>
      <nav class="tabs" aria-label="Primary">
        <button class="${state.currentTab === "projects" ? "active" : ""}" data-action="switch-tab" data-tab="projects">Projects</button>
        <button class="${state.currentTab === "employees" ? "active" : ""}" data-action="switch-tab" data-tab="employees">Employees</button>
      </nav>
      <button class="secondary full" data-action="open-seed">Seed Data</button>
    </aside>
  `;
}

/**
 * Renders the page header.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderHeader(data) {
  const metrics = getDashboardMetrics(data, state);
  return `
    <header class="topbar">
      <div>
        <p class="period">${MONTHS[state.currentMonth]} ${state.currentYear}</p>
        <h2>${state.currentTab === "projects" ? "Projects" : "Employees"}</h2>
      </div>
      <div class="summary-strip">
        <span>${data.projects.length} projects</span>
        <span>${data.employees.length} employees</span>
        <span class="${metrics.totalEstimatedIncome >= 0 ? "positive" : "negative"}">${formatCurrency(metrics.totalEstimatedIncome)}</span>
      </div>
      <button class="primary" data-action="${state.currentTab === "projects" ? "open-project-panel" : "open-employee-panel"}">
        Add ${state.currentTab === "projects" ? "Project" : "Employee"}
      </button>
    </header>
  `;
}

/**
 * Renders active filter chips.
 * @returns {string}
 */
function renderFilterChips() {
  const filters = state.filters[state.currentTab];
  const entries = Object.entries(filters).filter(([, value]) => value);
  if (entries.length === 0) {
    return "";
  }
  return `
    <div class="chips">
      ${entries.map(([key, value]) => `<button class="chip" data-action="remove-filter" data-key="${key}">${labelFor(key)}: ${escapeHtml(value)} ×</button>`).join("")}
      ${entries.length > 1 ? `<button class="chip clear" data-action="clear-filters">Clear Filters</button>` : ""}
    </div>
  `;
}

/**
 * Renders the projects table view.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderProjectsView(data) {
  const rows = sortRows(filterProjects(data.projects, state.filters.projects), state.sort.projects, (project, key) => getProjectSortValue(data, project, key, state));
  const metrics = getDashboardMetrics(data, state);
  return `
    <section class="table-section">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${projectHeader("companyName", "Company Name", true)}
              ${projectHeader("projectName", "Project Name", true)}
              ${projectHeader("budget", "Budget")}
              ${projectHeader("capacity", "Employee Capacity")}
              <th>Employees</th>
              ${projectHeader("income", "Estimated Income")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((project) => renderProjectRow(data, project)).join("") : emptyRow(7, "No projects match the current filters.")}
          </tbody>
        </table>
      </div>
      <footer class="table-total">
        <span>Total Estimated Income</span>
        <strong class="${metrics.totalEstimatedIncome >= 0 ? "positive" : "negative"}">${formatCurrency(metrics.totalEstimatedIncome)}</strong>
      </footer>
    </section>
  `;
}

/**
 * Renders one project row.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} project Project object.
 * @returns {string}
 */
function renderProjectRow(data, project) {
  const metrics = getProjectMetrics(data, project, state);
  return `
    <tr>
      <td>${escapeHtml(project.companyName)}</td>
      <td>${escapeHtml(project.projectName)}</td>
      <td>${formatCurrency(project.budget)}</td>
      <td><span class="${metrics.usedCapacity > project.capacity ? "capacity-over" : ""}">${formatNumber(metrics.usedCapacity, 2)}/${project.capacity}</span></td>
      <td><button class="link-button" data-action="show-project-employees" data-project-id="${project.id}">Show Employees (${metrics.assignments.length})</button></td>
      <td class="${metrics.income >= 0 ? "positive" : "negative"}">${formatCurrency(metrics.income)}</td>
      <td><button class="danger ghost" data-action="delete-project" data-project-id="${project.id}">Delete</button></td>
    </tr>
  `;
}

/**
 * Renders the employees table view.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderEmployeesView(data) {
  const rows = sortRows(filterEmployees(data.employees, state.filters.employees), state.sort.employees, (employee, key) => getEmployeeSortValue(data, employee, key, state));
  return `
    <section class="table-section">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${employeeHeader("name", "Name", true)}
              ${employeeHeader("surname", "Surname", true)}
              ${employeeHeader("age", "Age")}
              ${employeeHeader("position", "Position", true)}
              ${employeeHeader("salary", "Salary")}
              ${employeeHeader("estimatedPayment", "Estimated Payment")}
              <th>Project</th>
              ${employeeHeader("projectedIncome", "Projected Income")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((employee) => renderEmployeeRow(data, employee)).join("") : emptyRow(9, "No employees match the current filters.")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

/**
 * Renders one employee row.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} employee Employee object.
 * @returns {string}
 */
function renderEmployeeRow(data, employee) {
  const metrics = getEmployeeMetrics(data, employee, state);
  const atCapacity = metrics.assignedCapacity >= 1.5;
  return `
    <tr>
      <td>${escapeHtml(employee.name)}</td>
      <td>${escapeHtml(employee.surname)}</td>
      <td>${getAge(employee.dateOfBirth)}</td>
      <td>
        <select class="inline-select" data-action="edit-position" data-employee-id="${employee.id}">
          ${POSITIONS.map((position) => option(position, position, employee.position)).join("")}
        </select>
      </td>
      <td><input class="inline-input" type="number" min="0" step="0.01" value="${employee.salary}" data-action="edit-salary" data-employee-id="${employee.id}" /></td>
      <td>${formatCurrency(metrics.estimatedPayment)}</td>
      <td><button class="link-button" data-action="show-employee-assignments" data-employee-id="${employee.id}">Show Assignments (${employee.assignments.length}) ${formatNumber(metrics.assignedCapacity, 1)}/1.5</button></td>
      <td class="${metrics.projectedIncome >= 0 ? "positive" : "negative"}">${formatCurrency(metrics.projectedIncome)}</td>
      <td class="actions">
        <button class="ghost" data-action="open-calendar" data-employee-id="${employee.id}">Availability</button>
        <button class="ghost" data-action="open-assign" data-employee-id="${employee.id}" ${atCapacity ? "disabled" : ""}>Assign</button>
        <button class="danger ghost" data-action="delete-employee" data-employee-id="${employee.id}">Delete</button>
      </td>
    </tr>
  `;
}

/**
 * Creates a sortable/filterable project header cell.
 * @param {string} key Column key.
 * @param {string} label Column label.
 * @param {boolean} filterable Whether filter button should render.
 * @returns {string}
 */
function projectHeader(key, label, filterable = false) {
  return tableHeader("projects", key, label, filterable);
}

/**
 * Creates a sortable/filterable employee header cell.
 * @param {string} key Column key.
 * @param {string} label Column label.
 * @param {boolean} filterable Whether filter button should render.
 * @returns {string}
 */
function employeeHeader(key, label, filterable = false) {
  return tableHeader("employees", key, label, filterable);
}

/**
 * Creates a table header control.
 * @param {string} scope Table scope.
 * @param {string} key Column key.
 * @param {string} label Column label.
 * @param {boolean} filterable Whether filter button should render.
 * @returns {string}
 */
function tableHeader(scope, key, label, filterable) {
  const sort = state.sort[scope];
  const icon = sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "⇅";
  return `
    <th>
      <span class="th-content">
        <button class="sort-button" data-action="sort" data-scope="${scope}" data-key="${key}">${label} ${icon}</button>
        ${filterable ? `<button class="filter-button" data-action="open-filter" data-scope="${scope}" data-key="${key}" aria-label="Filter ${label}">⌕</button>` : ""}
      </span>
    </th>
  `;
}

/**
 * Renders slide-in forms.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderPanel(data) {
  return `
    <div class="panel-backdrop" data-action="close-panel"></div>
    <aside class="slide-panel" aria-label="${state.panel === "project" ? "Add project" : "Add employee"}">
      <button class="icon-button close-button" data-action="close-panel" aria-label="Close">×</button>
      ${state.panel === "project" ? renderProjectForm() : renderEmployeeForm(data)}
    </aside>
  `;
}

/**
 * Renders add project form.
 * @returns {string}
 */
function renderProjectForm() {
  return `
    <form class="entity-form" data-form="project">
      <h3>Add Project</h3>
      ${inputField("projectName", "Project Name", "text", "Project name")}
      ${inputField("companyName", "Company Name", "text", "Company name")}
      ${inputField("budget", "Budget", "number", "0.00", "0.01")}
      ${inputField("capacity", "Employee Capacity", "number", "1", "1")}
      <button class="primary full" type="button" data-action="submit-project" disabled>Create Project</button>
    </form>
  `;
}

/**
 * Renders add employee form.
 * @returns {string}
 */
function renderEmployeeForm() {
  return `
    <form class="entity-form" data-form="employee">
      <h3>Add Employee</h3>
      ${inputField("name", "Name", "text", "Name")}
      ${inputField("surname", "Surname", "text", "Surname")}
      ${inputField("dateOfBirth", "Date of Birth", "date", "")}
      <label class="form-field">Position
        <select name="position" data-validate>
          <option value="">Select position</option>
          ${POSITIONS.map((position) => `<option value="${position}">${position}</option>`).join("")}
        </select>
        <span class="error"></span>
      </label>
      ${inputField("salary", "Salary", "number", "0.00", "0.01")}
      <button class="primary full" type="button" data-action="submit-employee" disabled>Create Employee</button>
    </form>
  `;
}

/**
 * Creates a reusable labeled input.
 * @param {string} name Input name.
 * @param {string} label Label text.
 * @param {string} type Input type.
 * @param {string} placeholder Placeholder text.
 * @param {string} step Numeric step value.
 * @returns {string}
 */
function inputField(name, label, type, placeholder, step = "") {
  return `
    <label class="form-field">${label}
      <input name="${name}" type="${type}" placeholder="${placeholder}" ${step ? `step="${step}"` : ""} data-validate />
      <span class="error"></span>
    </label>
  `;
}

/**
 * Renders modal content.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderModal(data) {
  const content = getModalContent(data);
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true">
        <button class="icon-button close-button" data-action="close-modal" aria-label="Close">×</button>
        ${content}
      </section>
    </div>
  `;
}

/**
 * Selects modal content by modal type.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function getModalContent(data) {
  if (state.modal?.type === "project-employees") {
    return renderProjectEmployeesModal(data, state.modal.projectId);
  }
  if (state.modal?.type === "employee-assignments") {
    return renderEmployeeAssignmentsModal(data, state.modal.employeeId);
  }
  if (state.modal?.type === "calendar") {
    return renderCalendarModal(data, state.modal.employeeId, state.modal.days);
  }
  if (state.modal?.type === "seed") {
    return renderSeedModal(data);
  }
  if (state.modal?.type === "unassign") {
    return renderUnassignModal(data, state.modal.employeeId, state.modal.projectId);
  }
  if (state.modal?.type === "edit-assignment") {
    return renderEditAssignmentModal(data, state.modal.employeeId, state.modal.projectId);
  }
  return "";
}

/**
 * Renders project employee detail modal.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {string} projectId Project id.
 * @returns {string}
 */
function renderProjectEmployeesModal(data, projectId) {
  const project = data.projects.find((item) => item.id === projectId);
  const metrics = getProjectMetrics(data, project, state);
  return `
    <h3>${escapeHtml(project.projectName)} Employees</h3>
    ${metrics.assignments.length ? detailTable(["Employee", "Capacity", "Fit", "Vacation", "Effective", "Revenue", "Cost", "Profit", "Actions"], metrics.assignments
      .sort((a, b) => a.employee.name.localeCompare(b.employee.name))
      .map((item) => [
        `<button class="name-link" data-action="open-action-menu" data-kind="employee" data-employee-id="${item.employee.id}">${escapeHtml(item.employee.name)} ${escapeHtml(item.employee.surname)}</button>`,
        formatNumber(item.assignment.capacity, 2),
        formatNumber(item.assignment.fit, 2),
        item.employee.vacations.length,
        formatNumber(item.effectiveCapacity, 3),
        formatCurrency(item.revenue),
        formatCurrency(item.cost),
        `<span class="${item.profit >= 0 ? "positive" : "negative"}">${formatCurrency(item.profit)}</span>`,
        assignmentActions(item.employee.id, project.id)
      ])) : `<p class="empty">No employees assigned to this project.</p>`}
  `;
}

/**
 * Renders employee assignment detail modal.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {string} employeeId Employee id.
 * @returns {string}
 */
function renderEmployeeAssignmentsModal(data, employeeId) {
  const employee = data.employees.find((item) => item.id === employeeId);
  const items = employee.assignments.map((assignment) => getAssignmentMetrics(data, employee, assignment, state)).filter(Boolean);
  return `
    <h3>${escapeHtml(employee.name)} ${escapeHtml(employee.surname)} Assignments</h3>
    ${items.length ? detailTable(["Project", "Capacity", "Fit", "Vacation", "Effective", "Revenue", "Cost", "Profit", "Actions"], items.map((item) => [
      `<button class="name-link" data-action="open-action-menu" data-kind="project" data-project-id="${item.project.id}">${escapeHtml(item.project.projectName)}</button>`,
      formatNumber(item.assignment.capacity, 2),
      formatNumber(item.assignment.fit, 2),
      employee.vacations.length,
      formatNumber(item.effectiveCapacity, 3),
      formatCurrency(item.revenue),
      formatCurrency(item.cost),
      `<span class="${item.profit >= 0 ? "positive" : "negative"}">${formatCurrency(item.profit)}</span>`,
      assignmentActions(employee.id, item.project.id)
    ])) : `<p class="empty">This employee has no assignments.</p>`}
  `;
}

/**
 * Renders edit and unassign buttons for an assignment.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 * @returns {string}
 */
function assignmentActions(employeeId, projectId) {
  return `
    <span class="row-actions">
      <button class="ghost" data-action="edit-assignment" data-employee-id="${employeeId}" data-project-id="${projectId}">Edit</button>
      <button class="danger ghost" data-action="confirm-unassign" data-employee-id="${employeeId}" data-project-id="${projectId}">Unassign</button>
    </span>
  `;
}

/**
 * Renders unassign confirmation with financial impact.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 * @returns {string}
 */
function renderUnassignModal(data, employeeId, projectId) {
  const employee = data.employees.find((item) => item.id === employeeId);
  const assignment = employee.assignments.find((item) => item.projectId === projectId);
  const item = getAssignmentMetrics(data, employee, assignment, state);
  const before = getProjectMetrics(data, item.project, state);
  const afterIncome = before.income - item.profit;
  return `
    <h3>Unassign ${escapeHtml(employee.name)} ${escapeHtml(employee.surname)}</h3>
    <div class="impact-grid">
      <span>Project</span><strong>${escapeHtml(item.project.projectName)}</strong>
      <span>Assigned capacity</span><strong>${formatNumber(assignment.capacity, 2)}</strong>
      <span>Employee salary share</span><strong>${formatCurrency(item.cost)}</strong>
      <span>Budget share</span><strong>${formatCurrency(item.revenue)}</strong>
      <span>Assignment income</span><strong class="${item.profit >= 0 ? "positive" : "negative"}">${formatCurrency(item.profit)}</strong>
      <span>Project capacity</span><strong>${formatNumber(before.usedCapacity, 2)} → ${formatNumber(before.usedCapacity - item.effectiveCapacity, 2)}</strong>
      <span>Project income</span><strong>${formatCurrency(before.income)} → ${formatCurrency(afterIncome)}</strong>
    </div>
    <div class="modal-actions">
      <button class="secondary" data-action="close-modal">Cancel</button>
      <button class="danger" data-action="unassign" data-employee-id="${employeeId}" data-project-id="${projectId}">Unassign</button>
    </div>
  `;
}

/**
 * Renders edit assignment controls.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 * @returns {string}
 */
function renderEditAssignmentModal(data, employeeId, projectId) {
  const employee = data.employees.find((item) => item.id === employeeId);
  const assignment = employee.assignments.find((item) => item.projectId === projectId);
  const usedWithoutCurrent = getAssignedCapacity(employee) - assignment.capacity;
  const max = Math.max(0, 1.5 - usedWithoutCurrent);
  return `
    <h3>Edit Assignment</h3>
    <form class="entity-form compact" data-form="edit-assignment">
      <label class="form-field">Capacity
        <input name="capacity" type="range" min="0" max="${max}" step="0.1" value="${assignment.capacity}" data-live="capacity" />
        <output>${formatNumber(assignment.capacity, 1)} / ${formatNumber(max, 1)}</output>
      </label>
      <label class="form-field">Project Fit
        <input name="fit" type="range" min="0" max="1" step="0.1" value="${assignment.fit}" data-live="fit" />
        <output>${formatNumber(assignment.fit, 1)}</output>
      </label>
      <div class="modal-actions">
        <button class="secondary" type="button" data-action="close-modal">Cancel</button>
        <button class="primary" type="button" data-action="save-assignment" data-employee-id="${employeeId}" data-project-id="${projectId}">Save</button>
      </div>
    </form>
  `;
}

/**
 * Renders vacation calendar modal.
 * @param {{employees: Array}} data Current month data.
 * @param {string} employeeId Employee id.
 * @param {number[]} selectedDays Selected day numbers.
 * @returns {string}
 */
function renderCalendarModal(data, employeeId, selectedDays) {
  const employee = data.employees.find((item) => item.id === employeeId);
  const days = selectedDays || employee.vacations || [];
  const workingDays = countWorkingDays(state.currentYear, state.currentMonth);
  const vacationWorkingDays = days.filter((day) => isWeekday(state.currentYear, state.currentMonth, day)).length;
  return `
    <h3>${escapeHtml(employee.name)} ${escapeHtml(employee.surname)} Availability</h3>
    <p class="period">${MONTHS[state.currentMonth]} ${state.currentYear}</p>
    <div class="calendar-meta">
      <strong>Working Days: ${workingDays - vacationWorkingDays}/${workingDays} days</strong>
      <span>${formatVacationRanges(days, state.currentYear, state.currentMonth)}</span>
    </div>
    <div class="calendar-grid week">
      ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<span>${day}</span>`).join("")}
    </div>
    <div class="calendar-grid">
      ${renderCalendarDays(days)}
    </div>
    <div class="modal-actions">
      <button class="secondary" data-action="close-modal">Cancel</button>
      <button class="primary" data-action="save-vacation" data-employee-id="${employeeId}">Set Vacation</button>
    </div>
  `;
}

/**
 * Renders calendar day buttons.
 * @param {number[]} selectedDays Selected days.
 * @returns {string}
 */
function renderCalendarDays(selectedDays) {
  const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const today = new Date();
  const blanks = Array.from({ length: firstDay }, () => `<span></span>`).join("");
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(state.currentYear, state.currentMonth, day);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const selected = selectedDays.includes(day);
    const isToday = today.getFullYear() === state.currentYear && today.getMonth() === state.currentMonth && today.getDate() === day;
    return `<button class="${weekend ? "weekend" : ""} ${selected ? "selected" : ""} ${isToday ? "today" : ""}" data-action="toggle-vacation-day" data-day="${day}">${day}</button>`;
  }).join("");
  return blanks + days;
}

/**
 * Renders seed data modal.
 * @returns {string}
 */
function renderSeedModal() {
  const entries = Object.entries(allMonthlyData).filter(([key]) => key !== `${state.currentYear}-${state.currentMonth}`);
  return `
    <h3>Seed Data</h3>
    ${entries.length ? `<div class="seed-list">${entries.map(([key, monthData]) => renderSeedOption(key, monthData)).join("")}</div>` : `<p class="empty">No other months contain data yet.</p>`}
  `;
}

/**
 * Renders one seed source option.
 * @param {string} key Period key.
 * @param {{employees: Array, projects: Array}} monthData Source data.
 * @returns {string}
 */
function renderSeedOption(key, monthData) {
  const [year, month] = key.split("-").map(Number);
  const metrics = getDashboardMetrics(monthData, state);
  return `
    <article class="seed-option">
      <div>
        <strong>${MONTHS[month]} ${year}</strong>
        <span>${monthData.projects.length} projects · ${monthData.employees.length} employees</span>
        <span class="${metrics.totalEstimatedIncome >= 0 ? "positive" : "negative"}">${formatCurrency(metrics.totalEstimatedIncome)}</span>
      </div>
      <button class="primary" data-action="seed-month" data-key="${key}">Seed</button>
    </article>
  `;
}

/**
 * Renders floating filter or assignment popup.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderFloating(data) {
  if (state.floating.type === "filter") {
    return renderFilterPopup();
  }
  return renderAssignPopup(data, state.floating.employeeId);
}

/**
 * Renders a filter popup.
 * @returns {string}
 */
function renderFilterPopup() {
  const { scope, key } = state.floating;
  const currentValue = state.filters[scope][key] || "";
  const isPosition = key === "position";
  return `
    <div class="floating" data-floating>
      <h4>Filter ${labelFor(key)}</h4>
      ${isPosition ? `
        <select name="filterValue" data-action="filter-position-change">
          <option value="">Any position</option>
          ${POSITIONS.map((position) => option(position, position, currentValue)).join("")}
        </select>
      ` : `<input name="filterValue" type="text" value="${escapeHtml(currentValue)}" placeholder="Type value" />`}
      <div class="floating-actions">
        <button class="secondary" data-action="close-floating">Cancel</button>
        <button class="primary" data-action="apply-filter" data-scope="${scope}" data-key="${key}">Apply</button>
      </div>
    </div>
  `;
}

/**
 * Renders assignment popup near clicked button.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {string} employeeId Employee id.
 * @returns {string}
 */
function renderAssignPopup(data, employeeId) {
  const employee = data.employees.find((item) => item.id === employeeId);
  const assigned = getAssignedCapacity(employee);
  const available = Math.max(0, 1.5 - assigned);
  const assignedProjectIds = new Set(employee.assignments.map((assignment) => assignment.projectId));
  const availableProjects = data.projects.filter((project) => !assignedProjectIds.has(project.id));
  const selectedProject = availableProjects.find((project) => project.id === state.floating.projectId)
    || availableProjects[0];
  const capacity = Math.min(available, Number(state.floating.capacity ?? 0.5));
  const fit = Number(state.floating.fit ?? 1);
  const projectMetrics = selectedProject ? getProjectMetrics(data, selectedProject, state) : null;
  return `
    <div class="floating assignment-popup" data-floating>
      <h4>Assign ${escapeHtml(employee.name)}</h4>
      <p class="muted">Current capacity ${formatNumber(assigned, 1)}/1.5 · available ${formatNumber(available, 1)}</p>
      <label class="form-field">Project
        <select name="projectId" data-action="assign-project-change">
          ${availableProjects.length
            ? availableProjects.map((project) => `<option value="${project.id}" ${selectedProject?.id === project.id ? "selected" : ""}>${escapeHtml(project.projectName)} (${formatNumber(getProjectMetrics(data, project, state).usedCapacity, 1)}/${project.capacity})</option>`).join("")
            : `<option value="">No available projects</option>`}
        </select>
      </label>
      <label class="form-field">Capacity
        <input name="capacity" type="range" min="0" max="${available}" step="0.1" value="${capacity}" data-action="assign-live" />
        <output>${formatNumber(capacity, 1)}</output>
      </label>
      <label class="form-field">Project Fit
        <input name="fit" type="range" min="0" max="1" step="0.1" value="${fit}" data-action="assign-live" />
        <output>${formatNumber(fit, 1)}</output>
      </label>
      <div class="hint">
        Effective capacity: ${formatNumber(capacity * fit, 2)}
        ${projectMetrics && projectMetrics.usedCapacity + capacity * fit > selectedProject.capacity ? `<br><span class="negative">Project capacity will be exceeded.</span>` : ""}
      </div>
      <div class="floating-actions">
        <button class="secondary" data-action="close-floating">Cancel</button>
        <button class="primary" data-action="assign-employee" data-employee-id="${employeeId}" ${!selectedProject || available <= 0 ? "disabled" : ""}>Assign</button>
      </div>
    </div>
  `;
}

/**
 * Renders small navigation action menu.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @returns {string}
 */
function renderActionMenu(data) {
  const isEmployee = state.actionMenu.kind === "employee";
  const employee = data.employees.find((item) => item.id === state.actionMenu.employeeId);
  const project = data.projects.find((item) => item.id === state.actionMenu.projectId);
  return `
    <div class="action-menu" data-action-menu>
      <button data-action="${isEmployee ? "see-employee" : "see-project"}" ${isEmployee ? `data-employee-id="${employee.id}"` : `data-project-id="${project.id}"`}>
        See at ${isEmployee ? "Employees" : "Projects"}
      </button>
      ${state.actionMenu.employeeId && state.actionMenu.projectId ? `<button class="danger-text" data-action="confirm-unassign" data-employee-id="${state.actionMenu.employeeId}" data-project-id="${state.actionMenu.projectId}">Unassign</button>` : ""}
    </div>
  `;
}
