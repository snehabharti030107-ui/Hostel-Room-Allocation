const API = '/api';
let token = localStorage.getItem('hostelToken') || '';
let currentUser = JSON.parse(localStorage.getItem('hostelUser') || 'null');
let studentsCache = [], roomsCache = [], allocationsCache = [];
let authMode = 'login';
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
function notify(message, error = false) {
  const el = $('alert'); el.textContent = message; el.className = `alert${error ? ' error' : ''}`;
  clearTimeout(notify.timer); notify.timer = setTimeout(() => el.classList.add('hidden'), 3500);
}
function showAuth() { $('authView').classList.remove('hidden'); $('appView').classList.add('hidden'); }
function showApp() {
  $('authView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('adminDisplay').textContent = currentUser?.name || 'Administrator'; $('welcomeName').textContent = currentUser?.name || 'Admin';
  loadAll();
}
function setAuthMode(mode) {
  authMode = mode;
  const register = mode === 'register';
  $('authTitle').textContent = register ? 'Create admin account' : 'Welcome back';
  $('authSubtitle').textContent = register ? 'Set up the first administrator account.' : 'Sign in to manage hostel rooms and students.';
  $('nameGroup').classList.toggle('hidden', !register);
  $('adminName').required = register;
  $('authSubmit').textContent = register ? 'Create account' : 'Sign in';
  $('authHint').innerHTML = register ? 'Already registered? <button type="button" class="text-btn" id="toggleAuth">Sign in</button>' : 'First time? <button type="button" class="text-btn" id="toggleAuth">Create the first admin account</button>';
  $('toggleAuth').addEventListener('click', () => setAuthMode(register ? 'login' : 'register'));
  $('authMessage').textContent = '';
}
$('toggleAuth').addEventListener('click', () => setAuthMode('register'));
$('authForm').addEventListener('submit', async e => {
  e.preventDefault(); $('authMessage').textContent = '';
  try {
    if (authMode === 'register') {
      await api('/auth/register', { method: 'POST', body: JSON.stringify({ name: $('adminName').value, email: $('authEmail').value, password: $('authPassword').value }) });
      setAuthMode('login'); $('authMessage').textContent = 'Admin created. You can now sign in.';
    } else {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: $('authEmail').value, password: $('authPassword').value }) });
      token = data.token; currentUser = data.user;
      localStorage.setItem('hostelToken', token); localStorage.setItem('hostelUser', JSON.stringify(currentUser)); showApp();
    }
  } catch (err) { $('authMessage').textContent = err.message; }
});
$('logoutBtn').addEventListener('click', () => { token = ''; currentUser = null; localStorage.removeItem('hostelToken'); localStorage.removeItem('hostelUser'); showAuth(); });

function navigate(page) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  $(`${page}Page`).classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $('pageTitle').textContent = ({ dashboard: 'Dashboard', students: 'Students', rooms: 'Rooms', allocations: 'Allocations' })[page];
  if (page === 'allocations') populateAllocationOptions();
}
document.querySelectorAll('.nav-link').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.go)));
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden')));

