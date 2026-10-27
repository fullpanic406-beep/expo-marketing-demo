// 신청 화면 'AI 솔루션' 초안 — PM만 고친다
// 키 메시지 + 예산에 맞춘 매체별 금액 믹스 + 일정 요약.
// 금액은 AI가 정하지 않는다: 각 모듈 plan()의 단가(가안)로 계산하고, 예산 안에서 가장 알맞은 구성을 고른다.
// 메시지·비중: 서버 AI(server/ai_prompt.js)가 첨부 자료까지 읽고 정한다(engine 'claude').
// AI 서버가 없거나 실패하면 입력 정보로 만든 예시 초안(engine 'template')과 상황별 기본 비중을 쓴다.

// 신청 화면 예산 선택지 (만 원 단위). 'custom' = 직접 입력, 'none' = 배정 예산 없음
const BUDGET_OPTIONS = [['500', '500만 원'], ['1000', '1,000만 원'], ['1500', '1,500만 원'], ['2000', '2,000만 원'],
  ['3000', '3,000만 원'], ['5000', '5,000만 원'], ['custom', '직접 입력'], ['none', '배정 예산 없음']];

// 상황별 매체 비중 (고른 모듈끼리 다시 나눈다)
const SOLUTION_WEIGHTS = {
  '처음 참가라 아는 사람이 없어요': { press: 4, content: 4, influencer: 2 },
  '부스에 사람을 더 모으고 싶어요': { press: 2, content: 3.5, influencer: 4.5 },
  '전시 성과를 제대로 남기고 싶어요': { press: 3.5, content: 3.5, influencer: 3 },
  '': { press: 1, content: 1, influencer: 1 },
};

const SOLUTION_TARGETS = {
  '배터리·소재': '셀·완성차 제조사의 구매·기술 담당자',
  '전자·반도체': '세트 업체 개발·구매 담당자',
  '기계·장비': '공장 설비 담당자와 현장 엔지니어',
  '뷰티·소비재': '유통 바이어와 관심 소비자',
  '식품': '유통 MD와 관심 소비자',
  '기타': '전시 참관객과 업계 관계자',
};

// 모듈 선택지 전체 조합 (multi는 비어 있지 않은 모든 부분집합)
function optionCombos(m) {
  let combos = [{}];
  m.fields.forEach(f => {
    const vals = f.type === 'multi'
      ? Array.from({ length: (1 << f.options.length) - 1 }, (_, b) => f.options.filter((o, i) => (b + 1) & (1 << i)).map(o => o[0]))
      : f.options.map(o => o[0]);
    combos = combos.flatMap(c => vals.map(v => Object.assign({}, c, { [f.key]: v })));
  });
  return combos;
}
function optCost(m, opt, expo) {
  return m.plan(opt, expo).quote.reduce((s, q) => s + q.qty * q.price, 0);
}
// 기본 구성과 얼마나 닮았는지 (같은 금액이면 기본에 가까운 구성을 고른다)
// 여러 개 고르는 항목은 기본값을 모두 포함하면 점수, 기본 밖 항목은 적을수록 좋다
function nearDefault(m, opt) {
  const d = defaultOpt(m);
  return m.fields.reduce((s, f) => {
    if (f.type !== 'multi') return s + (d[f.key] === opt[f.key] ? 1 : 0);
    const extra = opt[f.key].filter(v => !d[f.key].includes(v)).length;
    return s + (d[f.key].every(v => opt[f.key].includes(v)) ? 1 : 0) - extra * 0.01;
  }, 0);
}
// 예산 cap 이하에서 가장 큰 구성. 없으면 가장 싼 구성
function bestFit(m, expo, cap) {
  const all = optionCombos(m).map(o => ({ opt: o, cost: optCost(m, o, expo), near: nearDefault(m, o) }));
  const fit = all.filter(x => x.cost <= cap).sort((a, b) => b.cost - a.cost || b.near - a.near);
  return fit[0] || all.sort((a, b) => a.cost - b.cost || b.near - a.near)[0];
}

