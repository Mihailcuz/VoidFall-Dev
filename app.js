const storageKey = 'voidfallPlannerData';
let currentUser = null;
let currentTaskId = null;

const ui = {
  loginPanel: document.getElementById('loginPanel'),
  mainUI: document.getElementById('mainUI'),
  loginBtn: document.getElementById('loginBtn'),
  accessCodeInput: document.getElementById('accessCode'),
  loginMessage: document.getElementById('loginMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  showAdminBtn: document.getElementById('showAdminBtn'),
  showTasksBtn: document.getElementById('showTasksBtn'),
  navDashboard: document.getElementById('navDashboard'),
  navTasks: document.getElementById('navTasks'),
  navAdmin: document.getElementById('navAdmin'),
  cardsPanel: document.querySelector('.cards-panel'),
  tasksSection: document.getElementById('tasksSection'),
  adminSection: document.getElementById('adminSection'),
  createTaskBtn: document.getElementById('createTaskBtn'),
  tasksList: document.getElementById('tasksList'),
  taskDetail: document.getElementById('taskDetail'),
  userName: document.getElementById('userName'),
  userRole: document.getElementById('userRole'),
  welcomeText: document.getElementById('welcomeText'),
  newDisplayName: document.getElementById('newDisplayName'),
  newRole: document.getElementById('newRole'),
  newCode: document.getElementById('newCode'),
  createAccessCodeBtn: document.getElementById('createAccessCodeBtn'),
  accessCodeMessage: document.getElementById('accessCodeMessage'),
  codesTable: document.getElementById('codesTable'),
  taskCardTemplate: document.getElementById('taskCardTemplate'),
  taskDetailTemplate: document.getElementById('taskDetailTemplate'),
  closeTaskDetailBtn: document.getElementById('closeTaskDetailBtn')
};

function initializeData() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.tasks) return data;
    } catch (e) {}
  }

  const seed = {
    users: [
      { code: 'DEVLEAD0000', displayName: 'Mihail', role: 'owner', createdBy: 'system' },
      { code: 'ADMIN0001', displayName: 'Alpha Admin', role: 'admin', createdBy: 'system' },
      { code: 'BUILDER001', displayName: 'Builder', role: 'member', createdBy: 'system' }
    ],
    tasks: [
      {
        id: crypto.randomUUID(),
        title: 'Finish lobby scene',
        status: 'In Progress',
        assignedTo: 'Builder',
        createdBy: 'Mihail',
        createdAt: Date.now() - 86400000
      },
      {
        id: crypto.randomUUID(),
        title: 'Create NPC dialog system',
        status: 'Active',
        assignedTo: 'Alpha Admin',
        createdBy: 'Mihail',
        createdAt: Date.now() - 172800000
      }
    ]
  };
  localStorage.setItem(storageKey, JSON.stringify(seed));
  return seed;
}

