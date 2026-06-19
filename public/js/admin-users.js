let me = null;
let users = [];
let editModal = null;

(async () => {
  me = await requireAuth(['admin']);
  if (!me) return;
  renderNav(me, 'users');
  editModal = new bootstrap.Modal(document.getElementById('editModal'));
  wireCreate();
  load();
})();

async function load() {
  try {
    const { users: list } = await apiFetch('/api/users');
    users = list;
    renderTable();
  } catch (e) {
    document.getElementById('tbody').innerHTML = `<tr><td colspan="6" class="text-danger">${escapeHtml(e.message)}</td></tr>`;
  }
}

const homerooms = () => users.filter((u) => u.role === 'homeroom');
const parents = () => users.filter((u) => u.role === 'parent');

function renderTable() {
  document.getElementById('tbody').innerHTML = users.map((u) => `
    <tr>
      <td>${escapeHtml(u.full_name)}<div class="muted small">${escapeHtml(u.email)}</div></td>
      <td><span class="badge bg-light text-dark border">${roleLabel(u.role)}</span></td>
      <td>${escapeHtml(u.class_room || u.grade_level || '')}</td>
      <td>${escapeHtml(u.advisor_name || '')}</td>
      <td>${escapeHtml(u.parent_name || '')}</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" onclick="openEdit(${u.id})">แก้ไข</button>
        <button class="btn btn-sm btn-outline-danger" onclick="delUser(${u.id})">ลบ</button>
      </td>
    </tr>`).join('');
}

function wireCreate() {
  const form = document.getElementById('createForm');
  const err = document.getElementById('createErr');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.add('d-none');
    const body = {
      full_name: form.full_name.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      role: form.role.value,
      class_room: form.class_room.value.trim(),
      grade_level: form.grade_level.value.trim(),
    };
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) });
      form.reset();
      load();
    } catch (ex) {
      err.textContent = ex.message;
      err.classList.remove('d-none');
    }
  });
}

function optionList(items, selectedId, emptyLabel) {
  const opts = [`<option value="">${emptyLabel}</option>`]
    .concat(items.map((u) => `<option value="${u.id}" ${u.id === selectedId ? 'selected' : ''}>${escapeHtml(u.full_name)}</option>`));
  return opts.join('');
}

function openEdit(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;
  document.getElementById('editErr').classList.add('d-none');
  document.getElementById('eId').value = u.id;
  document.getElementById('eName').value = u.full_name;
  document.getElementById('eRole').value = u.role;
  document.getElementById('eClass').value = u.class_room || '';
  document.getElementById('eGrade').value = u.grade_level || '';
  document.getElementById('eAdvisor').innerHTML = optionList(homerooms(), u.advisor_id, '— ไม่กำหนด —');
  document.getElementById('eParent').innerHTML = optionList(parents(), u.parent_id, '— ไม่กำหนด —');
  editModal.show();
}

async function saveEdit() {
  const id = Number(document.getElementById('eId').value);
  const err = document.getElementById('editErr');
  err.classList.add('d-none');
  const body = {
    full_name: document.getElementById('eName').value.trim(),
    role: document.getElementById('eRole').value,
    class_room: document.getElementById('eClass').value.trim(),
    grade_level: document.getElementById('eGrade').value.trim(),
    advisor_id: document.getElementById('eAdvisor').value || null,
    parent_id: document.getElementById('eParent').value || null,
  };
  try {
    await apiFetch('/api/users/' + id, { method: 'PUT', body: JSON.stringify(body) });
    editModal.hide();
    load();
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove('d-none');
  }
}

async function delUser(id) {
  const u = users.find((x) => x.id === id);
  if (!confirm('ลบผู้ใช้ "' + (u ? u.full_name : '') + '" ?')) return;
  try {
    await apiFetch('/api/users/' + id, { method: 'DELETE' });
    load();
  } catch (e) {
    alert(e.message);
  }
}
