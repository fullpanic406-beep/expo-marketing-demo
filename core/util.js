// 공통 도구 + 모듈 등록 — PM만 고친다
window.MODULES = [];

function registerModule(m) {
  MODULES.push(m);
  MODULES.sort((a, b) => a.order - b.order);
}

function moduleById(id) {
  return MODULES.find(m => m.id === id);
}

const U = {
  iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  today() { return U.iso(new Date()); },
  addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return U.iso(d);
  },
  // 전시 시작 n일 전 / 종료 n일 후
  before(expo, n) { return U.addDays(expo.start, -n); },
  after(expo, n) { return U.addDays(expo.end, n); },
  md(iso) {
    if (!iso) return '';
    const p = iso.slice(0, 10).split('-');
    return +p[1] + '.' + +p[2];
  },
  stamp(isoTime) {
    if (!isoTime) return '';
    const d = new Date(isoTime);
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },
  won(n) { return Math.round(n).toLocaleString('ko-KR') + '원'; },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // 선택지 값 → 화면 이름
  label(field, value) {
    const o = field.options.find(x => x[0] === value);
    return o ? o[1] : value;
  },
  labels(field, values) {
    return (values || []).map(v => U.label(field, v)).join(', ');
  },
  field(mod, key) {
    return mod.fields.find(f => f.key === key);
  },
};
