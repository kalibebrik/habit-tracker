// DOM Elements
const habitInput = document.getElementById('habit-input');
const addBtn = document.getElementById('add-btn');
const habitsList = document.getElementById('habits-list');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const filterContainer = document.querySelector('.filter-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const toastContainer = document.getElementById('toast-container');

// App State
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentFilter = 'all';
let draggedHabitId = null;

// Theme Management
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('habit-theme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('habit-theme') || 'dark';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);
loadTheme();

// Add Habit
function handleAddHabit() {
    const text = habitInput.value.trim();

    if (text === '') {
        habitInput.classList.add('input-error', 'shake');
        habitInput.focus();
        return;
    }

    const newHabit = {
        id: Date.now(),
        text: text,
        completed: false,
        completedDates: []
    };

    habits.push(newHabit);
    saveHabits();
    renderHabits();

    habitInput.value = '';
}

addBtn.addEventListener('click', handleAddHabit);

habitInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        handleAddHabit();
    }
});

habitInput.addEventListener('input', function () {
    habitInput.classList.remove('input-error');
});

habitInput.addEventListener('animationend', function () {
    habitInput.classList.remove('shake');
});

// Render Habits (XSS-safe)
function renderHabits() {
    habitsList.innerHTML = '';
    updateProgress();

    const filteredHabits = habits.filter(function (habit) {
        if (currentFilter === 'active') return !habit.completed;
        if (currentFilter === 'completed') return habit.completed;
        return true;
    });

    if (filteredHabits.length === 0) {
        const message = currentFilter === 'all'
            ? 'No habits yet. Add one to get started!'
            : `No ${currentFilter} habits found.`;

        habitsList.innerHTML = `<p class="empty-message">${message}</p>`;
        return;
    }

    filteredHabits.forEach(function (habit) {
        const li = document.createElement('li');
        // Drag and drop handlers
        li.draggable = true;

        li.addEventListener('dragstart', (event) => {
            draggedHabitId = habit.id;
            event.dataTransfer.effectAllowed = 'move';

            // Delay visual feedback to preserve crisp drag ghost snapshot
            setTimeout(() => {
                li.setAttribute('aria-grabbed', 'true');
            }, 0);
        });

        li.addEventListener('dragenter', () => {
            if (draggedHabitId !== null && draggedHabitId !== habit.id) {
                li.classList.add('drag-over');
            }
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });

        li.addEventListener('dragend', () => {
            li.setAttribute('aria-grabbed', 'false');
            draggedHabitId = null;
            habitsList.querySelectorAll('.drag-over').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        li.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        });

        li.addEventListener('drop', (event) => {
            event.preventDefault();
            li.classList.remove('drag-over')

            if (draggedHabitId === null || draggedHabitId === habit.id) {
                return;
            }

            const fromIndex = habits.findIndex(h => h.id === draggedHabitId);
            const toIndex = habits.findIndex(h => h.id === habit.id);

            if (fromIndex === -1 || toIndex === -1) {
                return;
            }

            const [movedHabit] = habits.splice(fromIndex, 1);
            habits.splice(toIndex, 0, movedHabit);

            saveHabits();
            renderHabits();
        });


        li.classList.add('habit-item');
        if (habit.completed) {
            li.classList.add('completed');
        }

        const checkBtn = document.createElement('button');
        checkBtn.className = 'check-btn';
        checkBtn.dataset.id = habit.id;
        checkBtn.textContent = habit.completed ? '✓' : '';

        const textSpan = document.createElement('span');
        textSpan.className = 'habit-text';
        textSpan.dataset.id = habit.id;
        textSpan.textContent = habit.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.dataset.id = habit.id;
        deleteBtn.textContent = '✕';

        li.appendChild(checkBtn);
        li.appendChild(textSpan);

        // Streak badge
        const streak = calculateStreak(habit.completedDates);
        if (streak > 0) {
            const streakBadge = document.createElement('span');
            streakBadge.className = 'streak-badge';
            streakBadge.textContent = `${streak}d`;
            li.appendChild(streakBadge);
        }

        li.appendChild(deleteBtn);

        habitsList.appendChild(li);
    });
    // Allow dragging over gaps inside the list container and enforce move cursor
    habitsList.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    });
}

// List Click Events
habitsList.addEventListener('click', function (event) {
    const target = event.target;
    const id = parseInt(target.dataset.id);

    if (target.classList.contains('check-btn')) {
        toggleHabitCompletion(id);
    }
    if (target.classList.contains('delete-btn')) {
        deleteHabit(id);
    }
});

