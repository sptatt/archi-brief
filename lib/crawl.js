import Parser from 'rss-parser';
const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 ArchiBrief/1.0' }
});

// 작동 안 하는 피드는 자동으로 skip — error 핸들링됨
const FEEDS = [
  // === 해외 (International) ===
  { url: 'https://www.archdaily.com/feed', region: 'int', category: 'design', source: 'ArchDaily' },
  { url: 'https://www.dezeen.com/feed/',    region: 'int', category: 'design', source: 'Dezeen' },
  { url: 'https://www.architecturaldigest.com/feed/rss', region: 'int', category: 'design', source: 'Architectural Digest' },

  // === 국내 (Korea) ===
  // ArchDaily Korea (RSS 존재 시 자동 동작)
  { url: 'https://www.archdaily.kr/kr/rss', region: 'kr', category: 'design', source: 'ArchDaily Korea' },
  { url: 'https://www.archdaily.com/country/south-korea/feed', region: 'kr', category: 'design', source: 'ArchDaily Korea' },

  // 한국 부동산/건설 분야 매체 (건축 콘텐츠 포함)
  { url: 'https://rss.hankyung.com/feed/realestate.xml', region: 'kr', category: 'urban',    source: '한국경제 부동산' },
  { url: 'https://rss.donga.com/economy.xml',             region: 'kr', category: 'urban',    source: '동아일보 경제' },

  // 국가/지자체 공식 보도 (있으면 추가)
  // 국토교통부, 서울시, 한국토지주택공사(LH), 한국건축가협회 등
  // RSS가 있는 매체를 찾으면 위에 같은 형식으로 추가:
  // { url: 'https://...rss/...', region: 'kr', category: 'policy', source: '...' },
];

export async function fetchAllFeeds() {
  const out = [];
  for (const f of FEEDS) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of feed.items || []) {
        if (!it.link || !it.title) continue;
        out.push({
          title: it.title.slice(0, 500),
          url: it.link,
          source: f.source || feed.title || f.url,
          excerpt: (it.contentSnippet || it.content || '').replace(/<[^>]+>/g,'').trim().slice(0, 400),
          category: f.category,
          region: f.region,
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
        });
      }
      console.log(`✓ ${f.source}: ${feed.items?.length || 0} items`);
    } catch (e) {
      console.error(`✗ ${f.source} (${f.url}):`, e.message);
    }
  }
  return out;
}
