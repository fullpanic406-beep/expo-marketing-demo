// 데모용 예시 신청 4건 (모두 가상) — 서버 연결 시에는 쓰지 않는다
function sampleData() {
  const ib = { name: '인터배터리 2027 (가상 일정)', start: '2027-03-10', end: '2027-03-12' };
  const near = { name: '배터리 산업 전시회 2026 (가상)', start: '2026-11-18', end: '2026-11-20' };
  const apps = [
    {
      id: 'APP-261023-001', status: 'new', createdAt: '2026-10-23T09:12:00',
      budget: '500만~1,000만 원', situation: '처음 참가라 아는 사람이 없어요',
      company: { name: '나노코트(가상)', industry: '배터리·소재', person: '김서연', email: 'sy.kim@nanocoat.example', phone: '010-0000-1201', site: 'nanocoat.example' },
      expo: Object.assign({ booth: 'B-204' }, ib),
      mix: {
        press: { kinds: ['teaser', 'result'], reach: '20' },
        content: { channels: ['linkedin', 'blog'], volume: '6' },
      },
      memo: '해외 바이어 대상 영문 자료도 필요합니다.',
    },
    {
      id: 'APP-261022-002', status: 'proposal', createdAt: '2026-10-22T14:30:00',
      budget: '1,000만~3,000만 원', situation: '',
      company: { name: '하이퍼셀(가상)', industry: '배터리·소재', person: '박도윤', email: 'dy.park@hypercell.example', phone: '010-0000-3388', site: 'hypercell.example' },
      expo: Object.assign({ booth: 'A-112' }, ib),
      mix: {
        press: { kinds: ['teaser', 'live', 'result'], reach: '30' },
        content: { channels: ['insta', 'linkedin'], volume: '12' },
        influencer: { count: '5', tier: 'pro', types: ['visit', 'review'] },
      },
      memo: '',
    },
    {
      id: 'APP-261020-001', status: 'sent', createdAt: '2026-10-20T10:05:00',
      budget: '1,000만~3,000만 원', situation: '부스에 사람을 더 모으고 싶어요',
      company: { name: '파워그리드(가상)', industry: '전자·반도체', person: '이하준', email: 'hj.lee@powergrid.example', phone: '010-0000-7710', site: 'powergrid.example' },
      expo: Object.assign({ booth: 'C-031' }, ib),
      mix: {
        influencer: { count: '3', tier: 'creator', types: ['visit', 'live'] },
        content: { channels: ['insta'], volume: '6' },
      },
      memo: '라이브는 둘째 날 오후를 원합니다.',
    },
    {
      id: 'APP-261013-001', status: 'active', createdAt: '2026-10-13T16:40:00',
      budget: '1,000만~3,000만 원', situation: '',
      company: { name: '셀브릿지(가상)', industry: '기계·장비', person: '정민재', email: 'mj.jung@cellbridge.example', phone: '010-0000-5521', site: 'cellbridge.example' },
      expo: Object.assign({ booth: 'A-517' }, near),
      mix: {
        press: { kinds: ['teaser', 'live', 'result'], reach: '20' },
        content: { channels: ['insta', 'linkedin'], volume: '12' },
        influencer: { count: '5', tier: 'pro', types: ['visit'] },
      },
      memo: '',
    },
  ];

  const tasks = [];
  apps.forEach(a => {
    a.updatedAt = a.createdAt;
    a.log = [{ at: a.createdAt, text: '신청 접수' }];
    if (a.status === 'new') return;
    a.proposal = buildProposal(a);
    a.proposal.createdAt = a.createdAt;
    a.log.push({ at: a.createdAt, text: '제안서 작성' });
    if (a.status === 'proposal') return;
    a.proposal.sentAt = '2026-10-21T11:00:00';
    a.log.push({ at: a.proposal.sentAt, text: '고객에게 제안서 보냄' });
    if (a.status === 'sent') return;
    a.confirmedAt = '2026-10-16T15:20:00';
    a.proposal.sentAt = '2026-10-15T10:00:00';
    a.log = [a.log[0], a.log[1], { at: a.proposal.sentAt, text: '고객에게 제안서 보냄' }, { at: a.confirmedAt, text: '고객 컨펌 · 과업 시작' }];
    const today = U.today();
    buildTasks(a).forEach(t => {
      if (t.due < today) t.status = 'done';
      else if (t.due <= U.addDays(today, 3)) t.status = 'doing';
      tasks.push(t);
    });
  });
  return { apps, tasks };
}
