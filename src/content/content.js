// Article text extraction strategies
class TextExtractor {
  constructor() {
    this.strategies = [
      this.extractFromJsonLd.bind(this),
      this.extractFromMicrodata.bind(this),
      this.extractFromSemanticTags.bind(this),
      this.extractFromCommonSelectors.bind(this),
      this.extractFromReadability.bind(this)
    ];
  }

  // Main extraction method that tries multiple strategies
  extractArticleText() {
    for (const strategy of this.strategies) {
      try {
        const result = strategy();
        if (result && result.length > 100) { // Minimum length threshold
          return this.cleanText(result);
        }
      } catch (error) {
        console.log('Strategy failed:', error);
        continue;
      }
    }
    
    // Fallback: extract all visible text
    return this.extractVisibleText();
  }

  // Strategy 1: JSON-LD structured data
  extractFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const article = this.findArticleInJsonLd(data);
        if (article && article.articleBody) {
          return article.articleBody;
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  findArticleInJsonLd(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const result = this.findArticleInJsonLd(item);
        if (result) return result;
      }
    } else if (data && typeof data === 'object') {
      if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
        return data;
      }
      for (const key in data) {
        if (typeof data[key] === 'object') {
          const result = this.findArticleInJsonLd(data[key]);
          if (result) return result;
        }
      }
    }
    return null;
  }

  // Strategy 2: Microdata
  extractFromMicrodata() {
    const articleElement = document.querySelector('[itemtype*="Article"]');
    if (articleElement) {
      const bodyElement = articleElement.querySelector('[itemprop="articleBody"]');
      if (bodyElement) {
        return bodyElement.textContent;
      }
    }
    return null;
  }

  // Strategy 3: Semantic HTML tags
  extractFromSemanticTags() {
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 100) {
          return text;
        }
      }
    }
    return null;
  }

  // Strategy 4: Common CSS selectors used by news sites
  extractFromCommonSelectors() {
    const selectors = [
      '.article-body',
      '.story-body',
      '.post-body',
      '.content-body',
      '.article-text',
      '.story-content',
      '.news-content',
      '.blog-content',
      '#article-content',
      '#story-content',
      '#post-content'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.extractTextFromElement(element);
        if (text && text.length > 100) {
          return text;
        }
      }
    }
    return null;
  }

  // Strategy 5: Simple readability-based extraction
  extractFromReadability() {
    const paragraphs = document.querySelectorAll('p');
    let bestCandidate = null;
    let bestScore = 0;

    // Find the container with the most paragraph text
    const containers = new Map();
    
    paragraphs.forEach(p => {
      if (p.textContent.length < 50) return; // Skip short paragraphs
      
      let parent = p.parentElement;
      while (parent && parent !== document.body) {
        if (!containers.has(parent)) {
          containers.set(parent, { element: parent, score: 0, textLength: 0 });
        }
        const data = containers.get(parent);
        data.score += 1;
        data.textLength += p.textContent.length;
        parent = parent.parentElement;
      }
    });

    // Find the best container
    containers.forEach(data => {
      const score = data.score * Math.log(data.textLength);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = data.element;
      }
    });

    if (bestCandidate) {
      return this.extractTextFromElement(bestCandidate);
    }
    
    return null;
  }

  // Extract text from an element, filtering out navigation and ads
  extractTextFromElement(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside',
      '.navigation', '.nav', '.menu',
      '.sidebar', '.widget', '.advertisement', '.ad',
      '.social', '.share', '.comment', '.related',
      'script', 'style', 'noscript'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    return clone.textContent || clone.innerText || '';
  }

  // Fallback: extract all visible text
  extractVisibleText() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip invisible elements
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip script and style tags
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let text = '';
    let node;
    while (node = walker.nextNode()) {
      text += node.textContent + ' ';
    }
    
    return text;
  }

  // Clean and normalize extracted text
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();
  }
}

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
    } else if (request.action === 'extractText') {
        try {
            const extractor = new TextExtractor();
            const text = extractor.extractArticleText();
            
            if (text && text.length > 50) {
                sendResponse({ success: true, text: text });
            } else {
                sendResponse({ success: false, error: 'No substantial article text found on this page' });
            }
        } catch (error) {
            console.error('Text extraction error:', error);
            sendResponse({ success: false, error: 'Failed to extract text: ' + error.message });
        }
    }
    return true;
});