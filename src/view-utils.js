/**
 * Escapes user-visible text.
 * @param {string|number} value Raw value.
 * @returns {string}
 */
export function escapeHtml(value) {
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
export function formatNumber(value, digits) {
  return Number(value || 0).toFixed(digits);
}

/**
 * Creates an option element string.
 * @param {string|number} value Option value.
 * @param {string|number} label Option label.
 * @param {string|number} selected Selected value.
 * @returns {string}
 */
export function option(value, label, selected) {
  return `<option value="${value}" ${String(value) === String(selected) ? "selected" : ""}>${label}</option>`;
}

/**
 * Creates an empty table row.
 * @param {number} columns Number of columns.
 * @param {string} message Empty state text.
 * @returns {string}
 */
export function emptyRow(columns, message) {
  return `<tr><td colspan="${columns}" class="empty">${message}</td></tr>`;
}

/**
 * Converts a data key to a label.
 * @param {string} key Data key.
 * @returns {string}
 */
export function labelFor(key) {
  return {
    companyName: "Company Name",
    projectName: "Project Name",
    name: "Name",
    surname: "Surname",
    position: "Position"
  }[key] || key;
}

/**
 * Renders a detail table.
 * @param {string[]} headers Header labels.
 * @param {Array<Array<string>>} rows Cell rows.
 * @returns {string}
 */
export function detailTable(headers, rows) {
  return `
    <div class="table-wrap detail">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}
