// This file contains the logic for the popup. It retrieves the current tab's URL and other article information, populates the form fields, and handles the submission of the form to post the data to the database.

document.addEventListener('DOMContentLoaded', () => {
    const linkInput = document.getElementById('link');
    const titleInput = document.getElementById('title');
    const sourceNameInput = document.getElementById('sourceName');
    const descriptionSnippetInput = document.getElementById('descriptionSnippet');
    const publishedDateInput = document.getElementById('publishedDate');
    const articleForm = document.getElementById('article-form');

    // Function to populate the form fields
    function populateForm(data) {
        if (data.link) linkInput.value = data.link;
        if (data.title) titleInput.value = data.title;
        if (data.sourceName) sourceNameInput.value = data.sourceName;
        if (data.descriptionSnippet) descriptionSnippetInput.value = data.descriptionSnippet;
        if (data.publishedDate) {
            // Ensure date is in YYYY-MM-DD format for the input type="date"
            try {
                publishedDateInput.value = new Date(data.publishedDate).toISOString().split('T')[0];
            } catch (e) {
                console.warn("Could not parse publishedDate: ", data.publishedDate);
                publishedDateInput.value = ''; // Clear if invalid
            }
        }
    }

    // Get the current tab's URL and request more details from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.id && currentTab.url) {
            const articleLink = currentTab.url;
            // Initially populate link and whatever title Chrome provides
            populateForm({ link: articleLink, title: currentTab.title || '' });

            // Request detailed article info from the content script
            chrome.tabs.sendMessage(currentTab.id, { action: 'getArticleInfo' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                    // Content script might not be available on this page (e.g., chrome:// pages)
                    // The form will have the basic link and title already.
                    if (!titleInput.value && document.title) {
                        titleInput.value = document.title;
                    }
                    return;
                }
                if (response) {
                    // Populate form with more detailed info from content script, keeping the link
                    populateForm({ link: articleLink, ...response });
                } else {
                    console.warn("No response or empty response from content script.");
                    // Fallback to tab title if response is empty
                    if (!titleInput.value && currentTab.title) {
                        populateForm({ link: articleLink, title: currentTab.title });
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
            link: linkInput.value,
            title: titleInput.value,
            sourceName: sourceNameInput.value,
            descriptionSnippet: descriptionSnippetInput.value,
            publishedDate: publishedDateInput.value,
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
                const errorMessage = response?.message || 'Unknown error occurred';
                console.error('Failed to save article:', errorMessage);
                alert(`Failed to save article: ${errorMessage}`);
            }
        });
    });
});