import {
  calculateAssignmentCost,
  calculateEffectiveCapacity,
  countWorkingDays,
  formatCurrency,
  getVacationCoefficient
} from "./src/calculations.js";

const STORAGE_KEY = "monthlyData";
const POSITIONS = ["Junior", "Middle", "Senior", "Lead", "Architect", "BO"];
const YEARS = [2025, 2026, 2027];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const state = {
  currentTab: "projects",
  sidebarCollapsed: false,
  currentMonth: new Date().getMonth(),
  currentYear: YEARS.includes(new Date().getFullYear()) ? new Date().getFullYear() : 2026,
  filters: {
    projects: {},
    employees: {}
  },
  sort: {
    projects: { key: "companyName", direction: "asc" },
    employees: { key: "name", direction: "asc" }
  },
  panel: null,
  modal: null,
  floating: null,
  actionMenu: null
};

const app = document.querySelector("#app");

/**
 * Starts the application and binds global event listeners.
 */
function initDashboard() {
  ensurePeriodData();
  render();
  app.addEventListener("click", handleClick);
  app.addEventListener("input", handleInput);
  app.addEventListener("change", handleChange);
  app.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", repositionFloatingPopup);
  window.addEventListener("scroll", repositionFloatingPopup, true);
}

/**
 * Returns the localStorage key for a period.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {string}
 */
function periodKey(year = state.currentYear, month = state.currentMonth) {
  return `${year}-${month}`;
}

/**
 * Safely reads all saved monthly snapshots.
 * @returns {Record<string, {employees: Array, projects: Array}>}
 */
