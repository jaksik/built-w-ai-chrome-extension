// This file contains the logic for the popup. It retrieves the current tab's URL and other article information, populates the form fields, and handles the submission of the form to post the data to the database.

document.addEventListener('DOMContentLoaded', () => {
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
            
            // Load saved articles when switching to saved tab
            if (targetTab === 'saved') {
                loadSavedArticles();
            }
            
            // Initialize tools tab
            if (targetTab === 'tools') {
                refreshPageInfo();
            }
            
            // Initialize summarize tab
            if (targetTab === 'summarize') {
                initializeSummarizationTab();
            }
            
            // Initialize summarize tab
            if (targetTab === 'summarize') {
                initializeSummarizationTab();
            }
        });
    });

    // Original form elements
    const linkInput = document.getElementById('link');
    const titleInput = document.getElementById('title');
    const sourceNameInput = document.getElementById('sourceName');
    const descriptionSnippetInput = document.getElementById('descriptionSnippet');
    const publishedDateInput = document.getElementById('publishedDate');
    const articleForm = document.getElementById('article-form');

    // Settings elements
    const apiEndpointInput = document.getElementById('api-endpoint');
    const openaiApiKeyInput = document.getElementById('openai-api-key');
    const autoFillSelect = document.getElementById('auto-fill');
    const saveSettingsButton = document.getElementById('save-settings');

    // Summarization elements (for icon-triggered summarization)
    const status = document.getElementById('status');
    const wordCount = document.getElementById('wordCount');
    const results = document.getElementById('results');
    const summaryText = document.getElementById('summaryText');
    const resultsCopyBtn = document.getElementById('resultsCopyBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');
    
    // Navigation icon elements
    const copyArticleBtn = document.getElementById('copyArticleBtn');
    const summarizeIconBtn = document.getElementById('summarizeIconBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    // Save Tool elements
    const refreshInfoBtn = document.getElementById('refreshInfoBtn');
    const validateFormBtn = document.getElementById('validateFormBtn');
    const currentUrlDiv = document.getElementById('current-url');
    const pageTitleDiv = document.getElementById('page-title');
    const pageDomainDiv = document.getElementById('page-domain');
    const pageWordCountDiv = document.getElementById('page-word-count');
    
    let currentSummaryText = '';

    // Load settings on startup
    loadSettings();

    // Navigation icon event listeners
    if (copyArticleBtn) {
        copyArticleBtn.addEventListener('click', copyArticleToClipboard);
    }

    if (summarizeIconBtn) {
        summarizeIconBtn.addEventListener('click', handleSummarizeClick);
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Switch to settings tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            document.getElementById('settings-tab').classList.add('active');
            // Find and activate the settings button (if it exists)
            const settingsTabButton = document.querySelector('[data-tab="settings"]');
            if (settingsTabButton) {
                settingsTabButton.classList.add('active');
            }
        });
    }

    // Save Tool event listeners
    if (refreshInfoBtn) {
        refreshInfoBtn.addEventListener('click', refreshPageInfo);
    }

    if (validateFormBtn) {
        validateFormBtn.addEventListener('click', validateArticleForm);
    }

    // Initialize summarization functionality
    function initializeSummarizationTab() {
        // Check for saved API key and enable/disable summarize button
        chrome.storage.sync.get(['openaiApiKey'], (result) => {
            if (!result.openaiApiKey) {
                summarizeBtn.disabled = true;
                summarizeBtn.textContent = 'API Key Required';
                summarizeBtn.title = 'Please set your OpenAI API key in Settings';
            } else {
                summarizeBtn.disabled = false;
                summarizeBtn.textContent = 'Summarize Current Article';
                summarizeBtn.title = '';
            }
        });
    }

    // Summarization event listeners
    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', () => extractAndSummarizeText());
    }

    if (resultsCopyBtn) {
        resultsCopyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(currentSummaryText);
            showStatus('Summary copied to clipboard!', 'success');
        });
    }

    async function extractAndSummarizeText() {
        try {
            summarizeBtn.disabled = true;
            summarizeBtn.textContent = 'Extracting...';
            
            // Hide results section initially
            results.style.display = 'none';
            
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if the tab URL is supported
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('moz-extension://') || tab.url.startsWith('about:')) {
                throw new Error('Cannot extract text from browser internal pages');
            }
            
            // Try to inject content script if it's not already there
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/content.js']
                });
            } catch (injectionError) {
                // Content script might already be injected, continue
                console.log('Content script injection attempt:', injectionError.message);
            }
            
            // Wait a bit for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Send message to content script to extract text
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
            
            if (response && response.success) {
                const extractedText = response.text;
                updateWordCount(extractedText);
                await summarizeText(extractedText);
            } else {
                showStatus(response.error || 'Failed to extract text', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            summarizeBtn.disabled = false;
            summarizeBtn.textContent = 'Summarize Current Article';
        }
    }

    async function summarizeText(text) {
        try {
            summarizeBtn.textContent = 'Summarizing...';
            
            const apiKey = await getApiKey();
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that creates concise article summaries. Create a brief 1-2 sentence news blurb, followed by 3-6 bullet points of key information. Format as: Brief summary paragraph, then bullet points with • symbols.'
                        },
                        {
                            role: 'user',
                            content: `Please summarize this article with a brief news blurb (1-2 sentences) followed by bullet points of key information:\n\n${text}`
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API request failed (${response.status})`);
            }
            
            const data = await response.json();
            currentSummaryText = data.choices[0].message.content.trim();
            summaryText.textContent = currentSummaryText;
            
            // Show results section with summary
            results.style.display = 'block';
            
            showStatus('Summary generated successfully!', 'success');
            
        } catch (error) {
            console.error('Summarization error:', error);
            showStatus('Summarization failed: ' + error.message, 'error');
        }
    }

    async function getApiKey() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(['openaiApiKey'], (result) => {
                if (result.openaiApiKey) {
                    resolve(result.openaiApiKey);
                } else {
                    reject(new Error('Please set your OpenAI API key in Settings'));
                }
            });
        });
    }

    function showStatus(message, type) {
        if (status) {
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
            
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
    }

    function updateWordCount(text) {
        if (wordCount) {
            const words = text.trim().split(/\s+/).length;
            wordCount.textContent = `${words} words extracted`;
        }
    }

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
                // Save article locally for the saved articles tab
                chrome.storage.local.get(['savedArticles'], (result) => {
                    const savedArticles = result.savedArticles || [];
                    savedArticles.unshift({
                        ...articleData,
                        savedAt: new Date().toISOString()
                    });
                    
                    // Keep only the last 50 articles to prevent storage bloat
                    const trimmedArticles = savedArticles.slice(0, 50);
                    
                    chrome.storage.local.set({ savedArticles: trimmedArticles });
                });
                
                alert('Article saved successfully!');
                window.close(); // Close the popup on success
            } else {
                const errorMessage = response?.message || 'Unknown error occurred';
                console.error('Failed to save article:', errorMessage);
                alert(`Failed to save article: ${errorMessage}`);
            }
        });
    });

    // Settings functionality
    function loadSettings() {
        chrome.storage.sync.get(['apiEndpoint', 'autoFill', 'openaiApiKey'], (result) => {
            if (result.apiEndpoint) {
                apiEndpointInput.value = result.apiEndpoint;
            }
            if (result.autoFill !== undefined) {
                autoFillSelect.value = result.autoFill;
            }
            if (result.openaiApiKey) {
                openaiApiKeyInput.value = result.openaiApiKey;
            }
        });
    }

    function saveSettings() {
        const settings = {
            apiEndpoint: apiEndpointInput.value,
            autoFill: autoFillSelect.value,
            openaiApiKey: openaiApiKeyInput.value
        };
        
        chrome.storage.sync.set(settings, () => {
            if (chrome.runtime.lastError) {
                alert('Failed to save settings');
            } else {
                alert('Settings saved successfully!');
                // Refresh summarization button state if we're on that tab
                const activeTab = document.querySelector('.tab-pane.active');
                if (activeTab && activeTab.id === 'summarize-tab') {
                    initializeSummarizationTab();
                }
            }
        });
    }

    saveSettingsButton.addEventListener('click', saveSettings);

    // Saved articles functionality
    function loadSavedArticles() {
        chrome.storage.local.get(['savedArticles'], (result) => {
            const savedArticles = result.savedArticles || [];
            displaySavedArticles(savedArticles);
        });
    }

    function displaySavedArticles(articles) {
        const container = document.getElementById('saved-articles-list');
        
        if (articles.length === 0) {
            container.innerHTML = '<div class="no-articles">No articles saved yet.</div>';
            return;
        }

        container.innerHTML = articles.map(article => `
            <div class="article-item">
                <h4><a href="${article.link}" target="_blank">${article.title}</a></h4>
                <p><strong>Source:</strong> ${article.sourceName}</p>
                <p><strong>Date:</strong> ${article.publishedDate}</p>
                <p>${article.descriptionSnippet}</p>
            </div>
        `).join('');
    }

    // Copy article text to clipboard functionality
    async function copyArticleToClipboard() {
        try {
            copyArticleBtn.disabled = true;
            copyArticleBtn.style.opacity = '0.6';
            
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Check if the tab URL is supported
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('moz-extension://') || tab.url.startsWith('about:')) {
                showStatus('Cannot extract text from browser internal pages', 'error');
                return;
            }
            
            // Try to inject content script if it's not already there
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/content.js']
                });
            } catch (injectionError) {
                console.log('Content script injection attempt:', injectionError.message);
            }
            
            // Wait a bit for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Send message to content script to extract text
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
            
            if (response && response.success) {
                await navigator.clipboard.writeText(response.text);
                showStatus('Article text copied to clipboard!', 'success');
            } else {
                showStatus(response?.error || 'Failed to extract article text', 'error');
            }
        } catch (error) {
            console.error('Copy error:', error);
            showStatus('Error: ' + error.message, 'error');
        } finally {
            copyArticleBtn.disabled = false;
            copyArticleBtn.style.opacity = '1';
        }
    }

    // Handle summarize icon click - switch to summarize tab
    async function handleSummarizeClick() {
        try {
            // Switch to summarize tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Activate summarize pane directly (no tab button needed)
            const summarizeTabPane = document.getElementById('summarize-tab');
            
            if (summarizeTabPane) {
                summarizeTabPane.classList.add('active');
                
                // Initialize summarize tab
                initializeSummarizationTab();
            }
        } catch (error) {
            console.error('Summarize tab switch error:', error);
        }
    }

    // Refresh page info for Save Tool tab
    async function refreshPageInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (currentUrlDiv) currentUrlDiv.textContent = tab.url || '-';
            if (pageTitleDiv) pageTitleDiv.textContent = tab.title || '-';
            if (pageDomainDiv) pageDomainDiv.textContent = new URL(tab.url).hostname || '-';
            
            // Get word count
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/content.js']
                });
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
                if (response && response.success) {
                    const wordCount = response.text.trim().split(/\s+/).length;
                    if (pageWordCountDiv) pageWordCountDiv.textContent = `${wordCount} words`;
                } else {
                    if (pageWordCountDiv) pageWordCountDiv.textContent = 'Unable to count';
                }
            } catch (error) {
                if (pageWordCountDiv) pageWordCountDiv.textContent = 'Unable to count';
            }
        } catch (error) {
            console.error('Error refreshing page info:', error);
        }
    }

    // Validate article form
    function validateArticleForm() {
        const errors = [];
        
        if (!linkInput.value.trim()) errors.push('Article URL is required');
        if (!titleInput.value.trim()) errors.push('Article Title is required');
        if (!sourceNameInput.value.trim()) errors.push('Source Name is required');
        if (!publishedDateInput.value.trim()) errors.push('Published Date is required');
        
        // Check URL format
        try {
            new URL(linkInput.value);
        } catch (e) {
            errors.push('Article URL is not valid');
        }
        
        if (errors.length > 0) {
            alert('Validation Errors:\n' + errors.join('\n'));
        } else {
            alert('✅ Form validation passed! All required fields are filled correctly.');
        }
    }
});