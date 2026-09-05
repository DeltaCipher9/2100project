/* =========================================================
   UniFlow — shared app engine
   Data lives in localStorage so it persists between pages
   (this is a front-end prototype: no server, no real AI yet —
   see comments marked REPLACE-LATER for where a backend/AI
   service would eventually plug in)
   ========================================================= */

const UF = {
  KEYS:{courses:'uf_courses', tasks:'uf_tasks', projects:'uf_projects', seeded:'uf_seeded'},

  /* ---------- date helpers ---------- */
  todayISO(){ return new Date().toISOString().slice(0,10); },
  addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); },
  daysUntil(iso){
    const d1=new Date(new Date().toDateString());
    const d2=new Date(iso);
    return Math.round((d2-d1)/86400000);
  },
  fmt(iso){
    const d=new Date(iso);
    return d.toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'});
  },

  /* ---------- storage ---------- */
  load(key){ try{ return JSON.parse(localStorage.getItem(key)) || null; }catch(e){ return null; } },
  save(key,val){ localStorage.setItem(key, JSON.stringify(val)); },

  getCourses(){ return this.load(this.KEYS.courses) || []; },
  setCourses(c){ this.save(this.KEYS.courses, c); },
  getTasks(){ return this.load(this.KEYS.tasks) || []; },
  setTasks(t){ this.save(this.KEYS.tasks, t); },
  getProjects(){ return this.load(this.KEYS.projects) || []; },
  setProjects(p){ this.save(this.KEYS.projects, p); },

  uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },

  /* ---------- seed sample data on first run ---------- */
  seed(){
    if(this.load(this.KEYS.seeded)) return;
    this.setCourses([
      {code:'CSE 2102', name:'Discrete Mathematics Sessional', professor:'Dr. Rahman', room:'CSE-304', credits:1.5, progress:70},
      {code:'CSE 2103', name:'Digital Logic Design', professor:'Dr. Islam', room:'CSE-201', credits:3, progress:45},
      {code:'EEE 2151', name:'Electrical Machines I', professor:'Dr. Karim', room:'EEE-102', credits:3, progress:30},
      {code:'CSE 2101', name:'Discrete Mathematics', professor:'Dr. Rahman', room:'CSE-304', credits:3, progress:85},
    ]);
    this.setTasks([
      {id:this.uid(), name:'Submit Discrete Math Sessional lab report', course:'CSE 2102', due:this.addDays(1), priority:'high', done:false, completedAt:null},
      {id:this.uid(), name:'Prepare for Electrical Machines CT-1', course:'EEE 2151', due:this.addDays(3), priority:'high', done:false, completedAt:null},
      {id:this.uid(), name:'Finish Digital Logic Design assignment 2', course:'CSE 2103', due:this.addDays(4), priority:'mid', done:false, completedAt:null},
      {id:this.uid(), name:'Digital Logic lab — flip-flop circuit', course:'CSE 2103', due:this.addDays(5), priority:'mid', done:false, completedAt:null},
      {id:this.uid(), name:'Read Ch.4: modular arithmetic before class', course:'CSE 2101', due:this.addDays(6), priority:'low', done:false, completedAt:null},
      {id:this.uid(), name:'Submit Physics lab viva prep', course:'CSE 2101', due:this.addDays(-2), priority:'high', done:true, completedAt:this.addDays(-2)},
      {id:this.uid(), name:'OOP assignment 1', course:'CSE 2102', due:this.addDays(-5), priority:'mid', done:true, completedAt:this.addDays(-4)},
      {id:this.uid(), name:'Coordinate Geometry problem set', course:'CSE 2101', due:this.addDays(-6), priority:'low', done:true, completedAt:this.addDays(-6)},
    ]);
    this.setProjects([
      {id:this.uid(), name:'SafeRoute BD — IEEE WIE poster',
        columns:{
          todo:[{id:this.uid(), text:'Draft poster layout', who:'Arshi'}, {id:this.uid(), text:'Collect sustainability references', who:'Nabila'}],
          inprogress:[{id:this.uid(), text:'Write problem statement section', who:'Arshi'}],
          done:[{id:this.uid(), text:'Finalize project title', who:'Team'}]
        }}
    ]);
    this.save(this.KEYS.seeded, true);
  },

  /* ---------- priority / badge helpers ---------- */
  badgeFor(due){
    const d = this.daysUntil(due);
    if(d<=2) return {cls:'high', label: d<0 ? 'Overdue' : 'Due soon'};
    if(d<=5) return {cls:'mid', label:'This week'};
    return {cls:'low', label:'Flexible'};
  },

  /* ---------- sidebar ---------- */
  NAV:[
    {href:'index.html', label:'Dashboard'},
    {href:'scanner.html', label:'Notice & PDF AI'},
    {href:'calendar.html', label:'Smart Calendar'},
    {href:'courses.html', label:'Course Hub'},
    {href:'tasks.html', label:'Assignments & Tests'},
    {href:'projects.html', label:'Group Projects'},
    {href:'analytics.html', label:'Study Analytics'},
  ],
  injectSidebar(){
    const mount = document.getElementById('sidebar-mount');
    if(!mount) return;
    let active = location.pathname.split('/').pop();
    if(!active) active = 'index.html';
    const links = this.NAV.map(n=>
      `<a href="${n.href}" class="${n.href===active?'active':''}">${n.label}</a>`
    ).join('');
    mount.innerHTML = `
      <aside class="side">
        <div class="brand">Uni<span>Flow</span></div>
        <nav>${links}</nav>
        <div class="side-foot">Signed in as<br><strong style="color:#fff;">Arshi · CSE, RUET</strong></div>
      </aside>`;
  },

  init(){
    this.seed();
    this.injectSidebar();
  }
};

