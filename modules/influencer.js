// 인플루언서 모듈 — 인플루언서 담당이 고친다 (이 파일만)
// 규격: id·name·order·intro·fields / describe(opt) / plan(opt, expo) / tasks(opt, expo)
registerModule({
  id: 'influencer',
  name: '인플루언서',
  order: 3,
  intro: '업계 인플루언서를 섭외해 부스 방문·리뷰 콘텐츠를 만듭니다.',
  points: ['업계 실무자·크리에이터 후보 제안', '부스 방문·제품 리뷰·라이브', '게시물 확인과 성과 정리'],
  fields: [
    {
      key: 'count', label: '몇 명', type: 'one',
      options: [['3', '3명'], ['5', '5명'], ['10', '10명']],
      default: '5',
    },
    {
      key: 'tier', label: '어떤 분들', type: 'one',
      options: [['pro', '업계 실무자·전문가'], ['creator', '테크 크리에이터']],
      default: 'pro',
    },
    {
      key: 'types', label: '무엇을 할까요', type: 'multi',
      options: [['visit', '부스 방문 후기'], ['review', '제품 리뷰'], ['live', '현장 라이브']],
      default: ['visit'],
    },
  ],

  describe(o) {
    return `${U.label(U.field(this, 'tier'), o.tier)} ${o.count}명 · ${U.labels(U.field(this, 'types'), o.types)}`;
  },

  plan(o, x) {
    const schedule = [
      { date: U.before(x, 28), title: '후보 리스트 제안' },
      { date: U.before(x, 21), title: '섭외 확정' },
      { date: U.before(x, 10), title: '방문·리뷰 가이드 전달' },
      { date: x.start, title: '부스 방문 시작' },
      { date: U.after(x, 5), title: '게시물 확인' },
    ];
    if (o.types.includes('live')) schedule.push({ date: U.addDays(x.start, 1), title: '현장 라이브' });
    const quote = [{ item: `인플루언서 섭외·운영 (${U.label(U.field(this, 'tier'), o.tier)})`, qty: +o.count, unit: '명', price: o.tier === 'creator' ? 1500000 : 500000 }];
    if (o.types.includes('live')) quote.push({ item: '현장 라이브 진행', qty: 1, unit: '식', price: 2000000 });
    return { schedule, quote };
  },

  tasks(o, x) {
    const out = [
      { title: '후보 리스트 작성', due: U.before(x, 30) },
      { title: '고객 후보 확인', due: U.before(x, 26) },
      { title: `섭외·계약 ${o.count}명`, due: U.before(x, 21) },
      { title: '가이드 작성·전달', due: U.before(x, 10) },
      { title: '방문 일정 확정', due: U.before(x, 5) },
      { title: '현장 응대', due: x.start },
      { title: '게시물 확인', due: U.after(x, 5) },
      { title: '인플루언서 성과 정리', due: U.after(x, 7) },
    ];
    if (o.types.includes('review')) out.push({ title: '체험 제품 발송', due: U.before(x, 14) });
    if (o.types.includes('live')) out.push({ title: '현장 라이브 진행', due: U.addDays(x.start, 1) });
    return out;
  },
});
