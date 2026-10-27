// 콘텐츠 모듈 — 콘텐츠 담당이 고친다 (이 파일만)
// 규격: id·name·order·intro·fields / describe(opt) / plan(opt, expo) / tasks(opt, expo)
registerModule({
  id: 'content',
  name: '콘텐츠',
  order: 2,
  intro: '전시 전·중·후에 올릴 SNS·블로그 콘텐츠를 만들어 올립니다.',
  points: ['전시 일정에 맞춘 콘텐츠 캘린더', '인스타그램·블로그·링크드인 제작', '현장 촬영과 사후 콘텐츠'],
  fields: [
    {
      key: 'channels', label: '어디에 올릴까요', type: 'multi',
      options: [['insta', '인스타그램'], ['blog', '블로그'], ['linkedin', '링크드인']],
      default: ['insta', 'linkedin'],
    },
    {
      key: 'volume', label: '콘텐츠 수', type: 'one',
      options: [['6', '6건'], ['12', '12건'], ['20', '20건']],
      default: '12',
    },
  ],

  describe(o) {
    return `${U.labels(U.field(this, 'channels'), o.channels)} · 콘텐츠 ${o.volume}건`;
  },

  // 전시 전 50% · 기간 30% · 후 나머지
  _split(o) {
    const n = +o.volume, prep = Math.round(n * 0.5), live = Math.round(n * 0.3);
    return { prep, live, post: n - prep - live };
  },

  plan(o, x) {
    const s = this._split(o);
    return {
      schedule: [
        { date: U.before(x, 24), title: '콘텐츠 캘린더 확정' },
        { date: U.before(x, 14), title: `사전 홍보 콘텐츠 ${s.prep}건 게시 시작` },
        { date: x.start, title: `현장 콘텐츠 ${s.live}건 게시` },
        { date: U.after(x, 2), title: `사후 콘텐츠 ${s.post}건 게시` },
      ],
      quote: [{ item: `콘텐츠 기획·제작 (${U.labels(U.field(this, 'channels'), o.channels)})`, qty: +o.volume, unit: '건', price: 300000 }],
    };
  },

  tasks(o, x) {
    const s = this._split(o);
    return [
      { title: '콘텐츠 캘린더 확정', due: U.before(x, 24) },
      { title: `사전 홍보 ${s.prep}건 제작`, due: U.before(x, 17) },
      { title: '사전 홍보 고객 확인', due: U.before(x, 15) },
      { title: '사전 홍보 게시', due: U.before(x, 14) },
      { title: `현장 촬영·${s.live}건 게시`, due: x.end },
      { title: `사후 ${s.post}건 제작·게시`, due: U.after(x, 3) },
      { title: '콘텐츠 성과 정리', due: U.after(x, 7) },
    ];
  },
});