document.addEventListener('DOMContentLoaded', ()=>{
  UF.init();
  const page = document.body.dataset.page;
  if(page==='dashboard') renderDashboard();
  if(page==='scanner') renderScanner();
  if(page==='calendar') renderCalendar();
  if(page==='courses') renderCourses();
  if(page==='tasks') renderTasks();
  if(page==='projects') renderProjects();
  if(page==='analytics') renderAnalytics();
});

/* =========================================================
   DASHBOARD — AI daily/weekly action plan
   ========================================================= */
function renderDashboard(){
  const tasks = UF.getTasks();
  const courses = UF.getCourses();
  const upcoming = tasks.filter(t=>!t.done && UF.daysUntil(t.due) <= 7)
                         .sort((a,b)=> new Date(a.due)-new Date(b.due));

  document.getElementById('hero-line').textContent =
    upcoming.length ? summarizePlan(upcoming) : 'Nothing urgent — you\'re clear for the week.';

  document.getElementById('stat-due').textContent = upcoming.length;
  document.getElementById('stat-courses').textContent = courses.length;
  const projects = UF.getProjects();
  const pending = projects.reduce((n,p)=> n + p.columns.todo.length + p.columns.inprogress.length, 0);
  document.getElementById('stat-group').textContent = pending;

  const list = document.getElementById('tasklist');
  list.innerHTML = upcoming.length ? '' : '<p class="empty-note">No tasks due in the next 7 days.</p>';
  upcoming.forEach(t=>{
    const b = UF.badgeFor(t.due);
    const row = document.createElement('div');
    row.className = 'task';
    row.innerHTML = `
      <input type="checkbox" ${t.done?'checked':''}>
      <div style="flex:1;">
        <div class="t-name">${escapeHtml(t.name)}</div>
        <div class="t-course">${escapeHtml(t.course)} · ${UF.fmt(t.due)}</div>
      </div>
      <span class="badge ${b.cls}">${b.label}</span>`;
    row.querySelector('input').addEventListener('change', (e)=>{
      toggleTaskDone(t.id, e.target.checked);
      renderDashboard();
    });
    list.appendChild(row);
  });

  const grid = document.getElementById('mini-courses');
  grid.innerHTML = '';
  courses.slice(0,3).forEach(c=>{
    const next = tasks.filter(t=>!t.done && t.course===c.code).sort((a,b)=>new Date(a.due)-new Date(b.due))[0];
    grid.innerHTML += `
      <div class="course">
        <div class="code">${escapeHtml(c.code)}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <div class="next">${next ? 'Next: '+escapeHtml(next.name)+' — '+UF.fmt(next.due) : 'Nothing pending'}</div>
        <div class="bar"><div style="width:${c.progress}%;"></div></div>
      </div>`;
  });
}