// ai = 서버 AI 결과({ message, weights, reason, checks, model }) 또는 null(예시 초안)
function buildSolution(app, ai) {
  const mods = selectedModules(app), x = app.expo, fee = APP_CONFIG.PLANNING_FEE;
  const budget = app.budgetWon || 0, none = !budget;
  const pick = {};
  if (none) {
    // 배정 예산 없음: 기본 구성을 권장안으로
    mods.forEach(m => { const o = defaultOpt(m); pick[m.id] = { opt: o, cost: optCost(m, o, x) }; });
  } else {
    // 비중: AI가 준 값(고른 모듈 합이 0보다 클 때) → 없으면 상황별 기본값
    const base = SOLUTION_WEIGHTS[app.situation] || SOLUTION_WEIGHTS[''];
    const aw = ai && ai.weights, useAi = aw && mods.some(m => +aw[m.id] > 0);
    const w = {}; mods.forEach(m => { w[m.id] = useAi ? Math.max(0, +aw[m.id] || 0) : base[m.id]; });
    const sumW = mods.reduce((s, m) => s + w[m.id], 0), rest = Math.max(0, budget - fee);
    mods.forEach(m => { pick[m.id] = bestFit(m, x, rest * w[m.id] / sumW); });
    // 남은 금액으로 비중 큰 모듈부터 한 단계씩 올린다
    let left = rest - mods.reduce((s, m) => s + pick[m.id].cost, 0);
    mods.slice().sort((a, b) => w[b.id] - w[a.id]).forEach(m => {
      if (left <= 0) return;
      const up = bestFit(m, x, pick[m.id].cost + left);
      if (up.cost > pick[m.id].cost) { left -= up.cost - pick[m.id].cost; pick[m.id] = up; }
    });
  }
  const rows = mods.map(m => ({ module: m.id, name: m.name, opt: pick[m.id].opt, cost: pick[m.id].cost, summary: m.describe(pick[m.id].opt) }));
  const total = fee + rows.reduce((s, r) => s + r.cost, 0);
  const mix = {}; rows.forEach(r => { mix[r.module] = r.opt; });
  const schedule = buildProposal(Object.assign({}, app, { mix })).schedule;
  return {
    engine: ai ? 'claude' : 'template', model: ai ? ai.model : '', createdAt: new Date().toISOString(),
    budget, none, total, fee, over: none ? 0 : Math.max(0, total - budget), left: none ? 0 : Math.max(0, budget - total),
    rows: rows.map(r => Object.assign(r, { share: total ? r.cost / total : 0 })), mix,
    message: ai ? ai.message : solutionMessage(app), reason: ai ? ai.reason : '', checks: ai ? ai.checks || [] : [], schedule,
  };
}

// 키 커뮤니케이션 메시지 (예시 초안)
function solutionMessage(app) {
  const c = app.company, x = app.expo, name = c.name, booth = x.booth ? `부스 ${x.booth}` : '부스';
  const when = `${U.md(x.start)}~${U.md(x.end)}`, memo = app.memo || '';
  const byWhy = {
    '처음 참가라 아는 사람이 없어요': [`${x.name}에서 처음 만나는 ${name}`, `${name}가 어떤 회사인지 한 문장으로 먼저 알립니다. 전시 전에 이름을 알려 두어 현장에서 찾아오게 합니다.`],
    '부스에 사람을 더 모으고 싶어요': [`${booth}에서 직접 확인하세요`, `부스에 와야 볼 수 있는 시연·혜택을 앞세워 방문 이유를 만듭니다.`],
    '전시 성과를 제대로 남기고 싶어요': [`${x.name} 이후에도 이어지는 ${name}의 이야기`, `현장 반응과 성과를 기사·콘텐츠로 남겨 전시 후 영업 자료로 씁니다.`],
  }[app.situation] || [`${x.name}, ${name}를 만나는 가장 빠른 방법`, `전시 전·중·후 메시지를 하나로 맞춰 같은 이야기를 반복해서 알립니다.`];
  const points = [
    `${name}는 ${c.industry} 분야에서 [핵심 제품·기술 — 상담 때 확정]을 하는 회사입니다.`,
    byWhy[1],
    `${when} ${x.name} ${booth}에서 상담을 예약하세요.`,
  ];
  if (/해외|바이어|영문|글로벌/.test(memo)) points.push('해외 바이어용 영문 메시지와 링크드인 채널을 함께 씁니다.');
  return { slogan: byWhy[0], target: SOLUTION_TARGETS[c.industry] || SOLUTION_TARGETS['기타'], points };
}
