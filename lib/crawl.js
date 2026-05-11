import Parser from 'rss-parser';
const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArchiBrief/1.0)' }
});

const FEEDS = [
  // ===== 해외 (International) =====
  // design — 건축가·작품
  { url: 'https://www.archdaily.com/feed', region: 'int', category: 'design', source: 'ArchDaily' },
  { url: 'https://www.dezeen.com/feed/',    region: 'int', category: 'design', source: 'Dezeen' },

  // material — 건축 재료
  { url: 'https://news.google.com/rss/search?q=%22building+materials%22+OR+%22cross+laminated+timber%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'material', source: 'INT Material' },

  // green — 친환경
  { url: 'https://news.google.com/rss/search?q=%22sustainable+architecture%22+OR+%22passive+house%22+OR+%22net+zero+building%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'green', source: 'INT Green' },

  // safety — 구조·소방
  { url: 'https://news.google.com/rss/search?q=%22building+fire+safety%22+OR+%22seismic+design%22+OR+%22earthquake+resistant%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'safety', source: 'INT Safety' },

  // policy — 법규·정책
  { url: 'https://news.google.com/rss/search?q=%22building+code%22+OR+%22zoning+law%22+OR+%22building+regulations%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'policy', source: 'INT Policy' },

  // tech — 기술
  { url: 'https://news.google.com/rss/search?q=%22BIM+architecture%22+OR+%22modular+construction%22+OR+%22construction+robotics%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'tech', source: 'INT Tech' },

  // urban — 도시계획
  { url: 'https://news.google.com/rss/search?q=%22urban+renewal%22+OR+%22smart+city%22+OR+%22urban+regeneration%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'urban', source: 'INT Urban' },

  // edu — 공모전·학술
  { url: 'https://news.google.com/rss/search?q=%22architecture+competition%22+OR+%22Pritzker%22+OR+%22architecture+award%22&hl=en-US&gl=US&ceid=US:en',
    region: 'int', category: 'edu', source: 'INT Edu' },

  // ===== 국내 (Korea via Google News) =====
  // design — 건축가·작품
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95%EA%B0%80%22+OR+%22%EC%84%A4%EA%B3%84%EC%82%AC%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'design', source: 'KR Design' },

  // material — 건축 재료
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95+%EC%9E%90%EC%9E%AC%22+OR+%22%EA%B1%B4%EC%B6%95+%EC%9E%AC%EB%A3%8C%22+OR+%22%EB%AA%A9%EC%A1%B0+%EA%B1%B4%EC%B6%95%22+OR+%22%EC%8B%A0%EC%86%8C%EC%9E%AC%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'material', source: 'KR Material' },

  // green — 친환경
  { url: 'https://news.google.com/rss/search?q=%22%EC%B9%9C%ED%99%98%EA%B2%BD+%EA%B1%B4%EC%B6%95%22+OR+%22%EC%A0%9C%EB%A1%9C%EC%97%90%EB%84%88%EC%A7%80%EA%B1%B4%EC%B6%95%22+OR+%22%ED%8C%A8%EC%8B%9C%EB%B8%8C%ED%95%98%EC%9A%B0%EC%8A%A4%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'green', source: 'KR Green' },

  // safety — 구조·소방·안전
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95+%EC%86%8C%EB%B0%A9%22+OR+%22%EB%82%B4%EC%A7%84+%EC%84%A4%EA%B3%84%22+OR+%22%EA%B1%B4%EB%AC%BC+%ED%99%94%EC%9E%AC%22+OR+%22%EA%B1%B4%EC%B6%95+%EC%95%88%EC%A0%84%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'safety', source: 'KR Safety' },

  // policy — 법규
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95%EB%B2%95%22+OR+%22%EA%B1%B4%EC%B6%95+%EC%9D%B8%ED%97%88%EA%B0%80%22+OR+%22%EA%B5%AD%ED%86%A0%EB%B6%80+%EA%B1%B4%EC%B6%95%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'policy', source: 'KR Policy' },

  // tech — BIM·모듈러
  { url: 'https://news.google.com/rss/search?q=%22%EB%AA%A8%EB%93%88%EB%9F%AC+%EA%B1%B4%EC%B6%95%22+OR+%22BIM%22+OR+%22%EC%8A%A4%EB%A7%88%ED%8A%B8+%EA%B1%B4%EC%84%A4%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'tech', source: 'KR Tech' },

  // urban — 도시
  { url: 'https://news.google.com/rss/search?q=%22%EC%9E%AC%EA%B1%B4%EC%B6%95%22+OR+%22%EC%9E%AC%EA%B0%9C%EB%B0%9C%22+OR+%22%EB%8F%84%EC%8B%9C%EC%9E%AC%EC%83%9D%22+OR+%22%EC%8A%A4%EB%A7%88%ED%8A%B8%EC%8B%9C%ED%8B%B0%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'urban', source: 'KR Urban' },

  // edu — 공모전·학술
  { url: 'https://news.google.com/rss/search?q=%22%EA%B1%B4%EC%B6%95+%EA%B3%B5%EB%AA%A8%EC%A0%84%22+OR+%22%EA%B1%B4%EC%B6%95+%EB%8C%80%EC%83%81%22+OR+%22%EA%B1%B4%EC%B6%95%ED%95%99%ED%9A%8C%22&hl=ko&gl=KR&ceid=KR:ko',
    region: 'kr', category: 'edu', source: 'KR Edu' },
];

export async function fetchAllFeeds() {
  const out = [];
  for (const f of FEEDS) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of feed.items || []) {
        if (!it.link || !it.title) continue;
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