function summarizePlan(upcoming){
  const byType = {assignment:0, lab:0, test:0, other:0};
  upcoming.forEach(t=>{
    const n = t.name.toLowerCase();
    if(n.includes('ct')||n.includes('test')||n.includes('exam')) byType.test++;
    else if(n.includes('lab')) byType.lab++;
    else if(n.includes('assignment')||n.includes('report')||n.includes('submit')) byType.assignment++;
    else byType.other++;
  });
  const parts=[];
  if(byType.assignment) parts.push(byType.assignment+' assignment'+(byType.assignment>1?'s':''));
  if(byType.lab) parts.push(byType.lab+' lab'+(byType.lab>1?'s':''));
  if(byType.test) parts.push(byType.test+' test'+(byType.test>1?'s':'')+' to prepare for');
  if(byType.other) parts.push(byType.other+' other item'+(byType.other>1?'s':''));
  return (parts.join(', ')+' this week.').replace(/^./,c=>c.toUpperCase());
}

function toggleTaskDone(id, done){
  const tasks = UF.getTasks();
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  t.done = done;
  t.completedAt = done ? UF.todayISO() : null;
  UF.setTasks(tasks);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* =========================================================
   SCANNER — notice / PDF text "AI" date extraction
   REPLACE-LATER: swap parseNoticeText() for a real OCR + NLP
   service call once you have a backend.
   ========================================================= */
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function parseNoticeText(text){
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
  const found = [];
  const monthRe = new RegExp('\\b('+MONTHS.join('|')+')\\b\\s+(\\d{1,2})', 'i');
  const numRe = /\b(\d{1,2})[\/\-](\d{1,2})\b/;
  lines.forEach(line=>{
    let due = null;
    const m1 = line.match(monthRe);
    const m2 = line.match(numRe);
    const year = new Date().getFullYear();
    if(m1){
      const monthIdx = MONTHS.indexOf(m1[1].toLowerCase());
      const day = parseInt(m1[2],10);
      const d = new Date(year, monthIdx, day);
      due = d.toISOString().slice(0,10);
    } else if(m2){
      const day = parseInt(m2[1],10), month = parseInt(m2[2],10)-1;
      const d = new Date(year, month, day);
      due = d.toISOString().slice(0,10);
    }
    const keyword = /(due|deadline|submit|ct[\s-]?\d|exam|test|assignment|lab|quiz|viva|class\s*(moved|resched))/i.test(line);
    if(due || keyword){
      found.push({ text: line, due: due || UF.addDays(7) });
    }
  });
  return found;
}

function renderScanner(){
  document.getElementById('sample-btn').addEventListener('click', ()=>{
    const samples = [
      {text:'CT-1, Electrical Machines I — Tuesday, 9 September, 9:00 AM', due:UF.addDays(3)},
      {text:'Lab report deadline, Discrete Math Sessional — Saturday, 11:59 PM', due:UF.addDays(1)},
      {text:'Class rescheduled: Digital Logic Design moved to Room 405', due:UF.addDays(0)},
    ];
    showExtracted(samples, 'General');
  });

  document.getElementById('extract-btn').addEventListener('click', ()=>{
    const text = document.getElementById('notice-input').value;
    if(!text.trim()) return;
    const results = parseNoticeText(text);
    if(!results.length){
      document.getElementById('extracted').innerHTML = '<p class="empty-note">No dates or task-like lines found — try pasting a notice with a date or a word like "deadline" / "CT" / "exam".</p>';
      return;
    }
    showExtracted(results.map(r=>({text:r.text, due:r.due})), 'General');
  });
}

function showExtracted(items, course){
  const box = document.getElementById('extracted');
  box.innerHTML = '';
  const tasks = UF.getTasks();
  items.forEach((item,i)=>{
    setTimeout(()=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<span class="tag">EXTRACTED</span> ${escapeHtml(item.text)} <span style="margin-left:auto;color:#6B7291;font-size:12px;">${UF.fmt(item.due)}</span>`;
      box.appendChild(row);
    }, i*400);
    tasks.push({id:UF.uid(), name:item.text.slice(0,90), course, due:item.due, priority: UF.badgeFor(item.due).cls, done:false, completedAt:null});
  });
  UF.setTasks(tasks);
}

/* =========================================================
   CALENDAR
   ========================================================= */
let calState = { year: new Date().getFullYear(), month: new Date().getMonth(), selected: UF.todayISO() };

function renderCalendar(){
  document.getElementById('cal-prev').addEventListener('click', ()=>{ shiftMonth(-1); });
  document.getElementById('cal-next').addEventListener('click', ()=>{ shiftMonth(1); });
  drawCalendar();
}
function shiftMonth(n){
  calState.month += n;
  if(calState.month<0){ calState.month=11; calState.year--; }
  if(calState.month>11){ calState.month=0; calState.year++; }
  drawCalendar();
}
function drawCalendar(){
  const {year, month} = calState;
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const label = first.toLocaleDateString('en-US',{month:'long', year:'numeric'});
  document.getElementById('cal-label').textContent = label;

  const tasks = UF.getTasks();
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    grid.innerHTML += `<div class="cal-dow">${d}</div>`;
  });
  for(let i=0;i<startDow;i++) grid.innerHTML += '<div class="cal-cell empty"></div>';

  for(let day=1; day<=daysInMonth; day++){
    const iso = new Date(year, month, day).toISOString().slice(0,10);
    const dayTasks = tasks.filter(t=>t.due===iso);
    const isToday = iso===UF.todayISO();
    const isSelected = iso===calState.selected;
    const cell = document.createElement('div');
    cell.className = 'cal-cell'+(isToday?' today':'')+(isSelected?' selected':'');
    cell.innerHTML = `<div class="dnum">${day}</div>` + (dayTasks.length ? dayTasks.slice(0,3).map(()=>'<span class="dot"></span>').join('') : '');
    cell.addEventListener('click', ()=>{ calState.selected = iso; drawCalendar(); });
    grid.appendChild(cell);
  }

  const dayTasks = tasks.filter(t=>t.due===calState.selected);
  const dayBox = document.getElementById('day-tasks');
  document.getElementById('day-tasks-title').textContent = UF.fmt(calState.selected);
  dayBox.innerHTML = dayTasks.length ? '' : '<p class="empty-note">Nothing scheduled this day.</p>';
  dayTasks.forEach(t=>{
    const b = UF.badgeFor(t.due);
    dayBox.innerHTML += `
      <div class="task ${t.done?'done':''}">
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleTaskDone('${t.id}', this.checked); drawCalendar();">
        <div style="flex:1;"><div class="t-name">${escapeHtml(t.name)}</div><div class="t-course">${escapeHtml(t.course)}</div></div>
        <span class="badge ${b.cls}">${b.label}</span>
      </div>`;
  });
}

/* =========================================================
   COURSES
   ========================================================= */
function renderCourses(){
  drawCourses();
  document.getElementById('course-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const courses = UF.getCourses();
    courses.push({
      code: document.getElementById('c-code').value.trim(),
      name: document.getElementById('c-name').value.trim(),
      professor: document.getElementById('c-prof').value.trim(),
      room: document.getElementById('c-room').value.trim(),
      credits: parseFloat(document.getElementById('c-credits').value) || 0,
      progress: 0
    });
    UF.setCourses(courses);
    e.target.reset();
    drawCourses();
  });
}
function drawCourses(){
  const courses = UF.getCourses();
  const grid = document.getElementById('courses-grid');
  grid.innerHTML = '';
  courses.forEach((c,idx)=>{
    grid.innerHTML += `
      <div class="course">
        <button class="icon-btn" style="position:absolute;top:12px;right:12px;" onclick="deleteCourse(${idx})">✕</button>
        <div class="code">${escapeHtml(c.code)}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <div class="meta">${escapeHtml(c.professor||'—')} · Room ${escapeHtml(c.room||'—')} · ${c.credits} credits</div>
        <div class="bar"><div style="width:${c.progress}%;"></div></div>
      </div>`;
  });
}
function deleteCourse(idx){
  const courses = UF.getCourses();
  courses.splice(idx,1);
  UF.setCourses(courses);
  drawCourses();
}

/* =========================================================
   TASKS
   ========================================================= */
function renderTasks(){
  populateCourseSelect('t-course');
  populateCourseSelect('filter-course', true);
  drawTasks();
  document.getElementById('task-form').addEventListener('submit', (e)=>{
    e.preventDefault();
    const tasks = UF.getTasks();
    tasks.push({
      id: UF.uid(),
      name: document.getElementById('t-name').value.trim(),
      course: document.getElementById('t-course').value,
      due: document.getElementById('t-due').value || UF.todayISO(),
      priority: document.getElementById('t-priority').value,
      done:false, completedAt:null
    });
    UF.setTasks(tasks);
    e.target.reset();
    drawTasks();
  });
  document.getElementById('filter-course').addEventListener('change', drawTasks);
  document.getElementById('filter-status').addEventListener('change', drawTasks);
}
function populateCourseSelect(id, withAll){
  const sel = document.getElementById(id);
  const courses = UF.getCourses();
  sel.innerHTML = (withAll ? '<option value="">All courses</option>' : '') +
    courses.map(c=>`<option value="${escapeHtml(c.code)}">${escapeHtml(c.code)}</option>`).join('');
}
function drawTasks(){
  let tasks = UF.getTasks().sort((a,b)=> new Date(a.due)-new Date(b.due));
  const fc = document.getElementById('filter-course').value;
  const fs = document.getElementById('filter-status').value;
  if(fc) tasks = tasks.filter(t=>t.course===fc);
  if(fs==='pending') tasks = tasks.filter(t=>!t.done);
  if(fs==='done') tasks = tasks.filter(t=>t.done);

  const tbody = document.getElementById('tasks-body');
  tbody.innerHTML = tasks.length ? '' : '<tr><td colspan="5" class="empty-note">No tasks match this filter.</td></tr>';
  tasks.forEach(t=>{
    const b = UF.badgeFor(t.due);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" ${t.done?'checked':''}> ${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.course)}</td>
      <td>${UF.fmt(t.due)}</td>
      <td><span class="badge ${t.done?'low':b.cls}">${t.done?'Done':b.label}</span></td>
      <td><button class="icon-btn" title="Delete">✕</button></td>`;
    tr.querySelector('input').addEventListener('change', e=>{ toggleTaskDone(t.id, e.target.checked); drawTasks(); });
    tr.querySelector('.icon-btn').addEventListener('click', ()=>{ deleteTask(t.id); });
    tbody.appendChild(tr);
  });
}
function deleteTask(id){
  UF.setTasks(UF.getTasks().filter(t=>t.id!==id));
  drawTasks();
}

/* =========================================================
   PROJECTS — kanban
   ========================================================= */
function renderProjects(){
  drawProjects();
}
function drawProjects(){
  const projects = UF.getProjects();
  const mount = document.getElementById('projects-mount');
  mount.innerHTML = '';
  const cols = ['todo','inprogress','done'];
  const labels = {todo:'To do', inprogress:'In progress', done:'Done'};
  const next = {todo:'inprogress', inprogress:'done', done:null};

  projects.forEach((p, pIdx)=>{
    const section = document.createElement('section');
    section.innerHTML = `<div class="sec-head"><h2>${escapeHtml(p.name)}</h2></div>`;
    const kanban = document.createElement('div');
    kanban.className = 'kanban';
    cols.forEach(col=>{
      const kcol = document.createElement('div');
      kcol.className = 'kcol';
      let cards = p.columns[col].map(card=>`
        <div class="kcard">
          ${escapeHtml(card.text)}
          <div class="who"><span>${escapeHtml(card.who||'Unassigned')}</span>
            <span>
              ${next[col] ? `<button class="move" data-project="${pIdx}" data-col="${col}" data-card="${card.id}">Move →</button>` : ''}
            </span>
          </div>
        </div>`).join('');
      kcol.innerHTML = `<h4>${labels[col]} <span>${p.columns[col].length}</span></h4>${cards}
        <button class="add-card-btn" data-project="${pIdx}" data-col="${col}">+ Add card</button>`;
      kanban.appendChild(kcol);
    });
    section.appendChild(kanban);
    mount.appendChild(section);
  });

  mount.querySelectorAll('.add-card-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const text = prompt('Task description:');
      if(!text) return;
      const who = prompt('Assigned to:', 'Arshi') || 'Unassigned';
      const projects = UF.getProjects();
      projects[btn.dataset.project].columns[btn.dataset.col].push({id:UF.uid(), text, who});
      UF.setProjects(projects);
      drawProjects();
    });
  });
  mount.querySelectorAll('.move').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const projects = UF.getProjects();
      const p = projects[btn.dataset.project];
      const col = btn.dataset.col;
      const n = {todo:'inprogress', inprogress:'done'}[col];
      const idx = p.columns[col].findIndex(c=>c.id===btn.dataset.card);
      const [card] = p.columns[col].splice(idx,1);
      p.columns[n].push(card);
      UF.setProjects(projects);
      drawProjects();
    });
  });
}

