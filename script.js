const STORAGE_KEY = "taskflow.tasks.v1";

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskCategory = document.getElementById("taskCategory");
const taskPriority = document.getElementById("taskPriority");
const taskDueDate = document.getElementById("taskDueDate");
const taskId = document.getElementById("taskId");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const toast = document.getElementById("toast");

let tasks = loadTasks();
let activeFilter = "all";
let activeCategory = "all";
let toastTimer;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("Could not load saved tasks:", error);
  }
  const today = localDateString();
  return [
    { id: createId(), title: "Polish portfolio homepage", description: "Review spacing, mobile layout, and project links.", category: "Work", priority: "High", dueDate: today, completed: false, createdAt: Date.now() - 300000 },
    { id: createId(), title: "Practise JavaScript DOM methods", description: "Build confidence with events, arrays, and rendering UI.", category: "Study", priority: "Medium", dueDate: "", completed: false, createdAt: Date.now() - 200000 },
    { id: createId(), title: "Organize project screenshots", description: "Prepare clear visuals for the portfolio projects section.", category: "Personal", priority: "Low", dueDate: "", completed: true, createdAt: Date.now() - 100000 }
  ];
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    showToast("Unable to save in this browser.");
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(task) {
  return task.dueDate && task.dueDate < localDateString() && !task.completed;
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  let result = tasks.filter(task => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "today" && task.dueDate === localDateString() && !task.completed) ||
      (activeFilter === "pending" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    const matchesCategory = activeCategory === "all" || task.category === activeCategory;
    const matchesSearch = `${task.title} ${task.description} ${task.category} ${task.priority}`.toLowerCase().includes(query);
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  result.sort((a, b) => {
    switch (sortSelect.value) {
      case "due":
        if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      case "priority":
        return priorityRank[a.priority] - priorityRank[b.priority] || b.createdAt - a.createdAt;
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return b.createdAt - a.createdAt;
    }
  });
  return result;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.innerHTML = visibleTasks.map(task => {
    const dueMarkup = task.dueDate
      ? `<span class="due-date ${isOverdue(task) ? "overdue" : ""}">${isOverdue(task) ? "Overdue · " : "Due · "}${escapeHTML(formatDate(task.dueDate))}</span>`
      : "";
    return `
      <article class="task-row ${task.completed ? "is-complete" : ""}" data-task-id="${escapeHTML(task.id)}">
        <input class="complete-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" data-action="toggle" ${task.completed ? "checked" : ""}>
        <div class="task-main">
          <div class="task-title-line"><span class="task-title">${escapeHTML(task.title)}</span><span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)} priority</span></div>
          ${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ""}
          <div class="task-meta"><span class="meta-pill">${escapeHTML(task.category)}</span>${dueMarkup}</div>
        </div>
        <div class="task-actions">
          <button class="icon-button" type="button" data-action="edit" aria-label="Edit ${escapeHTML(task.title)}" title="Edit task">✎</button>
          <button class="icon-button" type="button" data-action="delete" aria-label="Delete ${escapeHTML(task.title)}" title="Delete task">⌫</button>
        </div>
      </article>`;
  }).join("");

  taskList.style.display = visibleTasks.length ? "block" : "none";
  emptyState.classList.toggle("show", visibleTasks.length === 0);
  document.getElementById("visibleCount").textContent = `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;
  updateStats();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const todayCount = tasks.filter(task => task.dueDate === localDateString() && !task.completed).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  document.getElementById("totalStat").textContent = total;
  document.getElementById("pendingStat").textContent = pending;
  document.getElementById("completedStat").textContent = completed;
  document.getElementById("completionRate").textContent = rate;
  document.getElementById("progressBar").style.width = `${rate}%`;
  document.getElementById("allCount").textContent = total;
  document.getElementById("todayCount").textContent = todayCount;
}

function setFilter(filter) {
  activeFilter = filter;
  const labels = { all: "All tasks", today: "Today", pending: "Pending tasks", completed: "Completed tasks" };
  const subtitles = {
    all: "Everything you need to work on.",
    today: "Tasks that are due today.",
    pending: "Tasks that still need your attention.",
    completed: "A record of the progress you have made."
  };
  document.getElementById("currentView").textContent = labels[filter];
  document.getElementById("listTitle").textContent = labels[filter];
  document.getElementById("listSubtitle").textContent = subtitles[filter];
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.filter === filter));
  renderTasks();
}

function openModal(task = null) {
  taskForm.reset();
  taskId.value = task?.id || "";
  document.getElementById("modalTitle").textContent = task ? "Edit task" : "Create a task";
  document.getElementById("saveTaskButton").textContent = task ? "Update task" : "Save task";
  taskTitle.value = task?.title || "";
  taskDescription.value = task?.description || "";
  taskCategory.value = task?.category || "Work";
  taskPriority.value = task?.priority || "Medium";
  taskDueDate.value = task?.dueDate || "";
  taskModal.classList.add("open");
  taskModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => taskTitle.focus(), 50);
}

function closeModal() {
  taskModal.classList.remove("open");
  taskModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

document.getElementById("openAddTask").addEventListener("click", () => openModal());
document.getElementById("emptyAddTask").addEventListener("click", () => openModal());
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);

taskModal.addEventListener("click", event => {
  if (event.target === taskModal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && taskModal.classList.contains("open")) closeModal();
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) {
    taskTitle.focus();
    return;
  }
  const existingId = taskId.value;
  const existingTask = tasks.find(task => task.id === existingId);
  const taskData = {
    id: existingId || createId(),
    title,
    description: taskDescription.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    dueDate: taskDueDate.value,
    completed: existingTask?.completed || false,
    createdAt: existingTask?.createdAt || Date.now()
  };

  if (existingTask) {
    tasks = tasks.map(task => task.id === existingId ? taskData : task);
    showToast("Task updated successfully.");
  } else {
    tasks.unshift(taskData);
    showToast("New task added.");
  }
  saveTasks();
  closeModal();
  setFilter(activeFilter);
});

taskList.addEventListener("change", event => {
  const checkbox = event.target.closest('[data-action="toggle"]');
  if (!checkbox) return;
  const row = checkbox.closest("[data-task-id]");
  const task = tasks.find(item => item.id === row.dataset.taskId);
  if (!task) return;
  task.completed = checkbox.checked;
  saveTasks();
  renderTasks();
  showToast(task.completed ? "Nice work — task completed!" : "Task moved back to pending.");
});

taskList.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button || button.dataset.action === "toggle") return;
  const row = button.closest("[data-task-id]");
  const task = tasks.find(item => item.id === row.dataset.taskId);
  if (!task) return;

  if (button.dataset.action === "edit") {
    openModal(task);
  } else if (button.dataset.action === "delete") {
    if (window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderTasks();
      showToast("Task deleted.");
    }
  }
});

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    setFilter(button.dataset.filter);
    document.getElementById("sidebar").classList.remove("open");
  });
});

document.querySelectorAll(".category-chip").forEach(button => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);

document.getElementById("mobileMenu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "short", month: "short", day: "numeric"
});

const hour = new Date().getHours();
document.getElementById("greeting").innerHTML =
  `${hour < 12 ? "Good morning!" : hour < 18 ? "Good afternoon!" : "Good evening!"} <span>Let's get things done.</span>`;

saveTasks();
renderTasks();
