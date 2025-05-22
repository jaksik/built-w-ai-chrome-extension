# Article Saver Extension

## Overview
The Article Saver Extension is a Google Chrome extension designed to simplify the process of saving articles to a database. With a single click, users can capture essential information about an article, including its URL, title, publisher, and publish date, and submit it directly to a database using Mongoose.

## Features
- Easy-to-use popup form for entering article details.
- Automatically retrieves the current tab's URL.
- Option to extract additional information from the webpage.
- Submits data to a MongoDB database.

## Project Structure
```
article-saver-extension
├── src
│   ├── manifest.json
│   ├── popup
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── content
│   │   └── content.ts
│   ├── background
│   │   └── background.ts
│   └── types
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Installation
1. Clone the repository to your local machine.
2. Navigate to the `article-saver-extension` directory.
3. Install the necessary dependencies using npm:
   ```
   npm install
   ```
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the `src` directory.

## Usage
1. Click on the extension icon in the Chrome toolbar.
2. The popup will appear, pre-filled with the article's URL and other details.
3. Fill in any additional information if necessary.
4. Click the "Submit" button to save the article to the database.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.