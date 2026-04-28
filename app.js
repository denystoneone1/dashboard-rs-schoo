import {
  calculateAssignmentCost,
  calculateEffectiveCapacity,
  countWorkingDays,
  formatCurrency,
  getVacationCoefficient
} from "./src/calculations.js";

const STORAGE_KEY = "monthlyData";
const POSITIONS = ["Junior", "Middle", "Senior", "Lead", "Architect", "BO"];
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
  currentYear: new Date().getFullYear(),
  filters: {
    projects: {},
    employees: {}
  },
  sort: {
    projects: { key: "companyName", direction: "asc" },
    employees: { key: "name", direction: "asc" }
  },
  activeModal: null,
  activeFloating: null
};

const app = document.querySelector("#app");

/**
 * Initializes the dashboard and attaches global event handlers.
 */
function initDashboard() {
  ensureSupportedYear();
  ensurePeriodData();
  render();
  window.addEventListener("resize", repositionFloatingPopup);
  window.addEventListener("scroll", repositionFloatingPopup, true);
}

/**
 * Keeps the initial selector inside the assignment requirement year range.
 */
function ensureSupportedYear() {
  if (state.currentYear < 2025 || state.currentYear > 2027) {
    state.currentYear = 2026;
    state.currentMonth = 0;
  }
}

/**
 * Returns the localStorage key for the selected period.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month number.
 * @returns {string}
 */
function periodKey(year = state.currentYear, month = state.currentMonth) {
  return `${year}-${month}`;
}

/**
 * Reads all monthly snapshots from localStorage.
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
 * Writes all monthly snapshots to localStorage.
 * @param {Record<string, {employees: Array, projects: Array}>} data Snapshot map.
 */
function writeMonthlyData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Ensures selected period exists and seeds a useful starting month.
 */
function ensurePeriodData() {
  const data = readMonthlyData();
  const key = periodKey();
  if (!data[key]) {
    data[key] = createSampleMonth();
    writeMonthlyData(data);
  }
}

/**
 * Returns the currently selected month snapshot.
 * @returns {{employees: Array, projects: Array}}
 */
function getCurrentData() {
  ensurePeriodData();
  return readMonthlyData()[periodKey()];
}

/**
 * Updates the current month snapshot.
 * @param {(monthData: {employees: Array, projects: Array}) => void} updater Mutates selected snapshot.
 */
function updateCurrentData(updater) {
  const data = readMonthlyData();
  const key = periodKey();
  data[key] ||= createSampleMonth();
  updater(data[key]);
  writeMonthlyData(data);
  render();
}

/**
 * Renders the current dashboard shell.
 */
function render() {
  const data = getCurrentData();
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <h1>Dashboard</h1>
        <p>${MONTHS[state.currentMonth]} ${state.currentYear}</p>
      </aside>
      <main class="content">
        <h2>Employee & Project Dashboard</h2>
        <p>${data.projects.length} projects and ${data.employees.length} employees loaded.</p>
      </main>
    </div>
  `;
}

/**
 * Repositions an open floating popup when available.
 */
function repositionFloatingPopup() {
  if (!state.activeFloating) {
    return;
  }
}

/**
 * Creates deterministic sample data for a new month.
 * @returns {{employees: Array, projects: Array}}
 */
function createSampleMonth() {
  const projects = [
    {
      id: crypto.randomUUID(),
      projectName: "Analytics Hub",
      companyName: "Northwind Labs",
      budget: 45000,
      capacity: 3
    },
    {
      id: crypto.randomUUID(),
      projectName: "Billing Portal",
      companyName: "Acme Finance",
      budget: 32000,
      capacity: 2
    },
    {
      id: crypto.randomUUID(),
      projectName: "Ops Console",
      companyName: "Vector Cloud",
      budget: 28000,
      capacity: 2
    }
  ];
  const employees = [
    {
      id: crypto.randomUUID(),
      name: "Olivia",
      surname: "Stone",
      dateOfBirth: "1994-03-12",
      position: "Senior",
      salary: 8200,
      vacations: [5, 6],
      assignments: [
        { projectId: projects[0].id, capacity: 0.8, fit: 0.9 },
        { projectId: projects[1].id, capacity: 0.4, fit: 0.8 }
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "James",
      surname: "Miller",
      dateOfBirth: "1991-10-04",
      position: "Lead",
      salary: 10400,
      vacations: [],
      assignments: [{ projectId: projects[0].id, capacity: 1, fit: 1 }]
    },
    {
      id: crypto.randomUUID(),
      name: "Sophia",
      surname: "Clark",
      dateOfBirth: "1998-07-24",
      position: "Middle",
      salary: 6100,
      vacations: [14, 15, 16],
      assignments: [{ projectId: projects[2].id, capacity: 0.7, fit: 0.7 }]
    },
    {
      id: crypto.randomUUID(),
      name: "Daniel",
      surname: "Reed",
      dateOfBirth: "1988-01-29",
      position: "Architect",
      salary: 12600,
      vacations: [],
      assignments: []
    }
  ];

  return { employees, projects };
}

renderShellPlaceholder();
initDashboard();

/**
 * Renders a minimal placeholder before full initialization.
 */
function renderShellPlaceholder() {
  app.innerHTML = `<main class="boot-screen">Loading dashboard...</main>`;
}
