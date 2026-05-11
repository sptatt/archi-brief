import Parser from 'rss-parser';
const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArchiBrief/1.0)' }
});

// 작동 안 하는 피드는 자동으로 skip (error 핸들링됨)
const FEEDS = [
  // === 해외 (직접 RSS) ===
  { url: 'https://www.archdaily.com/feed',  region: 'int', category: 'design', source: 'ArchDaily' },
  { url: 'https://www.dezeen.com/feed/',    region: 'int', category: 'design', source: 'Dezeen' },

  // === 국내 (Google News RSS로 키워드 검색) ===
  // 카테고리별로 한국어 키워드 검색 → 한국 매체들이 자동 포함됨
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95%EA%B0%80%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'design', source: '국내 건축가' },
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95+%EA%B3%B5%EB%AA%A8%EC%A0%84%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'edu', source: '국내 공모전' },
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95%EB%B2%95%22+OR+%22%EA%B1%B4%EC%B6%95+%EA%B7%9C%EC%A0%9C%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'policy', source: '국내 건축 정책' },
  { url: 'https://news.google.com/rss/search?q=%22%EC%9E%AC%EA%B1%B4%EC%B6%95%22+OR+%22%EC%9E%AC%EA%B0%9C%EB%B0%9C%22+%EC%84%9C%EC%9A%B8&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'urban', source: '국내 재건축/도시재생' },
  { url: 'https://news.google.com/rss/search?q=%22%EC%B9%9C%ED%99%98%EA%B2%BD+%EA%B1%B4%EC%B6%95%22+OR+%22%EC%A0%9C%EB%A1%9C%EC%97%90%EB%84%88%EC%A7%80%EA%B1%B4%EC%B6%95%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'green', source: '국내 친환경 건축' },
  { url: 'https://news.google.com/rss/search?q=%22%EB%AA%A8%EB%93%88%EB%9F%AC+%EA%B1%B4%EC%B6%95%22+OR+%22BIM%22+%EA%B1%B4%EC%84%A4&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'tech', source: '국내 건설 기술' },
];

export async function fetchAllFeeds() {
  const out = [];
  for (const f of FEEDS) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of feed.items || []) {
        if (!it.link || !it.title) continue;
        // Google News title 형식: "기사 제목 - 매체명" → 분리
        let title = it.title;
        let actualSource = f.source;
        if (f.url.includes('news.google.com')) {
          const m = title.match(/^(.+) - ([^-]+)$/);
          if (m) {
            title = m[1].trim();
            actualSource = m[2].trim();
          }
        }
        out.push({
          title: title.slice(0, 500),
          url: it.link,
          source: actualSource,
          excerpt: (it.contentSnippet || it.content || '').replace(/<[^>]+>/g,'').trim().slice(0, 400),
          category: f.category,
          region: f.region,
          published_at: it.isoDate || it.pubDate || new Date().toISOString(),
        });
      }
      console.log(`OK ${f.source}: ${feed.items?.length || 0}`);
    } catch (e) {
      console.error(`FAIL ${f.source}:`, e.message);
    }
  }
  return out;
}
