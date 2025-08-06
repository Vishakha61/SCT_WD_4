document.addEventListener('DOMContentLoaded', () => {
    // Check if the current page is the welcome page
    if (document.getElementById('welcomePage')) {
        const nameInput = document.getElementById('nameInput');
        const startButton = document.getElementById('startButton');

        startButton.addEventListener('click', () => {
            const userName = nameInput.value.trim();
            if (userName) {
                localStorage.setItem('userName', userName);
                window.location.href = 'todo.html';
            } else {
                alert('Please enter your name.');
            }
        });
    }

    // Check if the current page is the to-do list page
    if (document.getElementById('todoApp')) {
        const todoApp = document.getElementById('todoApp');
        const todoTitle = document.getElementById('todoTitle');
        const goBackBtn = document.getElementById('goBackBtn');
        const taskInput = document.getElementById('taskInput');
        const tagInput = document.getElementById('tagInput');
        const priorityInput = document.getElementById('priorityInput');
        const taskDateInput = document.getElementById('taskDate');
        const taskTimeInput = document.getElementById('taskTime');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskList = document.getElementById('taskList');
        const searchInput = document.getElementById('searchInput');
        const filterButtons = document.querySelectorAll('.filter-buttons button');
        const emptyMessage = document.getElementById('emptyMessage');
        const clearAllBtn = document.getElementById('clearAllBtn');
        
        // Retrieve the user's name from localStorage and update the title
        const userName = localStorage.getItem('userName') || 'User';
        todoTitle.textContent = `${userName}'s To-Do List`;

        // State Management
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let currentFilter = 'all';
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };

        // --- Core Application Functions ---

        const convertMarkdown = (text) => {
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
            text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
            text = text.replace(/_(.*?)_/g, '<em>$1</em>');
            text = text.replace(/`(.*?)`/g, '<code>$1</code>');
            return text;
        };

        const renderTasks = () => {
            taskList.innerHTML = '';
            const searchQuery = searchInput.value.toLowerCase();
            
            tasks.sort((a, b) => {
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (priorityDiff !== 0) {
                    return priorityDiff;
                }
                const dateA = a.date && a.time ? new Date(`${a.date}T${a.time}`) : new Date(0);
                const dateB = b.date && b.time ? new Date(`${b.date}T${b.time}`) : new Date(0);
                return dateA - dateB;
            });

            const filteredTasks = tasks.filter(task => {
                const matchesSearch = searchQuery === '' || 
                                      task.text.toLowerCase().includes(searchQuery) ||
                                      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchQuery)));
                
                if (currentFilter === 'active') {
                    return !task.completed && matchesSearch;
                } else if (currentFilter === 'completed') {
                    return task.completed && matchesSearch;
                }
                return matchesSearch;
            });

            if (filteredTasks.length === 0) {
                emptyMessage.classList.remove('hidden');
            } else {
                emptyMessage.classList.add('hidden');
                filteredTasks.forEach(task => {
                    const li = createTaskElement(task);
                    taskList.appendChild(li);
                });
            }
        };

        const createTaskElement = (task) => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;
            li.draggable = true;

            const formattedDateTime = task.date && task.time ? `${task.date} at ${task.time}` : (task.date || task.time);
            const tagsHtml = (task.tags && task.tags.length > 0) ? task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('') : '';
            const formattedText = convertMarkdown(task.text);

            li.innerHTML = `
                <div class="task-content">
                    <div class="task-content-inner">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="task-text">${formattedText}</span>
                        <div class="priority-dot priority-${task.priority}"></div>
                    </div>
                </div>
                ${formattedDateTime ? `<div class="task-datetime">${formattedDateTime}</div>` : ''}
                ${tagsHtml ? `<div class="task-tags">${tagsHtml}</div>` : ''}
                <div class="task-actions">
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;

            li.querySelector('.task-checkbox').addEventListener('change', () => toggleTaskStatus(task.id, li));
            li.querySelector('.delete-btn').addEventListener('click', (e) => deleteTask(e, task.id, li));
            li.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id, li));
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragleave', handleDragLeave);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);

            return li;
        };

        const addTask = () => {
            const taskText = taskInput.value.trim();
            const taskDate = taskDateInput.value;
            const taskTime = taskTimeInput.value;
            const taskTags = tagInput.value ? [tagInput.value] : [];
            const taskPriority = priorityInput.value || 'medium';

            if (taskText === '') return;

            const newTask = {
                id: Date.now().toString(),
                text: taskText,
                completed: false,
                date: taskDate,
                time: taskTime,
                tags: taskTags,
                priority: taskPriority
            };

            tasks.unshift(newTask);
            saveTasks();
            
            // Reset inputs
            taskInput.value = '';
            tagInput.value = '';
            priorityInput.value = '';
            taskDateInput.value = '';
            taskTimeInput.value = '';
            
            renderTasks();

            const newTaskElement = taskList.querySelector(`[data-id="${newTask.id}"]`);
            if (newTaskElement) {
                newTaskElement.classList.add('new-task');
                setTimeout(() => newTaskElement.classList.remove('new-task'), 500);
            }
        };

        const toggleTaskStatus = (id, li) => {
            const taskIndex = tasks.findIndex(task => task.id === id);
            if (taskIndex > -1) {
                tasks[taskIndex].completed = !tasks[taskIndex].completed;
                saveTasks();
                
                li.classList.toggle('completed');
                li.querySelector('.task-checkbox').checked = tasks[taskIndex].completed;
            }
        };

        const deleteTask = (e, id, li) => {
            e.stopPropagation();
            
            li.classList.add('fade-out');
            
            const removeTask = () => {
                li.remove();
                tasks = tasks.filter(task => task.id !== id);
                saveTasks();
                if (tasks.length === 0) {
                    emptyMessage.classList.remove('hidden');
                }
            };

            li.addEventListener('transitionend', removeTask, { once: true });
            
            setTimeout(() => {
                if (li.parentNode) {
                    removeTask();
                }
            }, 500);
        };

        const editTask = (id, li) => {
            const task = tasks.find(t => t.id === id);
            const newText = prompt('Edit your task:', task.text);
            const newTag = prompt('Edit tag (e.g., Work, Personal):', task.tags ? task.tags[0] : '');
            const newPriority = prompt('Edit priority (high, medium, or low):', task.priority);

            if (newText !== null && newText.trim() !== '') {
                const taskIndex = tasks.findIndex(t => t.id === id);
                if (taskIndex > -1) {
                    tasks[taskIndex].text = newText.trim();
                    tasks[taskIndex].tags = newTag ? [newTag.trim()] : [];
                    tasks[taskIndex].priority = newPriority && ['high', 'medium', 'low'].includes(newPriority.toLowerCase()) ? newPriority.toLowerCase() : 'medium';
                    saveTasks();
                    renderTasks();
                }
            }
        };

        const clearAllTasks = () => {
            if (confirm('Are you sure you want to clear all tasks? This cannot be undone.')) {
                tasks = [];
                saveTasks();
                renderTasks();
            }
        };

        const saveTasks = () => {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        };

        // --- Drag-and-Drop Functionality ---
        let draggedItem = null;
        const handleDragStart = (e) => {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        };
        const handleDragOver = (e) => {
            e.preventDefault();
            const target = e.target.closest('.task-item');
            if (target && target !== draggedItem) {
                const rect = target.getBoundingClientRect();
                const isAfter = e.clientY > rect.top + rect.height / 2;
                if (isAfter) {
                    taskList.insertBefore(draggedItem, target.nextSibling);
                } else {
                    taskList.insertBefore(draggedItem, target);
                }
            }
        };
        const handleDragLeave = (e) => {};
        const handleDrop = (e) => {
            e.preventDefault();
            const startId = draggedItem.dataset.id;
            const endId = e.target.closest('.task-item').dataset.id;
            const startIdx = tasks.findIndex(task => task.id === startId);
            const endIdx = tasks.findIndex(task => task.id === endId);
            if (startIdx !== -1 && endIdx !== -1) {
                const [reorderedItem] = tasks.splice(startIdx, 1);
                tasks.splice(endIdx, 0, reorderedItem);
                saveTasks();
            }
            renderTasks();
        };
        const handleDragEnd = (e) => {
            e.target.classList.remove('dragging');
            draggedItem = null;
        };

        // --- Event Listeners ---
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTask();
            }
        });
        searchInput.addEventListener('input', renderTasks);
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.id.replace('Filter', '');
                renderTasks();
            });
        });
        clearAllBtn.addEventListener('click', clearAllTasks);
        goBackBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        renderTasks();
    }
});