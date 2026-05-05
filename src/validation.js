import { POSITIONS } from "./constants.js";
import { getAge } from "./date-utils.js";

/**
 * Validates project form values.
 * @param {FormData} formData Submitted form data.
 * @returns {{valid: boolean, errors: Record<string, string>}}
 */
export function validateProjectForm(formData) {
  const errors = {};
  const namePattern = /^[a-z0-9 ]+$/i;
  const decimalPattern = /^\d+(\.\d{1,2})?$/;
  if (!namePattern.test(formData.get("projectName")?.trim() || "") || formData.get("projectName").trim().length < 3) {
    errors.projectName = "Use at least 3 alphanumeric characters.";
  }
  if (!namePattern.test(formData.get("companyName")?.trim() || "") || formData.get("companyName").trim().length < 2) {
    errors.companyName = "Use at least 2 alphanumeric characters.";
  }
  if (!decimalPattern.test(formData.get("budget") || "") || Number(formData.get("budget")) <= 0) {
    errors.budget = "Budget must be positive with up to 2 decimals.";
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
export function validateEmployeeForm(formData) {
  const errors = {};
  const textPattern = /^[a-z]+$/i;
  const decimalPattern = /^\d+(\.\d{1,2})?$/;
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
  if (!decimalPattern.test(formData.get("salary") || "") || Number(formData.get("salary")) <= 0) {
    errors.salary = "Salary must be positive with up to 2 decimals.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
