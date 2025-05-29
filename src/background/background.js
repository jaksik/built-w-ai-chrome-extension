chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request); // Debug log
    
    if (request.type === 'SAVE_ARTICLE' && request.data) {
        console.log('Processing SAVE_ARTICLE request'); // Debug log
        
        const article = {
            title: request.data.title,
            link: request.data.link,
            sourceName: request.data.sourceName,
            descriptionSnippet: request.data.descriptionSnippet,
            publishedDate: request.data.publishedDate
        };

        // Send to backend API instead of storing locally
        fetch('https://ai-news-aggregator-nine.vercel.app/api/articles/external', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(article),
        })
        .then(async response => {
            // Check if the response is ok (status 200-299)
            if (!response.ok) {
                // Try to parse error message from server response
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch (parseError) {
                    console.warn('Could not parse error response:', parseError);
                }
                throw new Error(errorMessage);
            }
            return response.json();
        })
        .then(data => {
            console.log('Article saved to database:', data);
            sendResponse({ success: true, message: 'Article saved to database!', data });
        })
        .catch(error => {
            console.error('Error saving article:', error);
            let errorMessage = error.message;
            
            // Check if it's a network error (server not running)
            if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
                errorMessage = 'Cannot connect to server. Make sure the server is running on localhost:3000';
            }
            
            sendResponse({ success: false, message: `Failed to save article: ${errorMessage}` });
        });

        return true; // Indicates that the response will be sent asynchronously
    }
    return false; // For other message types or if data is missing
});
