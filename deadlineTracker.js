// Deadlines page for Studious Tracker 2.0
// Data is stored in the browser (localStorage), so it survives a refresh.
(() => {
    'use strict';

    const KEY = 'studiousDeadlines';
    const VIEW_KEY = 'studiousDeadlinesView';
    const STATUSES = ['Not started', 'In progress', 'Done'];
    const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
    // [background, text] pairs. Every course tag also shows the course name, so colour is never the only cue.
    const COLORS = [
        ['#D9ECE8', '#0B4F49'], ['#FCEBC8', '#6B4300'], ['#E9DDF0', '#53306A'],
        ['#DCE8F7', '#1D3F6E'], ['#F7DCDC', '#7A2323'], ['#E4EDD3', '#3F5A14']
    ];

    // ---------- helpers ----------
    const $ = (sel) => document.querySelector(sel);

    function el(tag, props = {}, ...kids) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(props)) {
            if (v === false || v == null) continue;
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
            else if (v === true) node.setAttribute(k, '');
            else node.setAttribute(k, v);
        }
        for (const kid of kids.flat()) {
            if (kid == null) continue;
            node.append(kid.nodeType ? kid : document.createTextNode(kid));
        }
        return node;
    }

    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable: keep working in memory */ }
    }

    const pad = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
    const daysUntil = (s) => Math.round((parseISO(s) - today()) / 86400000);
    // Dates are always written out ("Nov 19, 2026") so day and month can never be confused.
    const fmtDate = (s) => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    // ---------- state ----------
    let items = load(KEY, []);
    let view = load(VIEW_KEY, 'table');
    let editingId = null;
    let dragId = null;
    let toastTimer = null;

    const persist = () => save(KEY, items);

    // ---------- elements ----------
    const form = $('#deadline-form');
    const f = {
        name: $('#dl-name'), course: $('#dl-course'), type: $('#dl-type'), due: $('#dl-due'),
        priority: $('#dl-priority'), status: $('#dl-status'), weight: $('#dl-weight'),
        grade: $('#dl-grade'), notes: $('#dl-notes')
    };
    const submitBtn = $('#submit-button');
    const cancelBtn = $('#cancel-edit');
    const formMessage = $('#form-message');
    const formHint = $('#form-hint');
    const dialog = $('#confirm-dialog');

    // ---------- feedback ----------
    function toast(message) {
        const t = $('#toast');
        t.textContent = message;
        t.classList.add('dl-toast-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('dl-toast-show'), 3500);
    }

    function confirmDialog(title, text, okLabel, onOk) {
        $('#confirm-title').textContent = title;
        $('#confirm-text').textContent = text;
        $('#confirm-ok').textContent = okLabel;
        $('#confirm-ok').onclick = () => { dialog.close(); onOk(); };
        $('#confirm-cancel').onclick = () => dialog.close();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else if (window.confirm(`${title}\n${text}`)) onOk();
    }

    // ---------- course helpers ----------
    // Courses are not managed separately: they come from the deadlines themselves.
    const courseList = () => [...new Set(items.map((i) => i.course))].sort((a, b) => a.localeCompare(b));

    // Reuse the spelling already in the list so "itec 3230" and "ITEC 3230" count as one course.
    function canonicalCourse(name) {
        const clean = name.trim().replace(/\s+/g, ' ');
        return courseList().find((c) => c.toLowerCase() === clean.toLowerCase()) || clean;
    }

    // The same course always gets the same colour (the tag also shows the name, so colour is never the only cue).
    function courseColor(name) {
        let hash = 0;
        for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
        return COLORS[hash % COLORS.length];
    }
    function courseTag(name) {
        const [bg, fg] = courseColor(name);
        return el('span', { class: 'dl-tag', style: `background:${bg};color:${fg}`, text: name });
    }

    // ---------- urgency ----------
    function urgency(item) {
        if (item.status === 'Done') return { label: 'Completed', cls: 'dl-badge-done' };
        const d = daysUntil(item.due);
        if (d < 0) return { label: `Overdue by ${plural(-d, 'day')}`, cls: 'dl-badge-overdue' };
        if (d === 0) return { label: 'Due today', cls: 'dl-badge-soon' };
        if (d === 1) return { label: 'Due tomorrow', cls: 'dl-badge-soon' };
        if (d <= 3) return { label: `Due in ${d} days`, cls: 'dl-badge-soon' };
        if (d <= 7) return { label: 'Due this week', cls: 'dl-badge-week' };
        return null;
    }

    // ---------- form ----------
    function renderCourseOptions() {
        const courses = courseList();
        const filterSel = $('#filter-course');
        const keep = filterSel.value;

        // Suggestions for the course field while typing
        $('#course-suggestions').replaceChildren(...courses.map((c) => el('option', { value: c })));

        // Course filter: only courses that have deadlines
        filterSel.replaceChildren(el('option', { value: '', text: 'All courses' }),
            ...courses.map((c) => el('option', { value: c, text: c })));
        filterSel.value = courses.includes(keep) ? keep : '';
    }

    function updateSubmitState() {
        const missing = [];
        if (!f.name.value.trim()) missing.push('a name');
        if (!f.course.value.trim()) missing.push('a course');
        if (!f.due.value) missing.push('a due date');
        submitBtn.disabled = missing.length > 0;
        formHint.textContent = missing.length ? `Still needed: ${missing.join(', ')}.` : 'Ready to save.';
    }

    function weightTotal(course, ignoreId) {
        return items.filter((i) => i.course === course && i.id !== ignoreId && i.weight != null)
            .reduce((sum, i) => sum + i.weight, 0);
    }

    function validate() {
        const weight = f.weight.value === '' ? null : Number(f.weight.value);
        const grade = f.grade.value === '' ? null : Number(f.grade.value);
        if (weight != null && (isNaN(weight) || weight < 0 || weight > 100)) return 'Weight must be between 0 and 100.';
        if (grade != null && (isNaN(grade) || grade < 0 || grade > 100)) return 'Grade must be between 0 and 100.';
        if (weight != null) {
            const course = canonicalCourse(f.course.value);
            const total = weightTotal(course, editingId) + weight;
            if (total > 100) {
                return `Weights in ${course} would total ${total}%. Lower this weight so the course stays at 100% or less.`;
            }
        }
        return '';
    }

    function resetForm() {
        form.reset();
        editingId = null;
        $('#form-title').textContent = 'Add a New Deadline';
        submitBtn.textContent = 'Add Deadline';
        cancelBtn.hidden = true;
        formMessage.textContent = '';
        updateSubmitState();
    }

    function startEdit(item) {
        editingId = item.id;
        f.name.value = item.title;
        f.course.value = item.course;
        f.type.value = item.type;
        f.due.value = item.due;
        f.priority.value = item.priority;
        f.status.value = item.status;
        f.weight.value = item.weight ?? '';
        f.grade.value = item.grade ?? '';
        f.notes.value = item.notes || '';
        $('#form-title').textContent = 'Edit Deadline';
        submitBtn.textContent = 'Save Changes';
        cancelBtn.hidden = false;
        formMessage.textContent = '';
        updateSubmitState();
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        f.name.focus();
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return;
        const problem = validate();
        formMessage.textContent = problem;
        if (problem) return;

        const data = {
            title: f.name.value.trim(),
            course: canonicalCourse(f.course.value),
            type: f.type.value,
            due: f.due.value,
            priority: f.priority.value,
            status: f.status.value,
            weight: f.weight.value === '' ? null : Number(f.weight.value),
            grade: f.grade.value === '' ? null : Number(f.grade.value),
            notes: f.notes.value.trim()
        };

        if (editingId) {
            items = items.map((i) => (i.id === editingId ? { ...i, ...data } : i));
            toast(`Saved changes to ${data.title}.`);
        } else {
            items.push({ id: uid(), ...data });
            toast(`Added ${data.title} to ${data.course}, due ${fmtDate(data.due)}.`);
        }
        const wasEditing = Boolean(editingId);
        persist();
        resetForm();
        // After adding, keep the same course selected so several deadlines for one course are quick to enter.
        if (!wasEditing) f.course.value = data.course;
        renderAll();
    });

    cancelBtn.addEventListener('click', resetForm);
    form.addEventListener('input', updateSubmitState);
    form.addEventListener('change', updateSubmitState);

    // ---------- item actions ----------
    function setStatus(id, status) {
        const item = items.find((i) => i.id === id);
        if (!item || item.status === status) return;
        item.status = status;
        persist();
        renderAll();
        toast(status === 'Done' ? `Marked done: ${item.title}.` : `${item.title} is now ${status.toLowerCase()}.`);
    }

    function removeItem(item) {
        confirmDialog(`Delete ${item.title}?`, 'This cannot be undone.', 'Delete', () => {
            items = items.filter((i) => i.id !== item.id);
            if (editingId === item.id) resetForm();
            persist(); renderAll();
            toast(`Deleted ${item.title}.`);
        });
    }

    // ---------- filtering and sorting ----------
    function visibleItems() {
        const q = $('#filter-search').value.trim().toLowerCase();
        const course = $('#filter-course').value;
        const status = $('#filter-status').value;
        const sort = $('#sort-by').value;
        const hideDone = $('#hide-done').checked;

        const list = items.filter((i) =>
            (!q || i.title.toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q)) &&
            (!course || i.course === course) &&
            (!status || i.status === status) &&
            (!hideDone || i.status !== 'Done'));

        const byDue = (a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title);
        list.sort((a, b) => {
            if (sort === 'due-desc') return byDue(b, a);
            if (sort === 'course') return a.course.localeCompare(b.course) || byDue(a, b);
            if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byDue(a, b);
            return byDue(a, b);
        });
        return list;
    }

    // ---------- rendering ----------
    function renderSummary() {
        const open = items.filter((i) => i.status !== 'Done');
        const week = open.filter((i) => { const d = daysUntil(i.due); return d >= 0 && d <= 7; }).length;
        const overdue = open.filter((i) => daysUntil(i.due) < 0).length;
        const inProgress = items.filter((i) => i.status === 'In progress').length;
        const pct = items.length ? Math.round((items.filter((i) => i.status === 'Done').length / items.length) * 100) : 0;
        $('#stat-week').textContent = week;
        $('#stat-overdue').textContent = overdue;
        $('#stat-progress').textContent = inProgress;
        $('#stat-done').textContent = `${pct}%`;
        $('#stat-bar').style.width = `${pct}%`;
    }

    function statusSelect(item) {
        return el('select', {
            class: 'dl-status-select', 'aria-label': `Status of ${item.title}`,
            onchange: (e) => setStatus(item.id, e.target.value)
        }, STATUSES.map((s) => el('option', { value: s, text: s, selected: s === item.status })));
    }

    function weightGrade(item) {
        const w = item.weight != null ? `${item.weight}%` : '–';
        const g = item.grade != null ? `${item.grade}%` : '–';
        return `${w} · ${g}`;
    }

    function dueCell(item) {
        const u = urgency(item);
        return el('div', { class: 'dl-due' },
            el('span', { text: fmtDate(item.due) }),
            u ? el('span', { class: `dl-badge ${u.cls}`, text: u.label }) : null);
    }

    function actionButtons(item) {
        return el('div', { class: 'dl-actions' },
            el('button', { type: 'button', class: 'dl-link-button', text: 'Edit', 'aria-label': `Edit ${item.title}`, onclick: () => startEdit(item) }),
            el('button', { type: 'button', class: 'dl-link-button dl-link-danger', text: 'Delete', 'aria-label': `Delete ${item.title}`, onclick: () => removeItem(item) }));
    }

    function renderTable(list) {
        const body = $('#table-body');
        body.replaceChildren();
        list.forEach((item) => {
            const done = item.status === 'Done';
            body.append(el('tr', { class: done ? 'dl-row-done' : '' },
                el('td', {}, el('input', {
                    type: 'checkbox', checked: done, 'aria-label': `Mark ${item.title} as done`,
                    onchange: (e) => setStatus(item.id, e.target.checked ? 'Done' : 'Not started')
                })),
                el('td', {},
                    el('span', { class: 'dl-title', text: item.title }),
                    item.notes ? el('span', { class: 'dl-notes', text: item.notes }) : null),
                el('td', {}, courseTag(item.course)),
                el('td', { text: item.type }),
                el('td', {}, dueCell(item)),
                el('td', {}, el('span', { class: `dl-priority dl-priority-${item.priority.toLowerCase()}`, text: item.priority })),
                el('td', {}, statusSelect(item)),
                el('td', { text: weightGrade(item) }),
                el('td', {}, actionButtons(item))));
        });
    }

    function renderBoard(list) {
        const board = $('#board-view');
        board.replaceChildren();
        STATUSES.forEach((status) => {
            const cards = list.filter((i) => i.status === status);
            const column = el('section', {
                class: 'dl-column', 'aria-label': status,
                ondragover: (e) => { e.preventDefault(); column.classList.add('dl-column-over'); },
                ondragleave: () => column.classList.remove('dl-column-over'),
                ondrop: (e) => {
                    e.preventDefault();
                    column.classList.remove('dl-column-over');
                    if (dragId) setStatus(dragId, status);
                    dragId = null;
                }
            }, el('h4', {}, status, el('span', { class: 'dl-count', text: String(cards.length) })));

            cards.forEach((item) => {
                column.append(el('article', {
                    class: 'dl-card', draggable: 'true',
                    ondragstart: () => { dragId = item.id; },
                    ondragend: () => { dragId = null; }
                },
                    el('div', { class: 'dl-card-top' }, courseTag(item.course),
                        el('span', { class: `dl-priority dl-priority-${item.priority.toLowerCase()}`, text: item.priority })),
                    el('p', { class: 'dl-title', text: item.title }),
                    el('p', { class: 'dl-notes', text: `${item.type} · ${weightGrade(item)}` }),
                    dueCell(item),
                    statusSelect(item),
                    actionButtons(item)));
            });
            if (!cards.length) column.append(el('p', { class: 'dl-column-empty', text: 'Nothing here. Drag a card in.' }));
            board.append(column);
        });
    }

    function renderEmpty(list) {
        const box = $('#empty-state');
        box.replaceChildren();
        if (items.length === 0) {
            box.hidden = false;
            box.append('No deadlines yet. Add your first one above. ',
                el('button', { type: 'button', class: 'dl-link-button', text: 'Load sample data', onclick: loadSample }));
        } else if (list.length === 0) {
            box.hidden = false;
            box.append('No deadlines match your filters. ',
                el('button', { type: 'button', class: 'dl-link-button', text: 'Clear filters', onclick: clearFilters }));
        } else {
            box.hidden = true;
        }
    }

    function renderView() {
        $('#table-view').hidden = view !== 'table';
        $('#board-view').hidden = view !== 'board';
        $('#view-table').setAttribute('aria-pressed', String(view === 'table'));
        $('#view-board').setAttribute('aria-pressed', String(view === 'board'));
    }

    function renderAll() {
        renderCourseOptions();
        renderSummary();
        const list = visibleItems();
        renderTable(list);
        renderBoard(list);
        renderEmpty(list);
        renderView();
        updateSubmitState();
    }

    function clearFilters() {
        $('#filter-search').value = '';
        $('#filter-course').value = '';
        $('#filter-status').value = '';
        $('#hide-done').checked = false;
        renderAll();
    }

    function loadSample() {
        const day = (offset) => { const d = today(); d.setDate(d.getDate() + offset); return toISO(d); };
        items.push(
            { id: uid(), title: 'Interface Walkthrough', course: 'ITEC 3230', type: 'Project', due: day(-3), priority: 'High', status: 'Done', weight: 8, grade: 86, notes: 'Group presentation' },
            { id: uid(), title: 'Usability Test Report', course: 'ITEC 3230', type: 'Assignment', due: day(2), priority: 'High', status: 'In progress', weight: 10, grade: null, notes: 'Submit on the course dropbox' },
            { id: uid(), title: 'Problem Set 6', course: 'MATH 1025', type: 'Assignment', due: day(5), priority: 'Medium', status: 'Not started', weight: 5, grade: null, notes: '' },
            { id: uid(), title: 'Chapter 9 Reading', course: 'PSYC 1010', type: 'Reading', due: day(0), priority: 'Low', status: 'Not started', weight: null, grade: null, notes: '' },
            { id: uid(), title: 'Final Exam', course: 'ITEC 3230', type: 'Exam', due: day(21), priority: 'High', status: 'Not started', weight: 30, grade: null, notes: '' },
            { id: uid(), title: 'Quiz 4', course: 'MATH 1025', type: 'Quiz', due: day(-1), priority: 'Medium', status: 'Not started', weight: 5, grade: null, notes: '' }
        );
        persist(); renderAll();
        toast('Loaded sample deadlines.');
    }

    // ---------- events ----------
    ['#filter-search', '#filter-course', '#filter-status', '#sort-by', '#hide-done'].forEach((sel) => {
        $(sel).addEventListener('input', renderAll);
        $(sel).addEventListener('change', renderAll);
    });
    $('#view-table').addEventListener('click', () => { view = 'table'; save(VIEW_KEY, view); renderView(); });
    $('#view-board').addEventListener('click', () => { view = 'board'; save(VIEW_KEY, view); renderView(); });

    renderAll();
})();
