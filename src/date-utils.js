/**
 * Calculates age from ISO birth date.
 * @param {string} dateOfBirth Birth date.
 * @returns {number}
 */
export function getAge(dateOfBirth) {
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
 * Checks if a day in a month is a weekday.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @param {number} day Day number.
 * @returns {boolean}
 */
export function isWeekday(year, month, day) {
  const weekday = new Date(year, month, day).getDay();
  return weekday !== 0 && weekday !== 6;
}

/**
 * Formats vacation days as compact ranges.
 * @param {number[]} days Vacation day numbers.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {string}
 */
export function formatVacationRanges(days, year, month) {
  if (!days.length) {
    return "No vacation days selected";
  }
  const sorted = [...days].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] <= previous + 1 || onlyWeekendGap(previous, sorted[index], year, month)) {
      previous = sorted[index];
    } else {
      ranges.push(formatRange(start, previous, month));
      start = sorted[index];
      previous = sorted[index];
    }
  }
  ranges.push(formatRange(start, previous, month));
  return ranges.join(", ");
}

/**
 * Checks whether two selected vacation days have only weekend days between them.
 * @param {number} previous Previous selected day.
 * @param {number} next Next selected day.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @returns {boolean}
 */
function onlyWeekendGap(previous, next, year, month) {
  for (let day = previous + 1; day < next; day += 1) {
    if (isWeekday(year, month, day)) {
      return false;
    }
  }
  return true;
}

/**
 * Formats a single-day or multi-day range.
 * @param {number} start Start day.
 * @param {number} end End day.
 * @param {number} month Zero-based month.
 * @returns {string}
 */
function formatRange(start, end, month) {
  const formatDay = (day) => `${String(day).padStart(2, "0")}.${String(month + 1).padStart(2, "0")}`;
  return start === end ? formatDay(start) : `${formatDay(start)}-${formatDay(end)}`;
}
