// Studious Tracker 2.0 - Calendar
// This page saves its assignments in the browser using localStorage.
const STORAGE_KEY = "studiousTrackerAssignments";
const today = new Date();
let displayedYear = today.getFullYear();
let displayedMonth = today.getMonth(); // January is 0, December is 11.
let selectedDate = formatDate(today);

// Create a date string like "2026-11-22" using LOCAL time.
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Read saved assignments. Start with an empty calendar if nothing was saved.
function loadAssignments() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}
let assignments = loadAssignments();

function saveAssignments() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

// Convert a status into a CSS class name.
function statusClass(status) {
  if (status === "Completed") return "completed";
  if (status === "In Progress") return "in-progress";
  return "not-started";
}

// Build the month grid, including empty-looking days from nearby months.
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  grid.replaceChildren();
  const monthStart = new Date(displayedYear, displayedMonth, 1);
  document.getElementById("month-label").textContent = monthStart.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(displayedYear, displayedMonth + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  for (let cell = 0; cell < totalCells; cell++) {
    const date = new Date(displayedYear, displayedMonth, cell - firstWeekday + 1);
    const dateKey = formatDate(date);
    const isCurrentMonth = date.getMonth() === displayedMonth;
    const dayAssignments = assignments.filter(item => item.date === dateKey);

    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    if (!isCurrentMonth) dayButton.classList.add("outside-month");
    if (dateKey === selectedDate) dayButton.classList.add("selected");
    if (dateKey === formatDate(today)) dayButton.classList.add("today");
    dayButton.setAttribute("aria-label", `${date.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}, ${dayAssignments.length} assignments`);

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate();
    dayButton.appendChild(dayNumber);

    // Show up to two assignments in each calendar square.
    dayAssignments.slice(0, 2).forEach(item => {
      const chip = document.createElement("span");
      chip.className = `event-chip ${statusClass(item.status)}`;
      chip.textContent = item.name;
      dayButton.appendChild(chip);
    });
    if (dayAssignments.length > 2) {
      const more = document.createElement("span");
      more.className = "more-events";
      more.textContent = `+${dayAssignments.length - 2} more`;
      dayButton.appendChild(more);
    }
    dayButton.addEventListener("click", () => {
      selectedDate = dateKey;
      displayedYear = date.getFullYear();
      displayedMonth = date.getMonth();
      document.getElementById("assignment-date").value = selectedDate;
      renderCalendar();
      renderSelectedAssignments();
    });
    grid.appendChild(dayButton);
  }
}

// Show assignment details for the day the student clicked.
function renderSelectedAssignments() {
  const date = new Date(`${selectedDate}T12:00:00`);
  document.getElementById("selected-date-label").textContent = date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  const container = document.getElementById("selected-assignments");
  container.replaceChildren();
  const matching = assignments.filter(item => item.date === selectedDate);
  if (matching.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "No assignments due on this day.";
    container.appendChild(empty);
    return;
  }
  matching.forEach(item => {
    const card = document.createElement("div");
    card.className = "assignment-card";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const course = document.createElement("p");
    course.textContent = `Course: ${item.course}`;
    const status = document.createElement("p");
    status.className = "status-label";
    status.textContent = `Status: ${item.status}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${item.name}`);
    remove.addEventListener("click", () => {
      if (!confirm(`Delete "${item.name}"?`)) return;
      assignments = assignments.filter(assignment => assignment.id !== item.id);
      saveAssignments();
      renderCalendar();
      renderSelectedAssignments();
    });
    card.append(name, course, status, remove);
    container.appendChild(card);
  });
}

// Add a new assignment when the form is submitted.
document.getElementById("assignment-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("assignment-name").value.trim();
  const course = document.getElementById("assignment-course").value.trim();
  const date = document.getElementById("assignment-date").value;
  const status = document.getElementById("assignment-status").value;
  if (!name || !course || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  assignments.push({ id: `${Date.now()}-${Math.random()}`, name, course, date, status });
  saveAssignments();
  selectedDate = date;
  const [year, month] = date.split("-").map(Number);
  displayedYear = year;
  displayedMonth = month - 1;
  event.target.reset();
  document.getElementById("assignment-date").value = selectedDate;
  renderCalendar();
  renderSelectedAssignments();
});

// Change months using the arrow buttons.
function changeMonth(amount) {
  const nextMonth = new Date(displayedYear, displayedMonth + amount, 1);
  displayedYear = nextMonth.getFullYear();
  displayedMonth = nextMonth.getMonth();
  renderCalendar();
}
document.getElementById("previous-month").addEventListener("click", () => changeMonth(-1));
document.getElementById("next-month").addEventListener("click", () => changeMonth(1));
document.getElementById("today-button").addEventListener("click", () => {
  displayedYear = today.getFullYear();
  displayedMonth = today.getMonth();
  selectedDate = formatDate(today);
  document.getElementById("assignment-date").value = selectedDate;
  renderCalendar();
  renderSelectedAssignments();
});

// Draw the calendar when the page first opens.
document.getElementById("assignment-date").value = selectedDate;
renderCalendar();
renderSelectedAssignments();
