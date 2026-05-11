import Parser from 'rss-parser';
const parser = new Parser({ timeout: 15000 });

// Pick easy-to-parse RSS sources to start. Expand later.
// category is a default tag for items from that feed; you can later classify per article.
const FEEDS = [
  // International
  { url: 'https://www.archdaily.com/feed', region: 'int', category: 'design',   source: 'ArchDaily' },
  { url: 'https://www.dezeen.com/feed/',    region: 'int', category: 'design',   source: 'Dezeen' },
  // Korean (find more RSS sources and add here — examples below; verify they work)
  // { url: 'https://example.kr/feed', region: 'kr', category: 'design', source: '...' },
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
    } catch (e) {
      console.error('feed failed:', f.url, e.message);
    }
  }
  return out;
}
