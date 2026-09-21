const habitInput = document.getElementById('habit-input');
const addBtn = document.getElementById('add-btn');
const habitsList = document.getElementById('habits-list');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentFilter = 'all';

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
        completed: false
    };

    habits.push(newHabit);

    saveHabits()

    console.log('Current list of habits:', habits);

    renderHabits();

    habitInput.value = '';
}

addBtn.addEventListener('click', handleAddHabit);

habitInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        handleAddHabit();
    }
});

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
        li.classList.add('habit-item');

        if (habit.completed) {
            li.classList.add('completed');
        }

        li.innerHTML = `
            <button class="check-btn" data-id="${habit.id}">
                ${habit.completed ? '✓' : ''}
            </button>
            <span class="habit-text" data-id="${habit.id}">${habit.text}</span>
            <button class="delete-btn" data-id="${habit.id}">✕</button>
        `;

        habitsList.appendChild(li);
    });
}

habitsList.addEventListener('dblclick', function (event) {
    const target = event.target;
    if (!target.classList.contains('habit-text')) return;

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

habitsList.addEventListener('click', function (event) {
    const target = event.target;
    const id = parseInt(target.dataset.id);

    if (target.classList.contains('check-btn')) {
        toggleHabitCompletion(id);
    }
    if (target.classList.contains('delete-btn')) {
        deleteHabit(id);
    }
})

function toggleHabitCompletion(id) {
    habits = habits.map(function (habit) {
        if (habit.id === id) {
            return {
                ...habit,
                completed: !habit.completed
            }
        }
        return habit;
    });
    saveHabits()
    renderHabits();
}

function deleteHabit(id) {
    habits = habits.filter(function (habit) {
        return habit.id !== id;
    });
    saveHabits();
    renderHabits();
}

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}



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

const filterContainer = document.querySelector('.filter-container');

filterContainer.addEventListener('click', function (event) {

    if (!event.target.classList.contains('filter-btn')) return;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    currentFilter = event.target.dataset.filter;

    renderHabits();
});

function clearCompletedHabits() {
    habits = habits.filter(habit => !habit.completed);
    saveHabits();
    renderHabits();
}

habitInput.addEventListener('input', function () {
    habitInput.classList.remove('input-error');
});
habitInput.addEventListener('animationend', function () {
    habitInput.classList.remove('shake');
});
clearCompletedBtn.addEventListener('click', clearCompletedHabits);

renderHabits();