async function loadAll() {
  try {
    const [stats, students, rooms, allocations] = await Promise.all([api('/dashboard'), api('/students'), api('/rooms'), api('/allocations')]);
    studentsCache = students; roomsCache = rooms; allocationsCache = allocations;
    renderDashboard(stats); renderStudents(); renderRooms(); renderAllocations(); populateAllocationOptions();
  } catch (err) {
    notify(err.message, true);
    if (/log in|session|token/i.test(err.message)) $('logoutBtn').click();
  }
}
function renderDashboard(s) {
  $('statStudents').textContent = s.students; $('statRooms').textContent = s.rooms;
  $('statOccupied').textContent = s.occupiedBeds; $('statAvailable').textContent = s.availableBeds;
  const percent = s.totalBeds ? Math.round(s.occupiedBeds / s.totalBeds * 100) : 0;
  $('occupancyPercent').textContent = `${percent}% occupied`; $('occupancyBar').style.width = `${percent}%`;
  $('occupiedLabel').textContent = `${s.occupiedBeds} beds occupied`; $('totalBedsLabel').textContent = `${s.totalBeds} total beds`;
}
function renderStudents() {
  const query = ($('studentSearch').value || '').toLowerCase();
  const rows = studentsCache.filter(s => [s.name,s.rollNumber,s.email,s.department].some(v => String(v).toLowerCase().includes(query)));
  $('studentCount').textContent = `${studentsCache.length} students`;
  $('studentsTable').innerHTML = rows.length ? rows.map(s => `<tr><td><div class="student-cell"><div class="student-avatar">${escapeHTML(s.name.charAt(0).toUpperCase())}</div><div><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.email)}</small></div></div></td><td>${escapeHTML(s.rollNumber)}</td><td>${escapeHTML(s.department)}</td><td>${escapeHTML(s.year)}</td><td>${escapeHTML(s.phone)}</td><td><button class="action-btn" data-edit-student="${s._id}">Edit</button><button class="action-btn danger" data-delete-student="${s._id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="6" class="empty">No students found. Add your first student.</td></tr>';
}
$('studentSearch').addEventListener('input', renderStudents);
$('showStudentForm').addEventListener('click', () => { resetStudentForm(); $('studentForm').classList.remove('hidden'); });
function resetStudentForm() { $('studentForm').reset(); $('studentId').value = ''; $('studentFormTitle').textContent = 'Register student'; }
$('studentForm').addEventListener('submit', async e => {
  e.preventDefault(); const id = $('studentId').value;
  const body = { name:$('studentName').value, rollNumber:$('studentRoll').value, email:$('studentEmail').value, phone:$('studentPhone').value, department:$('studentDepartment').value, year:$('studentYear').value };
  try { await api(id ? `/students/${id}` : '/students', { method:id ? 'PUT' : 'POST', body:JSON.stringify(body) }); $('studentForm').classList.add('hidden'); resetStudentForm(); notify(id ? 'Student updated.' : 'Student registered.'); await loadAll(); }
  catch(err) { notify(err.message,true); }
});
$('studentsTable').addEventListener('click', async e => {
  const edit = e.target.dataset.editStudent, del = e.target.dataset.deleteStudent;
  if (edit) { const s = studentsCache.find(x => x._id === edit); if (!s) return; $('studentId').value=s._id; $('studentName').value=s.name; $('studentRoll').value=s.rollNumber; $('studentEmail').value=s.email; $('studentPhone').value=s.phone; $('studentDepartment').value=s.department; $('studentYear').value=s.year; $('studentFormTitle').textContent='Edit student'; $('studentForm').classList.remove('hidden'); }
  if (del && confirm('Delete this student?')) { try { await api(`/students/${del}`,{method:'DELETE'}); notify('Student deleted.'); await loadAll(); } catch(err) { notify(err.message,true); } }
});

function renderRooms() {
  $('roomsGrid').innerHTML = roomsCache.length ? roomsCache.map(r => { const percent = Math.round(r.occupied/r.capacity*100); return `<article class="room-card"><div class="room-top"><div><div class="room-number">Room ${escapeHTML(r.roomNumber)}</div><div class="room-meta">${escapeHTML(r.block)} · Floor ${r.floor}</div></div><span class="status ${r.availableBeds>0?'active':'released'}">${r.availableBeds>0?'Available':'Full'}</span></div><div class="room-count">${r.occupied} / ${r.capacity} beds occupied</div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><div class="room-actions"><button class="action-btn" data-edit-room="${r._id}">Edit</button><button class="action-btn danger" data-delete-room="${r._id}">Delete</button></div></article>`; }).join('') : '<div class="content-card empty">No rooms added yet. Add your first hostel room.</div>';
}
$('showRoomForm').addEventListener('click', () => { resetRoomForm(); $('roomForm').classList.remove('hidden'); });
function resetRoomForm() { $('roomForm').reset(); $('roomId').value=''; $('roomFormTitle').textContent='Add new room'; }
$('roomForm').addEventListener('submit', async e => {
  e.preventDefault(); const id=$('roomId').value; const body={roomNumber:$('roomNumber').value,block:$('roomBlock').value,floor:Number($('roomFloor').value),capacity:Number($('roomCapacity').value)};
  try { await api(id?`/rooms/${id}`:'/rooms',{method:id?'PUT':'POST',body:JSON.stringify(body)}); $('roomForm').classList.add('hidden'); resetRoomForm(); notify(id?'Room updated.':'Room added.'); await loadAll(); }
  catch(err) { notify(err.message,true); }
});
$('roomsGrid').addEventListener('click', async e => {
  const edit=e.target.dataset.editRoom, del=e.target.dataset.deleteRoom;
  if(edit) { const r=roomsCache.find(x=>x._id===edit); if(!r)return; $('roomId').value=r._id; $('roomNumber').value=r.roomNumber; $('roomBlock').value=r.block; $('roomFloor').value=r.floor; $('roomCapacity').value=r.capacity; $('roomFormTitle').textContent='Edit room'; $('roomForm').classList.remove('hidden'); }
  if(del && confirm('Delete this room?')) { try { await api(`/rooms/${del}`,{method:'DELETE'}); notify('Room deleted.'); await loadAll(); } catch(err) { notify(err.message,true); } }
});

function populateAllocationOptions() {
  const activeStudentIds = new Set(allocationsCache.filter(a=>a.status==='active').map(a=>a.student?._id));
  const eligibleStudents = studentsCache.filter(s=>!activeStudentIds.has(s._id));
  $('allocationStudent').innerHTML = '<option value="">Choose student</option>' + eligibleStudents.map(s=>`<option value="${s._id}">${escapeHTML(s.name)} (${escapeHTML(s.rollNumber)})</option>`).join('');
  const availableRooms = roomsCache.filter(r=>r.occupied<r.capacity);
  $('allocationRoom').innerHTML = '<option value="">Choose room</option>' + availableRooms.map(r=>`<option value="${r._id}">Room ${escapeHTML(r.roomNumber)} · ${escapeHTML(r.block)} · ${r.capacity-r.occupied} bed(s) free</option>`).join('');
}
$('showAllocationForm').addEventListener('click', () => { populateAllocationOptions(); $('allocationForm').classList.remove('hidden'); });
$('allocationForm').addEventListener('submit', async e => {
  e.preventDefault(); try { await api('/allocations',{method:'POST',body:JSON.stringify({studentId:$('allocationStudent').value,roomId:$('allocationRoom').value})}); $('allocationForm').classList.add('hidden'); $('allocationForm').reset(); notify('Room allocated successfully.'); await loadAll(); }
  catch(err) { notify(err.message,true); }
});
function renderAllocations() {
  const filter=$('allocationFilter').value;
  const rows=allocationsCache.filter(a=>filter==='all'||a.status===filter);
  $('allocationsTable').innerHTML=rows.length?rows.map(a=>`<tr><td><div class="student-cell"><div class="student-avatar">${escapeHTML(a.student?.name?.charAt(0)||'?')}</div><div><strong>${escapeHTML(a.student?.name||'Deleted student')}</strong><small>${escapeHTML(a.student?.rollNumber||'')}</small></div></div></td><td>Room ${escapeHTML(a.room?.roomNumber||'—')} <small>${escapeHTML(a.room?.block||'')}</small></td><td>${new Date(a.allocatedAt).toLocaleDateString()}</td><td><span class="status ${a.status}">${a.status==='active'?'Active':'Released'}</span></td><td>${a.status==='active'?`<button class="action-btn danger" data-release="${a._id}">Release room</button>`:'—'}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">No allocation records found.</td></tr>';
}
$('allocationFilter').addEventListener('change',renderAllocations);
$('allocationsTable').addEventListener('click',async e=>{const id=e.target.dataset.release;if(id&&confirm('Release this room allocation?')){try{await api(`/allocations/${id}/release`,{method:'PATCH'});notify('Room released successfully.');await loadAll();}catch(err){notify(err.message,true);}}});

if (token && currentUser) showApp(); else showAuth();
