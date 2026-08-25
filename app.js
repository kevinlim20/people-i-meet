const STORAGE_KEY = 'people-i-meet-v1';
const fields = [
  ['name', 'Name'], ['phone', 'Phone'], ['whereMet', 'Where we met'], ['dateMet', 'Date we met'],
  ['whereStay', 'Where they stay'], ['whatDo', 'What they do'], ['interests', 'Interests'], ['notes', 'Notes']
];
const inputIds = { name:'name', phone:'phone', whereMet:'where-met', dateMet:'date-met', whereStay:'where-stay', whatDo:'what-do', interests:'interests', notes:'notes' };
let selectedId = null;

function getPeople() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function savePeople(people) { localStorage.setItem(STORAGE_KEY, JSON.stringify(people)); }
function escapeHtml(value = '') { const el = document.createElement('div'); el.textContent = value; return el.innerHTML; }
function formatDate(date) { if (!date) return '—'; const [year, month, day] = date.split('-').map(Number); return new Intl.DateTimeFormat(undefined, { day:'numeric', month:'short', year:'numeric' }).format(new Date(year, month - 1, day)); }
function value(person, key) { return person[key] || '—'; }

function showPage(route) {
  const add = route === 'add';
  document.querySelector('#people-page').hidden = add;
  document.querySelector('#add-page').hidden = !add;
  document.querySelectorAll('[data-route]').forEach(link => link.classList.toggle('active', link.dataset.route === route));
  if (add) document.querySelector('#name').focus();
}
function renderPeople() {
  const query = document.querySelector('#search-input').value.trim().toLowerCase();
  const people = getPeople().sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const matches = people.filter(person => fields.some(([key]) => String(person[key] || '').toLowerCase().includes(query)));
  document.querySelector('#people-count').textContent = `${people.length} ${people.length === 1 ? 'person' : 'people'}`;
  const list = document.querySelector('#people-list');
  if (!matches.length) {
    const hasPeople = people.length > 0;
    list.innerHTML = `<div class="empty"><div><strong>${hasPeople ? 'No matching people' : 'No people saved yet'}</strong><p>${hasPeople ? 'Try another word or clear your search.' : 'Add the first person you meet.'}</p>${hasPeople ? '' : '<button class="button primary" type="button" id="empty-add">Add person</button>'}</div></div>`;
    document.querySelector('#empty-add')?.addEventListener('click', newPerson);
    return;
  }
  const header = fields.map(([,label]) => `<th>${label}</th>`).join('');
  const rows = matches.map(person => `<tr data-id="${person.id}" tabindex="0" aria-label="Open ${escapeHtml(person.name)}"><td class="name-cell" data-label="Name">${escapeHtml(value(person,'name'))}</td>${fields.slice(1).map(([key,label]) => `<td data-label="${label}">${escapeHtml(key === 'dateMet' ? formatDate(person[key]) : value(person,key))}</td>`).join('')}</tr>`).join('');
  list.innerHTML = `<div class="table-wrap"><table class="people-table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
  list.querySelectorAll('tr[data-id]').forEach(row => { row.addEventListener('click', () => openDetails(row.dataset.id)); row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetails(row.dataset.id); } }); });
}
function clearForm() { document.querySelector('#person-form').reset(); document.querySelector('#person-id').value = ''; document.querySelector('#form-heading').textContent = 'Add person'; document.querySelector('.save-button').textContent = 'Save person'; document.querySelector('#cancel-edit').hidden = true; }
function newPerson() { clearForm(); location.hash = 'add'; }
function editPerson(id) { const person = getPeople().find(p => p.id === id); if (!person) return; fields.forEach(([key]) => document.querySelector(`#${inputIds[key]}`).value = person[key] || ''); document.querySelector('#person-id').value = id; document.querySelector('#form-heading').textContent = 'Edit person'; document.querySelector('.save-button').textContent = 'Save changes'; document.querySelector('#cancel-edit').hidden = false; location.hash = 'add'; }
function openDetails(id) { const person = getPeople().find(p => p.id === id); if (!person) return; selectedId = id; document.querySelector('#dialog-name').textContent = person.name; document.querySelector('#person-details').innerHTML = fields.slice(1).filter(([key]) => person[key]).map(([key,label]) => `<dt>${label}</dt><dd>${escapeHtml(key === 'dateMet' ? formatDate(person[key]) : person[key])}</dd>`).join('') || '<dd>No extra details saved.</dd>'; document.querySelector('#person-dialog').showModal(); }
function deletePerson(id) { const person = getPeople().find(p => p.id === id); if (person && confirm(`Delete ${person.name}? This cannot be undone.`)) { savePeople(getPeople().filter(p => p.id !== id)); document.querySelector('#person-dialog').close(); renderPeople(); } }

document.querySelector('#person-form').addEventListener('submit', event => { event.preventDefault(); const id = document.querySelector('#person-id').value; const people = getPeople(); const existing = people.find(p => p.id === id); const person = existing || { id: crypto.randomUUID(), createdAt: new Date().toISOString() }; fields.forEach(([key]) => person[key] = document.querySelector(`#${inputIds[key]}`).value.trim()); person.updatedAt = new Date().toISOString(); if (existing) Object.assign(existing, person); else people.push(person); savePeople(people); clearForm(); location.hash = 'people'; renderPeople(); });
document.querySelector('#add-person-button').addEventListener('click', newPerson);
document.querySelector('#cancel-edit').addEventListener('click', () => { clearForm(); location.hash = 'people'; });
document.querySelector('#search-input').addEventListener('input', renderPeople);
document.querySelector('#close-dialog').addEventListener('click', () => document.querySelector('#person-dialog').close());
document.querySelector('#dialog-edit').addEventListener('click', () => { document.querySelector('#person-dialog').close(); editPerson(selectedId); });
document.querySelector('#dialog-delete').addEventListener('click', () => deletePerson(selectedId));
document.querySelector('#export-backup').addEventListener('click', () => {
  const backup = new Blob([JSON.stringify({ app:'People I Meet', exportedAt:new Date().toISOString(), people:getPeople() }, null, 2)], { type:'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(backup); link.download = `people-i-meet-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
});
document.querySelector('#import-backup').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (!Array.isArray(backup.people) || !backup.people.every(person => person && typeof person.name === 'string')) throw new Error('Invalid backup');
    if (confirm(`Restore ${backup.people.length} people from this backup? It will replace the people currently saved here.`)) { savePeople(backup.people); document.querySelector('#search-input').value = ''; renderPeople(); }
  } catch { alert('That file is not a valid People I Meet backup.'); }
  event.target.value = '';
});
window.addEventListener('hashchange', () => showPage(location.hash === '#add' ? 'add' : 'people'));
showPage(location.hash === '#add' ? 'add' : 'people'); renderPeople();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}
