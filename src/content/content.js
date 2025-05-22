const extractArticleInfo = () => {
    const title = document.querySelector('h1')?.textContent || document.title;
    let publisher = document.querySelector('meta[property="og:site_name"], meta[name="application-name"], meta[name="twitter:site"]')?.getAttribute('content') || window.location.hostname;
    let publishDate = document.querySelector('meta[property="article:published_time"], meta[name="cXenseParse:recs:publishtime"], meta[name="pubdate"], meta[name="sailthru.date"], meta[property="book:release_date"], time[datetime]')?.getAttribute('content') || 
                      document.querySelector('time[datetime]')?.getAttribute('datetime') || 
                      '';
    const url = window.location.href;

    if (title && url) {
        return { title, publisher, publishDate, url };
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