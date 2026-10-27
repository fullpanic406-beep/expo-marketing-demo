// 데이터 저장소 — PM만 고친다
// 화면은 이 API만 부른다. SERVER_URL이 비어 있으면 브라우저 저장(데모), 있으면 Apps Script 서버.
const API = (() => {
  const KEY = 'svc-skeleton-v2';
  const AUTH_KEY = 'svc-skeleton-auth';
  const server = () => APP_CONFIG.SERVER_URL;
  const clone = o => JSON.parse(JSON.stringify(o));
  let mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) { mem = null; }
    if (!mem || !Array.isArray(mem.apps)) { mem = sampleData(); persist(); }
    return mem;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 저장 불가 환경: 메모리로만 */ }
  }
  function getAuth() {
    try { return sessionStorage.getItem(AUTH_KEY) || ''; } catch (e) { return ''; }
  }
  async function call(action, args, auth) {
    const res = await fetch(server(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, auth: auth == null ? getAuth() : auth, args: args || {} }),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || '서버 오류');
    return j.data;
  }
  // 첨부 파일: 데모는 이 브라우저의 IndexedDB, 서버는 구글 드라이브
  const FILE_DB = 'svc-skeleton-files';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(FILE_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('f');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbDo(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction('f', mode), q = fn(tx.objectStore('f'));
      tx.oncomplete = () => res(q && q.result);
      tx.onerror = () => rej(tx.error);
    });
  }
  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1] || '');
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }
  function newId(apps) {
    const day = U.today().slice(2).replace(/-/g, '');
    const n = apps.filter(a => a.id.indexOf('APP-' + day) === 0).length;
    return 'APP-' + day + '-' + String(n + 1).padStart(3, '0');
  }

  return {
    isDemo: () => !server(),
    needLogin: () => !!server() && !getAuth(),

    async login(pw) {
      await call('login', {}, pw);
      try { sessionStorage.setItem(AUTH_KEY, pw); } catch (e) { /* 무시 */ }
    },

    // 신청 목록 (최근 수정 순)
    async list() {
      if (server()) return call('list');
      return clone(load().apps).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    },

    // 신청 1건 + 과업
    async get(id) {
      if (server()) return call('get', { id });
      const d = load();
      return clone({ app: d.apps.find(a => a.id === id), tasks: d.tasks.filter(t => t.appId === id) });
    },

    // 고객 신청 (공개). files = [{ kind, file }] — 첨부 자료(선택)
    async submit(app, files) {
      files = files || [];
      if (server()) {
        const up = [];
        for (const f of files) up.push({ kind: f.kind, name: f.file.name, type: f.file.type, data: await toBase64(f.file) });
        return call('submit', { app, files: up }, '');
      }
      const d = load(), now = new Date().toISOString();
      app.id = newId(d.apps);
      app.status = 'new';
      app.createdAt = app.updatedAt = now;
      app.files = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i], key = app.id + '-' + (i + 1);
        let stored = true;
        try { await idbDo('readwrite', st => st.put(f.file, key)); } catch (e) { stored = false; }
        app.files.push({ id: key, kind: f.kind, name: f.file.name, size: f.file.size, type: f.file.type, stored });
      }
      app.log = [{ at: now, text: '신청 접수' + (app.consult ? ' · ' + CONSULT[app.consult] : '') + (files.length ? ` · 첨부 ${files.length}개` : '') }];
      d.apps.push(clone(app));
      persist();
      return { id: app.id };
    },

    // 신청 저장 (상태·제안서·기록)
    async save(app) {
      app.updatedAt = new Date().toISOString();
      if (server()) return call('save', { app });
      const d = load(), i = d.apps.findIndex(a => a.id === app.id);
      if (i < 0) d.apps.push(clone(app)); else d.apps[i] = clone(app);
      persist();
      return { savedAt: app.updatedAt };
    },

    // 과업 여러 개 저장 (id 기준 덮어쓰기)
    async saveTasks(tasks) {
      if (server()) return call('saveTasks', { tasks });
      const d = load();
      tasks.forEach(t => {
        const i = d.tasks.findIndex(x => x.id === t.id);
        if (i < 0) d.tasks.push(clone(t)); else d.tasks[i] = clone(t);
      });
      persist();
      return { count: tasks.length };
    },

    // AI 솔루션을 부를 수 있는지 (서버 연결 또는 로컬 시험 서버)
    canSolve: () => !!server() || /^(localhost|127\.0\.0\.1)$/.test(location.hostname),

    // AI 솔루션 (공개). 서버 → Apps Script, localhost → 로컬 시험 서버, 그 밖(데모) → null(예시 초안)
    async solve(app, files) {
      if (!this.canSolve()) return null;
      const up = [];
      for (const f of files || []) up.push({ kind: f.kind, name: f.file.name, type: f.file.type, data: await toBase64(f.file) });
      if (server()) return call('solve', { app, files: up }, '');
      const res = await fetch('/api/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'solve', args: { app, files: up } }) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'AI 서버 오류');
      return j.data;
    },

    // 첨부 파일 열기 주소. 서버는 드라이브 링크, 데모는 브라우저에 저장된 파일
    async fileUrl(f) {
      if (f.url) return f.url;
      const blob = await idbDo('readonly', st => st.get(f.id));
      if (!blob) throw new Error('이 브라우저에 파일이 없습니다 (데모는 신청한 브라우저에만 저장됩니다)');
      return URL.createObjectURL(blob);
    },

    // 데모 초기화
    reset() {
      try { indexedDB.deleteDatabase(FILE_DB); } catch (e) { /* 무시 */ }
      mem = sampleData();
      persist();
    },
  };
})();