function saveData(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function loadData() {
  return JSON.parse(localStorage.getItem(storageKey) || '{}');
}

function setCurrentUser(user) {
  currentUser = user;
  sessionStorage.setItem('currentUserCode', user.code);
}

function restoreCurrentUser() {
  const code = sessionStorage.getItem('currentUserCode');
  if (!code) return null;
  const data = loadData();
  return data.users.find(u => u.code === code) || null;
}

function showMessage(target, message, success = false) {
  target.textContent = message;
  target.style.color = success ? '#8cff8f' : '#ff8a8a';
  if (message) setTimeout(() => { target.textContent = ''; }, 4200);
}

function getStatusBadge(status) {
  if (status === 'Active') return '🟢 Active';
  if (status === 'In Progress') return '🟡 In Progress';
  if (status === 'Completed') return '✅ Completed';
  return '🔴 Paused';
}

const STATUSES = ['Active', 'In Progress', 'Paused', 'Completed'];

function buildUserInterface() {
  ui.userName.textContent = currentUser.displayName;
  ui.userRole.textContent = currentUser.role.toUpperCase();
  ui.welcomeText.textContent = `Logged in as ${currentUser.displayName} (${currentUser.role}). Use the panels to manage tasks, access codes, and collaboration.`;
  ui.showAdminBtn.classList.toggle('hidden', currentUser.role === 'member');
  ui.createTaskBtn.classList.toggle('hidden', currentUser.role === 'member');
  ui.cardsPanel.classList.remove('hidden');
  ui.tasksSection.classList.add('hidden');
  ui.adminSection.classList.add('hidden');
  ui.navAdmin.classList.toggle('hidden', currentUser.role !== 'admin' && currentUser.role !== 'owner');
  ui.taskDetail.classList.add('hidden');
  renderTasks();
  renderCodes();
  updateNavButtons('dashboard');
}

function renderTasks() {
  const data = loadData();
  ui.tasksList.innerHTML = '';
  data.tasks.forEach(task => {
    const card = ui.taskCardTemplate.content.cloneNode(true);
    card.querySelector('.task-title').textContent = task.title;
    card.querySelector('.status-badge').textContent = getStatusBadge(task.status);
    card.querySelector('.task-assigned').textContent = task.assignedTo;
    card.querySelector('.task-creator').textContent = task.createdBy;
    card.querySelector('.task-created').textContent = new Date(task.createdAt).toLocaleDateString();
    const viewBtn = card.querySelector('.view-task-btn');
    const markDoneBtn = card.querySelector('.mark-done-btn');
    const deleteBtn = card.querySelector('.delete-task-btn');
    viewBtn.addEventListener('click', () => openTask(task.id));
    if (task.assignedTo === currentUser.displayName && task.status !== 'Completed') {
      markDoneBtn.classList.remove('hidden');
      markDoneBtn.addEventListener('click', () => markTaskDone(task.id));
    }
    if (currentUser.role !== 'member') {
      deleteBtn.classList.remove('hidden');
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete task "${task.title}"?`)) {
          deleteTask(task.id);
        }
      });
    }
    ui.tasksList.appendChild(card);
  });
}

function updateNavButtons(activeSection) {
  ui.navDashboard.classList.toggle('active', activeSection === 'dashboard');
  ui.navTasks.classList.toggle('active', activeSection === 'tasks');
  ui.navAdmin.classList.toggle('active', activeSection === 'admin');
}

function showSection(section) {
  ui.cardsPanel.classList.toggle('hidden', section !== 'dashboard');
  ui.tasksSection.classList.toggle('hidden', section !== 'tasks');
  ui.adminSection.classList.toggle('hidden', section !== 'admin');
  updateNavButtons(section);
}

function renderCodes() {
  if (!currentUser) return;
  const data = loadData();
  ui.codesTable.innerHTML = '';
  const visibleCodes = currentUser.role === 'owner'
    ? data.users
    : data.users.filter(u => u.createdBy === currentUser.code || u.code === currentUser.code);

  visibleCodes.forEach(user => {
    const card = document.createElement('div');
    card.className = 'code-card';
    card.innerHTML = `
      <div class="code-row"><strong>Display</strong><span>${user.displayName}</span></div>
      <div class="code-row"><strong>Access Code</strong><span>${user.code}</span></div>
      <div class="code-row"><strong>Role</strong><span>${user.role}</span></div>
      <div class="code-row"><strong>Created by</strong><span>${user.createdBy}</span></div>
    `;
    if (currentUser.role === 'owner' || user.createdBy === currentUser.code) {
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      if (user.code !== 'DEVLEAD0000' && user.code !== currentUser.code) {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'small-btn danger';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
          if (confirm(`Delete access code ${user.code}?`)) {
            deleteCode(user.code);
          }
        });
        actions.appendChild(deleteButton);
      }
      if (currentUser.role === 'owner' || (currentUser.role === 'admin' && user.role === 'member')) {
        const roleSelect = document.createElement('select');
        roleSelect.className = 'role-select';
        const roles = currentUser.role === 'owner' ? ['member', 'admin', 'owner'] : ['member'];
        roles.forEach(role => {
          const option = document.createElement('option');
          option.value = role;
          option.textContent = role;
          if (role === user.role) option.selected = true;
          roleSelect.appendChild(option);
        });
        roleSelect.addEventListener('change', () => updateUserRole(user.code, roleSelect.value));
        actions.appendChild(roleSelect);
      }
      card.appendChild(actions);
    }
    ui.codesTable.appendChild(card);
  });
}

function updateUserRole(code, newRole) {
  const data = loadData();
  const user = data.users.find(u => u.code === code);
  if (!user) return;
  if (user.code === 'DEVLEAD0000') return;
  if (currentUser.role !== 'owner' && newRole !== 'member') {
    showMessage(ui.accessCodeMessage, 'Only owner may assign admin roles.');
    renderCodes();
    return;
  }
  user.role = newRole;
  saveData(data);
  renderCodes();
  showMessage(ui.accessCodeMessage, `Role updated for ${user.displayName}.`, true);
}

function deleteCode(code) {
  const data = loadData();
  const index = data.users.findIndex(u => u.code === code);
  if (index === -1) return;
  if (data.users[index].code === 'DEVLEAD0000') return;
  data.users.splice(index, 1);
  saveData(data);
  renderCodes();
}

function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createAccessCode() {
  const displayName = ui.newDisplayName.value.trim();
  let role = ui.newRole.value;
  const customCode = ui.newCode.value.trim().toUpperCase();
  if (!displayName) {
    return showMessage(ui.accessCodeMessage, 'Display name is required.');
  }
  if (currentUser.role === 'admin') {
    role = 'member';
  }
  const data = loadData();
  let code = customCode || generateRandomCode();
  while (data.users.some(u => u.code === code)) {
    code = generateRandomCode();
  }
  data.users.push({ code, displayName, role, createdBy: currentUser.code });
  saveData(data);
  ui.newDisplayName.value = '';
  ui.newCode.value = '';
  ui.newRole.value = 'member';
  renderCodes();
  showMessage(ui.accessCodeMessage, `Created ${role} code for ${displayName}: ${code}`, true);
}

function openTask(id) {
  const data = loadData();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;
  currentTaskId = id;
  ui.taskDetail.innerHTML = '';
  const detail = ui.taskDetailTemplate.content.cloneNode(true);
  detail.querySelector('.detail-title').textContent = task.title;
  detail.querySelector('.detail-status').textContent = getStatusBadge(task.status);
  detail.querySelector('.detail-assigned').textContent = task.assignedTo;
  detail.querySelector('.detail-creator').textContent = task.createdBy;
  detail.querySelector('.detail-created').textContent = new Date(task.createdAt).toLocaleString();

  const editSection = detail.querySelector('.detail-edit');
  const statusSelect = editSection.querySelector('.edit-status');
  const assignedInput = editSection.querySelector('.edit-assigned');
  const saveButton = editSection.querySelector('.edit-save-btn');
  STATUSES.forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    if (status === task.status) option.selected = true;
    statusSelect.appendChild(option);
  });
  assignedInput.value = task.assignedTo;

  const actionsContainer = detail.querySelector('.detail-actions');
  const closeButton = actionsContainer.querySelector('#closeTaskDetailBtn');

  if (task.status === 'Completed') {
    const returnBtn = document.createElement('button');
    returnBtn.className = 'small-btn';
    returnBtn.textContent = 'Return Task';
    returnBtn.addEventListener('click', () => returnTask(id));
    actionsContainer.insertBefore(returnBtn, closeButton);
  } else if (task.assignedTo === currentUser.displayName) {
    const markDoneBtn = document.createElement('button');
    markDoneBtn.className = 'small-btn';
    markDoneBtn.textContent = 'Mark Done';
    markDoneBtn.addEventListener('click', () => markTaskDone(id));
    actionsContainer.insertBefore(markDoneBtn, closeButton);
  }

  if (currentUser.role !== 'member' || task.assignedTo === currentUser.displayName) {
    editSection.classList.remove('hidden');
    assignedInput.disabled = currentUser.role === 'member';
    saveButton.addEventListener('click', () => saveTaskUpdates(id, statusSelect.value, assignedInput.value.trim()));
  }

  ui.taskDetail.appendChild(detail);
  ui.taskDetail.classList.remove('hidden');

  const reassignBtn = ui.taskDetail.querySelector('.reassign-btn');
  const deleteDetailBtn = ui.taskDetail.querySelector('.delete-task-detail-btn');
  if (currentUser.role !== 'member') {
    reassignBtn.classList.remove('hidden');
    deleteDetailBtn.classList.remove('hidden');
    reassignBtn.addEventListener('click', () => reassignTask(id));
    deleteDetailBtn.addEventListener('click', () => {
      if (confirm(`Delete task "${task.title}"?`)) {
        deleteTask(id);
      }
    });
  }

  ui.taskDetail.querySelector('#closeTaskDetailBtn').addEventListener('click', () => {
    ui.taskDetail.classList.add('hidden');
  });
}

function saveTaskUpdates(id, status, assignedTo) {
  const data = loadData();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;
  if (STATUSES.includes(status)) task.status = status;
  if (assignedTo) task.assignedTo = assignedTo;
  saveData(data);
  renderTasks();
  openTask(id);
}


function reassignTask(id) {
  const newAssignee = prompt('Assign to (display name)');
  if (!newAssignee) return;
  const data = loadData();
  const task = data.tasks.find(t => t.id === id);
  if (!task) return;
  task.assignedTo = newAssignee;
  saveData(data);
  openTask(id);
}

function createTask() {
  const title = prompt('Task title');
  if (!title) return;
  const status = prompt('Status: Active / In Progress / Paused / Completed', 'Active');
  const assignedTo = prompt('Assign to (display name)', currentUser.displayName);
  const data = loadData();
  data.tasks.push({
    id: crypto.randomUUID(),
    title,
    status: ['Active', 'In Progress', 'Paused', 'Completed'].includes(status) ? status : 'Active',
    assignedTo,
    createdBy: currentUser.displayName,
    createdAt: Date.now()
  });
  saveData(data);
  renderTasks();
}

function deleteTask(id) {
  const data = loadData();
  data.tasks = data.tasks.filter(task => task.id !== id);
  saveData(data);
  if (currentTaskId === id) {
    ui.taskDetail.classList.add('hidden');
    currentTaskId = null;
  }
  renderTasks();
}

function markTaskDone(id) {
  const data = loadData();
  const task = data.tasks.find(task => task.id === id);
  if (!task) return;
  task.status = 'Completed';
  saveData(data);
  renderTasks();
  if (currentTaskId === id || ui.taskDetail.classList.contains('hidden') === false) {
    openTask(id);
  }
}

function returnTask(id) {
  const data = loadData();
  const task = data.tasks.find(task => task.id === id);
  if (!task) return;
  const status = prompt('Return task status: Active / In Progress / Paused', 'Active');
  task.status = ['Active', 'In Progress', 'Paused'].includes(status) ? status : 'Active';
  saveData(data);
  renderTasks();
  openTask(id);
}

function initHandlers() {
  ui.loginBtn.addEventListener('click', handleLogin);
  ui.accessCodeInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  });
  ui.logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('currentUserCode');
    currentUser = null;
    ui.mainUI.classList.add('hidden');
    ui.loginPanel.classList.remove('hidden');
    ui.accessCodeInput.value = '';
  });
  ui.navDashboard.addEventListener('click', () => showSection('dashboard'));
  ui.navTasks.addEventListener('click', () => showSection('tasks'));
  ui.navAdmin.addEventListener('click', () => showSection('admin'));
  ui.showTasksBtn.addEventListener('click', () => showSection('tasks'));
  ui.showAdminBtn.addEventListener('click', () => showSection('admin'));
  ui.createTaskBtn.addEventListener('click', createTask);
  ui.createAccessCodeBtn.addEventListener('click', createAccessCode);
}

function handleLogin() {
  const code = ui.accessCodeInput.value.trim().toUpperCase();
  if (!code) return showMessage(ui.loginMessage, 'Enter an access code to continue.');
  const data = loadData();
  const user = data.users.find(u => u.code === code);
  if (!user) return showMessage(ui.loginMessage, 'Invalid access code.');
  setCurrentUser(user);
  ui.loginPanel.classList.add('hidden');
  ui.mainUI.classList.remove('hidden');
  buildUserInterface();
}

function startMatrix() {
  const canvas = document.getElementById('matrixCanvas');
  const ctx = canvas.getContext('2d');
  const cols = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()<>?';
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / 12);
    cols.length = 0;
    for (let i = 0; i < columns; i++) cols[i] = canvas.height;
  }
  window.addEventListener('resize', resize);
  resize();
  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4cff7f';
    ctx.font = '12px monospace';
    cols.forEach((y, index) => {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      const x = index * 12;
      ctx.fillText(text, x, y);
      if (y > canvas.height + 80 || Math.random() > 0.98) cols[index] = 0;
      else cols[index] = y + 11;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

function init() {
  initializeData();
  initHandlers();
  startMatrix();
  const restored = restoreCurrentUser();
  if (restored) {
    setCurrentUser(restored);
    ui.loginPanel.classList.add('hidden');
    ui.mainUI.classList.remove('hidden');
    buildUserInterface();
  }
}

init();
