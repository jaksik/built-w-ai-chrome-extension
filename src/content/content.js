const extractArticleInfo = () => {
    const title = document.querySelector('h1')?.textContent || document.title;
    let sourceName = document.querySelector('meta[property="og:site_name"], meta[name="application-name"], meta[name="twitter:site"]')?.getAttribute('content') || window.location.hostname;
    let publishedDate = document.querySelector('meta[property="article:published_time"], meta[name="cXenseParse:recs:publishtime"], meta[name="pubdate"], meta[name="sailthru.date"], meta[property="book:release_date"], time[datetime]')?.getAttribute('content') || 
                      document.querySelector('time[datetime]')?.getAttribute('datetime') || 
                      '';
    let descriptionSnippet = document.querySelector('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]')?.getAttribute('content') || '';
    const link = window.location.href;

    if (title && link) {
        return { title, sourceName, publishedDate, descriptionSnippet, link };
    }
    return null;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getArticleInfo') {
        const articleInfo = extractArticleInfo();
        sendResponse(articleInfo);
    }
    return true;
});