chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request); // Debug log
    
    if (request.type === 'SAVE_ARTICLE' && request.data) {
        console.log('Processing SAVE_ARTICLE request'); // Debug log
        
        const article = {
            title: request.data.title,
            link: request.data.url,         // Changed from url to link
            source: request.data.publisher,  // Changed from publisher to source
            publishedAt: request.data.publishDate, // Changed from publishDate to publishedAt
            category: request.data.category || ''  // Added category field
        };

        // Send to backend API instead of storing locally
        fetch('https://built-w-ai-server.onrender.com/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(article),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Article saved to database:', data);
            sendResponse({ success: true, message: 'Article saved to database!', data });
        })
        .catch(error => {
            console.error('Error saving article:', error);
            sendResponse({ success: false, message: 'Failed to save article to database.' });
        });

        return true; // Indicates that the response will be sent asynchronously
    }
    return false; // For other message types or if data is missing
});

// Optional: Add a way to get all articles from the database
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_ALL_ARTICLES') {
        fetch('http://localhost:3000/api/articles')
            .then(response => response.json())
            .then(articles => {
                sendResponse({ success: true, data: articles });
            })
            .catch(error => {
                console.error('Error retrieving articles:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Async response
    }
});