// 제안서 조립 · 과업 생성 — PM만 고친다
// 각 모듈의 plan()/tasks() 결과를 모아 하나의 제안서와 과업 목록으로 만든다.

const STATUS = {
  new: '신청 접수',
  proposal: '제안서 작성',
  sent: '컨펌 대기',
  active: '과업 진행',
  done: '완료',
};
const STATUS_ORDER = ['new', 'proposal', 'sent', 'active', 'done'];

const TASK_STATUS = [['todo', '대기'], ['doing', '진행'], ['review', '검수'], ['done', '완료']];

const PHASES = [['prep', '전시 전'], ['live', '전시 기간'], ['post', '전시 후']];

function phaseOf(date, expo) {
  if (date < expo.start) return 'prep';
  if (date <= expo.end) return 'live';
  return 'post';
}

// 모듈 기본 구성 (고객은 모듈만 고르고, 세부는 상담 후 운영사가 조정)
function defaultOpt(m) {
  const o = {};
  m.fields.forEach(f => { o[f.key] = Array.isArray(f.default) ? f.default.slice() : f.default; });
  return o;
}

// 신청 화면에서 AI 솔루션을 보고 고른 상담 종류
const CONSULT = { run: '실행 상담', refine: '플랜 고도화 상담' };

const INDUSTRIES =['배터리·소재', '전자·반도체', '기계·장비', '뷰티·소비재', '식품', '기타'];

function selectedModules(app) {
  return MODULES.filter(m => app.mix && app.mix[m.id]);
}

function buildProposal(app) {
  const sections = [], schedule = [], quote = [];
  quote.push({ module: 'common', item: '홍보 플래닝 (일정·채널·예산 설계)', qty: 1, unit: '식', price: APP_CONFIG.PLANNING_FEE });
  selectedModules(app).forEach(m => {
    const opt = app.mix[m.id];
    const p = m.plan(opt, app.expo);
    sections.push({ module: m.id, name: m.name, summary: m.describe(opt) });
    p.schedule.forEach(s => schedule.push(Object.assign({ module: m.id }, s)));
    p.quote.forEach(q => quote.push(Object.assign({ module: m.id }, q)));
  });
  schedule.sort((a, b) => a.date.localeCompare(b.date));
  const total = quote.reduce((s, q) => s + q.qty * q.price, 0);
  return { createdAt: new Date().toISOString(), sentAt: '', sections, schedule, quote, total };
}

function buildTasks(app) {
  const out = [];
  selectedModules(app).forEach(m => {
    m.tasks(app.mix[m.id], app.expo).forEach((t, i) => {
      out.push({ id: app.id + '-' + m.id + '-' + (i + 1), appId: app.id, module: m.id, title: t.title, due: t.due, status: 'todo', owner: '' });
    });
  });
  return out.sort((a, b) => a.due.localeCompare(b.due));
}

// 메일에 붙여 넣을 제안서 요약 텍스트
function proposalText(app) {
  const p = app.proposal, lines = [];
  lines.push(`[${app.company.name}] ${app.expo.name} 홍보 제안`);
  lines.push(`전시 ${U.md(app.expo.start)}~${U.md(app.expo.end)} · 부스 ${app.expo.booth || '-'}`, '');
  lines.push('■ 구성');
  p.sections.forEach(s => lines.push(`- ${s.name}: ${s.summary}`));
  lines.push('', '■ 일정');
  p.schedule.forEach(s => lines.push(`- ${U.md(s.date)} ${moduleById(s.module).name} · ${s.title}`));
  lines.push('', '■ 견적 (가안)');
  p.quote.forEach(q => lines.push(`- ${q.item} ${q.qty}${q.unit} ${U.won(q.qty * q.price)}`));
  lines.push(`합계 ${U.won(p.total)} (${APP_CONFIG.VAT_NOTE})`);
  return lines.join('\n');
}