function readMonthlyData() {
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
function writeMonthlyData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Makes sure selected month has a complete dataset.
 */
function ensurePeriodData() {
  const data = readMonthlyData();
  const key = periodKey();
  if (!data[key]) {
    data[key] = Object.keys(data).length === 0 ? createSampleMonth() : { employees: [], projects: [] };
    writeMonthlyData(data);
  }
}

/**
 * Gets selected month data.
 * @returns {{employees: Array, projects: Array}}
 */
function getCurrentData() {
  ensurePeriodData();
  return readMonthlyData()[periodKey()];
}

/**
 * Mutates selected month data and persists it.
 * @param {(monthData: {employees: Array, projects: Array}) => void} updater Data updater.
 */
function updateCurrentData(updater) {
  const data = readMonthlyData();
  const key = periodKey();
  data[key] ||= { employees: [], projects: [] };
  updater(data[key]);
  writeMonthlyData(data);
  render();
}

/**
 * Builds deterministic sample data for the first app load.
 * @returns {{employees: Array, projects: Array}}
 */
function createSampleMonth() {
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
function createProject(projectName, companyName, budget, capacity) {
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
function createEmployee(name, surname, dateOfBirth, position, salary, vacations = [], assignments = []) {
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

/**
 * Renders the full dashboard.
 */
function render() {
  const data = getCurrentData();
  app.innerHTML = `
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
  validateVisibleForms();
  repositionFloatingPopup();
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
  const metrics = getDashboardMetrics(data);
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
  const rows = sortRows(filterProjects(data.projects), state.sort.projects, (project, key) => getProjectSortValue(data, project, key));
  const metrics = getDashboardMetrics(data);
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
  const metrics = getProjectMetrics(data, project);
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
  const rows = sortRows(filterEmployees(data.employees), state.sort.employees, (employee, key) => getEmployeeSortValue(data, employee, key));
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
  const metrics = getEmployeeMetrics(data, employee);
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
  const metrics = getProjectMetrics(data, project);
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
  const items = employee.assignments.map((assignment) => getAssignmentMetrics(data, employee, assignment)).filter(Boolean);
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
  const item = getAssignmentMetrics(data, employee, assignment);
  const before = getProjectMetrics(data, item.project);
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
  const vacationWorkingDays = days.filter((day) => isWeekday(day)).length;
  return `
    <h3>${escapeHtml(employee.name)} ${escapeHtml(employee.surname)} Availability</h3>
    <p class="period">${MONTHS[state.currentMonth]} ${state.currentYear}</p>
    <div class="calendar-meta">
      <strong>Working Days: ${workingDays - vacationWorkingDays}/${workingDays} days</strong>
      <span>${formatVacationRanges(days)}</span>
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
  const data = readMonthlyData();
  const entries = Object.entries(data).filter(([key]) => key !== periodKey());
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
  const metrics = getDashboardMetrics(monthData);
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
        <select name="filterValue">
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
  const selectedProject = data.projects.find((project) => !employee.assignments.some((assignment) => assignment.projectId === project.id)) || data.projects[0];
  const capacity = Math.min(available, Number(state.floating.capacity ?? 0.5));
  const fit = Number(state.floating.fit ?? 1);
  const projectMetrics = selectedProject ? getProjectMetrics(data, selectedProject) : null;
  return `
    <div class="floating assignment-popup" data-floating>
      <h4>Assign ${escapeHtml(employee.name)}</h4>
      <p class="muted">Current capacity ${formatNumber(assigned, 1)}/1.5 · available ${formatNumber(available, 1)}</p>
      <label class="form-field">Project
        <select name="projectId" data-action="assign-project-change">
          ${data.projects.map((project) => `<option value="${project.id}" ${selectedProject?.id === project.id ? "selected" : ""}>${escapeHtml(project.projectName)} (${formatNumber(getProjectMetrics(data, project).usedCapacity, 1)}/${project.capacity})</option>`).join("")}
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

/**
 * Handles click events with action delegation.
 * @param {MouseEvent} event Click event.
 */
function handleClick(event) {
  const actionElement = event.target.closest("[data-action]");
  if (!actionElement) {
    closeLoosePopups(event);
    return;
  }
  const action = actionElement.dataset.action;
  if (action === "toggle-sidebar") toggleSidebar();
  if (action === "switch-tab") switchTab(actionElement.dataset.tab);
  if (action === "open-project-panel") openPanel("project");
  if (action === "open-employee-panel") openPanel("employee");
  if (action === "close-panel") closePanel(event);
  if (action === "submit-project") submitProject();
  if (action === "submit-employee") submitEmployee();
  if (action === "sort") sortTable(actionElement.dataset.scope, actionElement.dataset.key);
  if (action === "open-filter") openFilter(actionElement);
  if (action === "apply-filter") applyFilter(actionElement.dataset.scope, actionElement.dataset.key);
  if (action === "remove-filter") removeFilter(actionElement.dataset.key);
  if (action === "clear-filters") clearFilters();
  if (action === "close-floating") closeFloating();
  if (action === "delete-project") deleteProject(actionElement.dataset.projectId);
  if (action === "delete-employee") deleteEmployee(actionElement.dataset.employeeId);
  if (action === "show-project-employees") openModal({ type: "project-employees", projectId: actionElement.dataset.projectId });
  if (action === "show-employee-assignments") openModal({ type: "employee-assignments", employeeId: actionElement.dataset.employeeId });
  if (action === "close-modal") closeModal(event);
  if (action === "open-calendar") openCalendar(actionElement.dataset.employeeId);
  if (action === "toggle-vacation-day") toggleVacationDay(Number(actionElement.dataset.day));
  if (action === "save-vacation") saveVacation(actionElement.dataset.employeeId);
  if (action === "open-assign") openAssign(actionElement);
  if (action === "assign-employee") assignEmployee(actionElement.dataset.employeeId);
  if (action === "confirm-unassign") openModal({ type: "unassign", employeeId: actionElement.dataset.employeeId, projectId: actionElement.dataset.projectId });
  if (action === "unassign") unassignEmployee(actionElement.dataset.employeeId, actionElement.dataset.projectId);
  if (action === "edit-assignment") openModal({ type: "edit-assignment", employeeId: actionElement.dataset.employeeId, projectId: actionElement.dataset.projectId });
  if (action === "save-assignment") saveAssignment(actionElement.dataset.employeeId, actionElement.dataset.projectId);
  if (action === "open-seed") openModal({ type: "seed" });
  if (action === "seed-month") seedMonth(actionElement.dataset.key);
  if (action === "open-action-menu") openActionMenu(actionElement);
  if (action === "see-employee") seeEmployee(actionElement.dataset.employeeId);
  if (action === "see-project") seeProject(actionElement.dataset.projectId);
}

/**
 * Handles input events.
 * @param {InputEvent} event Input event.
 */
function handleInput(event) {
  const target = event.target;
  if (target.matches("[data-validate]")) {
    validateVisibleForms();
  }
  if (target.dataset.action === "assign-live") {
    state.floating.capacity = Number(document.querySelector("[data-floating] input[name='capacity']").value);
    state.floating.fit = Number(document.querySelector("[data-floating] input[name='fit']").value);
    render();
  }
  if (target.dataset.live) {
    target.nextElementSibling.textContent = formatNumber(Number(target.value), 1);
  }
}

/**
 * Handles change events.
 * @param {Event} event Change event.
 */
function handleChange(event) {
  const target = event.target;
  if (target.dataset.action === "change-month") {
    state.currentMonth = Number(target.value);
    resetTransientState();
    ensurePeriodData();
    render();
  }
  if (target.dataset.action === "change-year") {
    state.currentYear = Number(target.value);
    resetTransientState();
    ensurePeriodData();
    render();
  }
  if (target.dataset.action === "edit-position") {
    editEmployee(target.dataset.employeeId, (employee) => {
      employee.position = target.value;
    });
  }
  if (target.dataset.action === "edit-salary") {
    const value = Math.max(0, Number(target.value));
    editEmployee(target.dataset.employeeId, (employee) => {
      employee.salary = value;
    });
  }
  if (target.dataset.action === "assign-project-change") {
    state.floating.projectId = target.value;
    render();
  }
}

/**
 * Handles keyboard shortcuts for inline salary editing.
 * @param {KeyboardEvent} event Keyboard event.
 */
function handleKeydown(event) {
  if (event.key === "Escape") {
    resetTransientState();
    render();
  }
  if (event.key === "Enter" && event.target.dataset.action === "edit-salary") {
    event.target.blur();
  }
}

/**
 * Toggles sidebar collapsed state.
 */
function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  render();
}

/**
 * Switches between projects and employees view.
 * @param {string} tab Target tab.
 */
function switchTab(tab) {
  state.currentTab = tab;
  state.floating = null;
  state.actionMenu = null;
  render();
}

/**
 * Opens a slide panel.
 * @param {string} panel Panel type.
 */
function openPanel(panel) {
  state.panel = panel;
  render();
}

/**
 * Closes slide panel when backdrop or close button is clicked.
 * @param {MouseEvent} event Click event.
 */
function closePanel(event) {
  if (event.target.closest(".slide-panel") && !event.target.closest(".close-button")) {
    return;
  }
  state.panel = null;
  render();
}

/**
 * Opens a modal.
 * @param {object} modal Modal descriptor.
 */
function openModal(modal) {
  state.modal = modal;
  state.floating = null;
  state.actionMenu = null;
  render();
}

/**
 * Closes modal when backdrop or close button is clicked.
 * @param {MouseEvent} event Click event.
 */
function closeModal(event) {
  if (event.target.closest(".modal") && !event.target.closest(".close-button") && event.target.dataset.action !== "close-modal") {
    return;
  }
  state.modal = null;
  state.actionMenu = null;
  render();
}

/**
 * Resets open temporary UI surfaces.
 */
function resetTransientState() {
  state.panel = null;
  state.modal = null;
  state.floating = null;
  state.actionMenu = null;
}

/**
 * Submits a project after validation.
 */
function submitProject() {
  const form = document.querySelector("[data-form='project']");
  const formData = new FormData(form);
  const result = validateProjectForm(formData);
  if (!result.valid) {
    validateVisibleForms();
    return;
  }
  updateCurrentData((data) => {
    data.projects.push(createProject(
      formData.get("projectName").trim(),
      formData.get("companyName").trim(),
      Number(formData.get("budget")),
      Number(formData.get("capacity"))
    ));
  });
  state.panel = null;
}

/**
 * Submits an employee after validation.
 */
function submitEmployee() {
  const form = document.querySelector("[data-form='employee']");
  const formData = new FormData(form);
  const result = validateEmployeeForm(formData);
  if (!result.valid) {
    validateVisibleForms();
    return;
  }
  updateCurrentData((data) => {
    data.employees.push(createEmployee(
      formData.get("name").trim(),
      formData.get("surname").trim(),
      formData.get("dateOfBirth"),
      formData.get("position"),
      Number(formData.get("salary"))
    ));
  });
  state.panel = null;
}

/**
 * Validates currently visible entity forms.
 */
function validateVisibleForms() {
  const projectForm = document.querySelector("[data-form='project']");
  const employeeForm = document.querySelector("[data-form='employee']");
  if (projectForm) {
    applyValidation(projectForm, validateProjectForm(new FormData(projectForm)));
  }
  if (employeeForm) {
    applyValidation(employeeForm, validateEmployeeForm(new FormData(employeeForm)));
  }
}

/**
 * Applies validation messages and submit state to a form.
 * @param {HTMLFormElement} form Target form.
 * @param {{valid: boolean, errors: Record<string, string>}} result Validation result.
 */
function applyValidation(form, result) {
  form.querySelectorAll("[name]").forEach((field) => {
    const error = result.errors[field.name] || "";
    const errorNode = field.closest(".form-field")?.querySelector(".error");
    field.classList.toggle("invalid", Boolean(error));
    if (errorNode) {
      errorNode.textContent = error;
    }
  });
  form.querySelector(".primary").disabled = !result.valid;
}

/**
 * Validates project form values.
 * @param {FormData} formData Submitted form data.
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
function validateProjectForm(formData) {
  const errors = {};
  const namePattern = /^[a-z0-9 ]+$/i;
  if (!namePattern.test(formData.get("projectName")?.trim() || "") || formData.get("projectName").trim().length < 3) {
    errors.projectName = "Use at least 3 alphanumeric characters.";
  }
  if (!namePattern.test(formData.get("companyName")?.trim() || "") || formData.get("companyName").trim().length < 2) {
    errors.companyName = "Use at least 2 alphanumeric characters.";
  }
  if (Number(formData.get("budget")) <= 0) {
    errors.budget = "Budget must be positive.";
  }
  if (!Number.isInteger(Number(formData.get("capacity"))) || Number(formData.get("capacity")) < 1) {
    errors.capacity = "Capacity must be an integer of at least 1.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates employee form values.
 * @param {FormData} formData Submitted form data.
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
function validateEmployeeForm(formData) {
  const errors = {};
  const textPattern = /^[a-z]+$/i;
  if (!textPattern.test(formData.get("name")?.trim() || "") || formData.get("name").trim().length < 3) {
    errors.name = "Use at least 3 letters.";
  }
  if (!textPattern.test(formData.get("surname")?.trim() || "") || formData.get("surname").trim().length < 3) {
    errors.surname = "Use at least 3 letters.";
  }
  if (!formData.get("dateOfBirth") || getAge(formData.get("dateOfBirth")) < 18) {
    errors.dateOfBirth = "Employee must be at least 18 years old.";
  }
  if (!POSITIONS.includes(formData.get("position"))) {
    errors.position = "Select a position.";
  }
  if (Number(formData.get("salary")) <= 0) {
    errors.salary = "Salary must be positive.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Updates sort state.
 * @param {string} scope Table scope.
 * @param {string} key Column key.
 */
function sortTable(scope, key) {
  const sort = state.sort[scope];
  state.sort[scope] = {
    key,
    direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc"
  };
  render();
}

/**
 * Opens a filter popup near a header button.
 * @param {HTMLElement} trigger Trigger button.
 */
function openFilter(trigger) {
  const rect = trigger.getBoundingClientRect();
  state.floating = {
    type: "filter",
    scope: trigger.dataset.scope,
    key: trigger.dataset.key,
    anchor: { x: rect.left, y: rect.bottom }
  };
  render();
}

/**
 * Applies filter popup value.
 * @param {string} scope Table scope.
 * @param {string} key Filter key.
 */
function applyFilter(scope, key) {
  const value = document.querySelector("[data-floating] [name='filterValue']").value.trim();
  state.filters[scope][key] = value;
  state.floating = null;
  render();
}

/**
 * Removes one active filter.
 * @param {string} key Filter key.
 */
function removeFilter(key) {
  delete state.filters[state.currentTab][key];
  render();
}

/**
 * Clears all filters for current tab.
 */
function clearFilters() {
  state.filters[state.currentTab] = {};
  render();
}

/**
 * Closes the floating popup.
 */
function closeFloating() {
  state.floating = null;
  render();
}

/**
 * Deletes a project and removes all linked assignments.
 * @param {string} projectId Project id.
 */
function deleteProject(projectId) {
  const data = getCurrentData();
  const project = data.projects.find((item) => item.id === projectId);
  if (!confirm(`Delete project "${project.projectName}"?`)) {
    return;
  }
  updateCurrentData((monthData) => {
    monthData.projects = monthData.projects.filter((item) => item.id !== projectId);
    monthData.employees.forEach((employee) => {
      employee.assignments = employee.assignments.filter((assignment) => assignment.projectId !== projectId);
    });
  });
}

/**
 * Deletes an employee and their assignments.
 * @param {string} employeeId Employee id.
 */
function deleteEmployee(employeeId) {
  const data = getCurrentData();
  const employee = data.employees.find((item) => item.id === employeeId);
  if (!confirm(`Delete employee "${employee.name} ${employee.surname}"?`)) {
    return;
  }
  updateCurrentData((monthData) => {
    monthData.employees = monthData.employees.filter((item) => item.id !== employeeId);
  });
}

/**
 * Updates an employee object.
 * @param {string} employeeId Employee id.
 * @param {(employee: object) => void} updater Employee updater.
 */
function editEmployee(employeeId, updater) {
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    updater(employee);
  });
}

/**
 * Opens calendar modal with current vacation days.
 * @param {string} employeeId Employee id.
 */
function openCalendar(employeeId) {
  const employee = getCurrentData().employees.find((item) => item.id === employeeId);
  openModal({ type: "calendar", employeeId, days: [...employee.vacations] });
}

/**
 * Toggles a pending vacation day in modal state.
 * @param {number} day Day number.
 */
function toggleVacationDay(day) {
  const days = new Set(state.modal.days || []);
  if (days.has(day)) {
    days.delete(day);
  } else {
    days.add(day);
  }
  state.modal.days = [...days].sort((a, b) => a - b);
  render();
}

/**
 * Saves pending vacation days for an employee.
 * @param {string} employeeId Employee id.
 */
function saveVacation(employeeId) {
  const days = state.modal.days || [];
  editEmployee(employeeId, (employee) => {
    employee.vacations = days;
  });
  state.modal = null;
}

/**
 * Opens assignment popup near the trigger button.
 * @param {HTMLElement} trigger Trigger button.
 */
function openAssign(trigger) {
  const rect = trigger.getBoundingClientRect();
  state.floating = {
    type: "assign",
    employeeId: trigger.dataset.employeeId,
    anchor: { x: rect.left, y: rect.bottom },
    capacity: 0.5,
    fit: 1
  };
  render();
}

/**
 * Assigns an employee to a selected project.
 * @param {string} employeeId Employee id.
 */
function assignEmployee(employeeId) {
  const popup = document.querySelector("[data-floating]");
  const projectId = state.floating.projectId || popup.querySelector("[name='projectId']").value;
  const capacity = Number(popup.querySelector("[name='capacity']").value);
  const fit = Number(popup.querySelector("[name='fit']").value);
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    employee.assignments.push({ projectId, capacity, fit });
  });
  state.floating = null;
}

/**
 * Opens the action menu.
 * @param {HTMLElement} trigger Trigger element.
 */
function openActionMenu(trigger) {
  const rect = trigger.getBoundingClientRect();
  state.actionMenu = {
    kind: trigger.dataset.kind,
    employeeId: trigger.dataset.employeeId,
    projectId: trigger.dataset.projectId || state.modal?.projectId,
    anchor: { x: rect.left, y: rect.bottom }
  };
  render();
}

/**
 * Unassigns an employee from a project.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 */
function unassignEmployee(employeeId, projectId) {
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    employee.assignments = employee.assignments.filter((assignment) => assignment.projectId !== projectId);
  });
  state.modal = null;
}

/**
 * Saves edited assignment values.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 */
function saveAssignment(employeeId, projectId) {
  const form = document.querySelector("[data-form='edit-assignment']");
  const formData = new FormData(form);
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    const assignment = employee.assignments.find((item) => item.projectId === projectId);
    assignment.capacity = Number(formData.get("capacity"));
    assignment.fit = Number(formData.get("fit"));
  });
  state.modal = null;
}

/**
 * Copies source month data into current period and clears vacations.
 * @param {string} sourceKey Source period key.
 */
function seedMonth(sourceKey) {
  const data = readMonthlyData();
  const [sourceYear, sourceMonth] = sourceKey.split("-").map(Number);
  if (!confirm(`Copy ${MONTHS[sourceMonth]} ${sourceYear} data to ${MONTHS[state.currentMonth]} ${state.currentYear}?`)) {
    return;
  }
  const copy = structuredClone(data[sourceKey]);
  copy.employees.forEach((employee) => {
    employee.vacations = [];
  });
  data[periodKey()] = copy;
  writeMonthlyData(data);
  state.modal = null;
  render();
}

/**
 * Navigates to employees tab and applies employee filters.
 * @param {string} employeeId Employee id.
 */
function seeEmployee(employeeId) {
  const employee = getCurrentData().employees.find((item) => item.id === employeeId);
  state.currentTab = "employees";
  state.filters.employees = { name: employee.name, surname: employee.surname };
  state.modal = null;
  state.actionMenu = null;
  render();
}

/**
 * Navigates to projects tab and applies project filter.
 * @param {string} projectId Project id.
 */
function seeProject(projectId) {
  const project = getCurrentData().projects.find((item) => item.id === projectId);
  state.currentTab = "projects";
  state.filters.projects = { projectName: project.projectName };
  state.modal = null;
  state.actionMenu = null;
  render();
}

/**
 * Closes floating menus on outside click.
 * @param {MouseEvent} event Click event.
 */
function closeLoosePopups(event) {
  if (state.floating && !event.target.closest("[data-floating]")) {
    state.floating = null;
    render();
  }
  if (state.actionMenu && !event.target.closest("[data-action-menu]")) {
    state.actionMenu = null;
    render();
  }
}

/**
 * Repositions open floating popups inside the viewport.
 */
function repositionFloatingPopup() {
  const popup = document.querySelector("[data-floating], [data-action-menu]");
  const descriptor = state.floating || state.actionMenu;
  if (!popup || !descriptor?.anchor) {
    return;
  }
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  const left = Math.min(Math.max(12, descriptor.anchor.x), window.innerWidth - width - 12);
  const top = Math.min(Math.max(12, descriptor.anchor.y + 8), window.innerHeight - height - 12);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Filters project rows.
 * @param {Array} projects Projects list.
 * @returns {Array}
 */
function filterProjects(projects) {
  const filters = state.filters.projects;
  return projects.filter((project) => {
    return (!filters.companyName || project.companyName.toLowerCase().includes(filters.companyName.toLowerCase()))
      && (!filters.projectName || project.projectName.toLowerCase().includes(filters.projectName.toLowerCase()));
  });
}

/**
 * Filters employee rows.
 * @param {Array} employees Employees list.
 * @returns {Array}
 */
function filterEmployees(employees) {
  const filters = state.filters.employees;
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
function sortRows(rows, sort, getter) {
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
 * @returns {string|number}
 */
function getProjectSortValue(data, project, key) {
  if (key === "capacity") return getProjectMetrics(data, project).usedCapacity;
  if (key === "income") return getProjectMetrics(data, project).income;
  return project[key];
}

/**
 * Gets employee sort value.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} employee Employee row.
 * @param {string} key Sort key.
 * @returns {string|number}
 */
function getEmployeeSortValue(data, employee, key) {
  if (key === "age") return getAge(employee.dateOfBirth);
  if (key === "estimatedPayment") return getEmployeeMetrics(data, employee).estimatedPayment;
  if (key === "projectedIncome") return getEmployeeMetrics(data, employee).projectedIncome;
  return employee[key];
}

/**
 * Calculates project metrics from assignments.
 * @param {{employees: Array, projects: Array}} data Current month data.
 * @param {object} project Project object.
 * @returns {{assignments: Array, usedCapacity: number, income: number}}
 */
function getProjectMetrics(data, project) {
  const assignments = data.employees.flatMap((employee) => {
    return employee.assignments
      .filter((assignment) => assignment.projectId === project.id)
      .map((assignment) => getAssignmentMetrics(data, employee, assignment));
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
 * @returns {{assignedCapacity: number, estimatedPayment: number, projectedIncome: number}}
 */
function getEmployeeMetrics(data, employee) {
  const items = employee.assignments.map((assignment) => getAssignmentMetrics(data, employee, assignment)).filter(Boolean);
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
 * @returns {object|null}
 */
function getAssignmentMetrics(data, employee, assignment) {
  const project = data.projects.find((item) => item.id === assignment.projectId);
  if (!project) {
    return null;
  }
  const allEffectiveCapacity = data.employees.reduce((sum, currentEmployee) => {
    const matching = currentEmployee.assignments.find((item) => item.projectId === project.id);
    if (!matching) return sum;
    const vacationCoefficient = getVacationCoefficient(state.currentYear, state.currentMonth, currentEmployee.vacations);
    return sum + calculateEffectiveCapacity(matching.capacity, matching.fit, vacationCoefficient);
  }, 0);
  const capacityForRevenue = Math.max(project.capacity, allEffectiveCapacity);
  const revenuePerEffectiveCapacity = project.budget / capacityForRevenue;
  const vacationCoefficient = getVacationCoefficient(state.currentYear, state.currentMonth, employee.vacations);
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
 * @returns {{totalEstimatedIncome: number}}
 */
function getDashboardMetrics(data) {
  const projectIncome = data.projects.reduce((sum, project) => sum + getProjectMetrics(data, project).income, 0);
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
function getAssignedCapacity(employee) {
  return employee.assignments.reduce((sum, assignment) => sum + Number(assignment.capacity), 0);
}

/**
 * Calculates age from ISO birth date.
 * @param {string} dateOfBirth Birth date.
 * @returns {number}
 */
function getAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Checks if a day in selected month is a weekday.
 * @param {number} day Day number.
 * @returns {boolean}
 */
function isWeekday(day) {
  const weekday = new Date(state.currentYear, state.currentMonth, day).getDay();
  return weekday !== 0 && weekday !== 6;
}

/**
 * Formats vacation days as compact ranges.
 * @param {number[]} days Vacation day numbers.
 * @returns {string}
 */
function formatVacationRanges(days) {
  if (!days.length) {
    return "No vacation days selected";
  }
  const sorted = [...days].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] <= previous + 1 || onlyWeekendGap(previous, sorted[index])) {
      previous = sorted[index];
    } else {
      ranges.push(formatRange(start, previous));
      start = sorted[index];
      previous = sorted[index];
    }
  }
  ranges.push(formatRange(start, previous));
  return ranges.join(", ");
}

/**
 * Checks whether two selected vacation days have only weekend days between them.
 * @param {number} previous Previous selected day.
 * @param {number} next Next selected day.
 * @returns {boolean}
 */
function onlyWeekendGap(previous, next) {
  for (let day = previous + 1; day < next; day += 1) {
    if (isWeekday(day)) {
      return false;
    }
  }
  return true;
}

/**
 * Formats a single-day or multi-day range.
 * @param {number} start Start day.
 * @param {number} end End day.
 * @returns {string}
 */
function formatRange(start, end) {
  const formatDay = (day) => `${String(day).padStart(2, "0")}.${String(state.currentMonth + 1).padStart(2, "0")}`;
  return start === end ? formatDay(start) : `${formatDay(start)}-${formatDay(end)}`;
}

/**
 * Renders a detail table.
 * @param {string[]} headers Header labels.
 * @param {Array<Array<string>>} rows Cell rows.
 * @returns {string}
 */
function detailTable(headers, rows) {
  return `
    <div class="table-wrap detail">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

/**
 * Escapes user-visible text.
 * @param {string|number} value Raw value.
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Formats a decimal value.
 * @param {number} value Numeric value.
 * @param {number} digits Fraction digits.
 * @returns {string}
 */
function formatNumber(value, digits) {
  return Number(value || 0).toFixed(digits);
}

/**
 * Creates an option element string.
 * @param {string|number} value Option value.
 * @param {string|number} label Option label.
 * @param {string|number} selected Selected value.
 * @returns {string}
 */
function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

/**
 * Creates an empty table row.
 * @param {number} columns Number of columns.
 * @param {string} message Empty state text.
 * @returns {string}
 */
function emptyRow(columns, message) {
  return `<tr><td colspan="${columns}" class="empty">${message}</td></tr>`;
}

/**
 * Converts a data key to a label.
 * @param {string} key Data key.
 * @returns {string}
 */
function labelFor(key) {
  return {
    companyName: "Company Name",
    projectName: "Project Name",
    name: "Name",
    surname: "Surname",
    position: "Position"
  }[key] || key;
}

initDashboard();