// Inline Editing
habitsList.addEventListener('dblclick', function (event) {
    const target = event.target;
    if (!target.classList.contains('habit-text')) return;

    // Disable dragging while editing text so mouse selection works inside input
    const li = target.closest('li');
    if (li) {
        li.draggable = false;
    }

    const id = parseInt(target.dataset.id);
    const currentText = target.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = currentText;

    target.replaceWith(input);
    input.focus();

    let isHandled = false;

    function saveEdit() {
        if (isHandled) return;
        isHandled = true;

        const newText = input.value.trim();

        if (newText !== '' && newText !== currentText) {
            habits = habits.map(habit => {
                if (habit.id === id) {
                    return { ...habit, text: newText };
                }
                return habit;
            });
            saveHabits();
        }

        renderHabits();
    }

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            isHandled = true;
            renderHabits();
        }
    });

    input.addEventListener('blur', saveEdit);
});

// Data Mutations
function toggleHabitCompletion(id) {
    const today = getTodayDate();
    habits = habits.map(function (habit) {
        if (habit.id !== id) return habit;

        const dates = habit.completedDates || [];
        const isDoneToday = dates.includes(today);
        const updatedDates = isDoneToday
            ? dates.filter(date => date !== today)
            : [...dates, today];

        return {
            ...habit,
            completed: !isDoneToday,
            completedDates: updatedDates
        };
    });
    saveHabits();
    renderHabits();
}

function deleteHabit(id) {
    const habitIndex = habits.findIndex(h => h.id === id);
    if (habitIndex === -1) return;

    const [deletedHabit] = habits.splice(habitIndex, 1);
    saveHabits();
    renderHabits();

    showToast('Habit deleted', function () {
        habits.splice(habitIndex, 0, deletedHabit);
        saveHabits();
        renderHabits();
    });
}

function clearCompletedHabits() {
    const completedHabits = habits.filter(habit => habit.completed);
    if (completedHabits.length === 0) return;

    const previousHabits = [...habits];

    habits = habits.filter(habit => !habit.completed);
    saveHabits();
    renderHabits();

    const label = completedHabits.length === 1 ? '1 completed habit' : `${completedHabits.length} completed habits`;
    showToast(`${label} cleared`, function () {
        habits = previousHabits;
        saveHabits();
        renderHabits();
    });
}

clearCompletedBtn.addEventListener('click', clearCompletedHabits);

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

// Toast Notification System
function showToast(message, onUndo, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = 'toast';

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    let timerId;

    function removeToast() {
        toast.classList.add('removing');
        toast.addEventListener('animationend', function () {
            toast.remove();
        });
    }

    if (onUndo) {
        const undoBtn = document.createElement('button');
        undoBtn.className = 'toast-undo-btn';
        undoBtn.textContent = 'Undo';
        undoBtn.addEventListener('click', function () {
            clearTimeout(timerId);
            onUndo();
            removeToast();
        });
        toast.appendChild(undoBtn);
    }

    toastContainer.appendChild(toast);

    timerId = setTimeout(removeToast, duration);
}

// Filters & Progress Tracking
filterContainer.addEventListener('click', function (event) {
    if (!event.target.classList.contains('filter-btn')) return;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    currentFilter = event.target.dataset.filter;
    renderHabits();
});

function updateProgress() {
    const totalCount = habits.length;
    const completedCount = habits.filter(habit => habit.completed).length;

    if (completedCount > 0) {
        clearCompletedBtn.style.display = 'block';
        clearCompletedBtn.textContent = `Clear Completed (${completedCount})`;
    } else {
        clearCompletedBtn.style.display = 'none';
    }

    const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Completed: ${completedCount} out of ${totalCount}`;
}

// Date format helper (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get current date string
function getTodayDate() {
    return formatDate(new Date());
}

// Calculate streak count
function calculateStreak(completedDates) {
    if (!completedDates || completedDates.length === 0) {
        return 0;
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = formatDate(today);
    const yesterdayStr = formatDate(yesterday);

    let currentDateToCheck = new Date();

    if (completedDates.includes(todayStr)) {
        currentDateToCheck = today;
    } else if (completedDates.includes(yesterdayStr)) {
        currentDateToCheck = yesterday;
    } else {
        return 0;
    }

    let streak = 0;

    while (completedDates.includes(formatDate(currentDateToCheck))) {
        streak++;
        currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
    }

    return streak;
}

// Sync habit completion status with current date on load
function syncHabitsForToday() {
    const today = getTodayDate();
    habits = habits.map(function (habit) {
        const dates = habit.completedDates || [];
        return {
            ...habit,
            completed: dates.includes(today)
        };
    });
    saveHabits();
}

// Initialization
syncHabitsForToday();
renderHabits();