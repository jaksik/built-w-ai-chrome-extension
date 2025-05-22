// This file contains the logic for the popup. It retrieves the current tab's URL and other article information, populates the form fields, and handles the submission of the form to post the data to the database.

document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('url');
    const titleInput = document.getElementById('title');
    const publisherInput = document.getElementById('publisher');
    const publishDateInput = document.getElementById('publishDate');
    const categoryInput = document.getElementById('category');
    const articleForm = document.getElementById('article-form');

    // Function to populate the form fields
    function populateForm(data) {
        if (data.url) urlInput.value = data.url;
        if (data.title) titleInput.value = data.title;
        if (data.publisher) publisherInput.value = data.publisher;
        if (data.publishDate) {
            // Ensure date is in YYYY-MM-DD format for the input type="date"
            try {
                publishDateInput.value = new Date(data.publishDate).toISOString().split('T')[0];
            } catch (e) {
                console.warn("Could not parse publishDate: ", data.publishDate);
                publishDateInput.value = ''; // Clear if invalid
            }
        }
        if (data.category) categoryInput.value = data.category;
    }

    // Get the current tab's URL and request more details from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.id && currentTab.url) {
            const articleUrl = currentTab.url;
            // Initially populate URL and whatever title Chrome provides
            populateForm({ url: articleUrl, title: currentTab.title || '' });

            // Request detailed article info from the content script
            chrome.tabs.sendMessage(currentTab.id, { action: 'getArticleInfo' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                    // Content script might not be available on this page (e.g., chrome:// pages)
                    // The form will have the basic URL and title already.
                    // Attempt to use document.title from the popup's context as a fallback if response is empty and currentTab.title was also empty.
                    if (!titleInput.value && document.title) {
                        titleInput.value = document.title; 
                    }
                    return;
                }
                if (response) {
                    // Populate form with more detailed info from content script, keeping the URL
                    populateForm({ url: articleUrl, ...response });
                } else {
                    console.warn("No response or empty response from content script.");
                    // Fallback to tab title if response is empty
                    if (!titleInput.value && currentTab.title) {
                        populateForm({ url: articleUrl, title: currentTab.title });
                    }
                }
            });
        } else {
            console.error("Could not get current tab information.");
            // Handle error, maybe disable the form or show a message
        }
    });

    // Handle form submission
    articleForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        console.log('Form submitted'); // Debug log
        
        const articleData = {
            url: urlInput.value,
            title: titleInput.value,
            publisher: publisherInput.value,
            publishDate: publishDateInput.value,
            category: categoryInput.value
        };
        
        console.log('Article data to send:', articleData); // Debug log

        // Send data to the background script
        chrome.runtime.sendMessage({ type: "SAVE_ARTICLE", data: articleData }, (response) => {
            console.log('Got response from background:', response); // Debug log
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background script:", chrome.runtime.lastError.message);
                alert('Failed to save article. Error communicating with background script.');
                return;
            }
            // Check response from background script
            if (response && response.success) {
                alert('Article saved successfully!');
                window.close(); // Close the popup on success
            } else {
                alert(`Failed to save article. ${response?.message || 'Check background script console for details.'}`);
            }
        });
    });
});