/* =========================================================
   ANALYTICS
   ========================================================= */
function renderAnalytics(){
  const tasks = UF.getTasks();
  const courses = UF.getCourses();

  const total = tasks.length || 1;
  const done = tasks.filter(t=>t.done).length;
  const overdueHigh = tasks.filter(t=>!t.done && UF.daysUntil(t.due)<=1).length;
  const stress = Math.min(100, Math.round((overdueHigh*22) + ((total-done)/total)*40));
  const meter = document.getElementById('stress-meter');
  meter.style.width = stress+'%';
  meter.style.background = stress>65 ? 'var(--red)' : stress>35 ? 'var(--amber)' : 'var(--green)';
  document.getElementById('stress-label').textContent =
    stress>65 ? 'High — several urgent items stacked up' :
    stress>35 ? 'Moderate — manageable if you keep pace' :
    'Low — you\'re on top of things';
  document.getElementById('stress-pct').textContent = stress+'%';

  document.getElementById('velocity-label').textContent = `${done} of ${tasks.length} tasks completed overall`;
  const chart = document.getElementById('bar-chart');
  chart.innerHTML = '';
  const dayCounts = [0,0,0,0,0,0,0];
  const dayLabels = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    dayLabels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
  }
  tasks.forEach(t=>{
    if(!t.completedAt) return;
    const diff = Math.round((new Date(new Date().toDateString()) - new Date(t.completedAt))/86400000);
    if(diff>=0 && diff<7) dayCounts[6-diff]++;
  });
  const max = Math.max(1, ...dayCounts);
  dayCounts.forEach((c,i)=>{
    chart.innerHTML += `<div class="col"><div class="fill" style="height:${(c/max*100)||3}%;"></div><div class="lab">${dayLabels[i]}</div></div>`;
  });

  const cp = document.getElementById('course-progress');
  cp.innerHTML = '';
  courses.forEach(c=>{
    cp.innerHTML += `
      <div class="course-progress-row">
        <div class="lbl">${escapeHtml(c.code)}</div>
        <div class="bar"><div style="width:${c.progress}%;"></div></div>
        <div style="width:32px;text-align:right;color:#6B7291;">${c.progress}%</div>
      </div>`;
  });
}