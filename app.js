import { MONTHS, YEARS } from "./src/constants.js";
import {
  createEmployee,
  createProject,
  createSampleMonth,
  periodKey as createPeriodKey,
  readMonthlyData,
  writeMonthlyData
} from "./src/data-store.js";
import { getAssignedCapacity } from "./src/dashboard-metrics.js";
import { validateEmployeeForm, validateProjectForm } from "./src/validation.js";
import { formatNumber } from "./src/view-utils.js";
import { renderDashboard } from "./src/views/dashboard-view.js";

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
  return createPeriodKey(year, month);
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
 * Renders the full dashboard.
 */
function render() {
  const data = getCurrentData();
  app.innerHTML = renderDashboard({ state, data, monthlyData: readMonthlyData() });
  validateVisibleForms();
  repositionFloatingPopup();
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
  if (target.dataset.action === "filter-position-change") {
    state.filters.employees.position = target.value;
    state.floating = null;
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
  state.panel = null;
  updateCurrentData((data) => {
    data.projects.push(createProject(
      formData.get("projectName").trim(),
      formData.get("companyName").trim(),
      Number(formData.get("budget")),
      Number(formData.get("capacity"))
    ));
  });
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
  state.panel = null;
  updateCurrentData((data) => {
    data.employees.push(createEmployee(
      formData.get("name").trim(),
      formData.get("surname").trim(),
      formData.get("dateOfBirth"),
      formData.get("position"),
      Number(formData.get("salary"))
    ));
  });
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
    anchorSelector: `[data-action="open-filter"][data-scope="${trigger.dataset.scope}"][data-key="${trigger.dataset.key}"]`,
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
  state.modal = null;
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    employee.vacations = days;
  });
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
    anchorSelector: `[data-action="open-assign"][data-employee-id="${trigger.dataset.employeeId}"]`,
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
  state.floating = null;
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    if (!projectId || employee.assignments.some((assignment) => assignment.projectId === projectId)) {
      return;
    }
    employee.assignments.push({ projectId, capacity, fit });
  });
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
  state.modal = null;
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    employee.assignments = employee.assignments.filter((assignment) => assignment.projectId !== projectId);
  });
}

/**
 * Saves edited assignment values.
 * @param {string} employeeId Employee id.
 * @param {string} projectId Project id.
 */
function saveAssignment(employeeId, projectId) {
  const form = document.querySelector("[data-form='edit-assignment']");
  const formData = new FormData(form);
  state.modal = null;
  updateCurrentData((data) => {
    const employee = data.employees.find((item) => item.id === employeeId);
    const assignment = employee.assignments.find((item) => item.projectId === projectId);
    assignment.capacity = Number(formData.get("capacity"));
    assignment.fit = Number(formData.get("fit"));
  });
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
  const anchor = descriptor.anchorSelector ? document.querySelector(descriptor.anchorSelector) : null;
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    descriptor.anchor = { x: rect.left, y: rect.bottom };
  }
  const width = popup.offsetWidth;
  const height = popup.offsetHeight;
  const left = Math.min(Math.max(12, descriptor.anchor.x), window.innerWidth - width - 12);
  const top = Math.min(Math.max(12, descriptor.anchor.y + 8), window.innerHeight - height - 12);
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

initDashboard();
