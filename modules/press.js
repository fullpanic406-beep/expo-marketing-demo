// 언론 모듈 — 언론 담당이 고친다 (이 파일만)
// 규격: id·name·order·intro·fields / describe(opt) / plan(opt, expo) / tasks(opt, expo)
registerModule({
  id: 'press',
  name: '언론',
  order: 1,
  intro: '보도자료를 써서 기자에게 보내고, 실린 기사를 모아 드립니다.',
  points: ['참가 예고·현장·성과 보도자료 작성', '업계 전문지·경제지 배포', '게재 기사 모아 정리'],
  fields: [
    {
      key: 'kinds', label: '어떤 보도자료를 낼까요', type: 'multi',
      options: [['teaser', '참가 예고'], ['live', '현장 소식'], ['result', '성과 정리']],
      default: ['teaser', 'result'],
    },
    {
      key: 'reach', label: '배포 범위', type: 'one',
      options: [['10', '전문지 10곳'], ['20', '전문지·경제지 20곳'], ['30', '확대 30곳']],
      default: '20',
    },
  ],

  describe(o) {
    return `보도자료 ${o.kinds.length}건 (${U.labels(U.field(this, 'kinds'), o.kinds)}) · ${U.label(U.field(this, 'reach'), o.reach)}`;
  },

  // 보도자료 종류별 작성일·배포일
  _dates(kind, x) {
    if (kind === 'teaser') return { draft: U.before(x, 21), check: U.before(x, 17), send: U.before(x, 14) };
    if (kind === 'live') return { draft: U.before(x, 5), check: U.before(x, 2), send: U.addDays(x.start, 1) };
    return { draft: U.after(x, 1), check: U.after(x, 2), send: U.after(x, 3) };
  },

  plan(o, x) {
    const kinds = U.field(this, 'kinds');
    const schedule = o.kinds.map(k => ({ date: this._dates(k, x).send, title: `${U.label(kinds, k)} 보도자료 배포` }));
    schedule.push({ date: U.after(x, 7), title: '게재 기사 정리' });
    const unit = { '10': 600000, '20': 900000, '30': 1200000 }[o.reach];
    return {
      schedule,
      quote: [{ item: `보도자료 작성·배포 (${U.label(U.field(this, 'reach'), o.reach)})`, qty: o.kinds.length, unit: '건', price: unit }],
    };
  },

  tasks(o, x) {
    const kinds = U.field(this, 'kinds'), out = [];
    o.kinds.forEach(k => {
      const d = this._dates(k, x), name = U.label(kinds, k);
      out.push({ title: `${name} · 초안 작성`, due: d.draft });
      out.push({ title: `${name} · 고객 확인`, due: d.check });
      out.push({ title: `${name} · 배포`, due: d.send });
    });
    out.push({ title: '게재 기사 정리', due: U.after(x, 7) });
    return out;
  },
});
