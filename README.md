# TempMail Chrome Extension

TempMail is a lightweight Chrome extension that allows you to instantly generate temporary email addresses and receive messages directly within your browser. It helps you protect your primary email from spam, bots, and phishing by providing disposable email addresses for one-time use.

## Features

- **Instant Email Generation**: Automatically creates a new temporary email address upon installation or when requested.
- **Real-time Inbox**: Checks for new messages and updates the inbox instantly.
- **Background Notifications**: Get notified of incoming emails even when the extension popup is closed.
- **Privacy Focused**: No personal information required. Emails are disposable.
- **Easy Management**:
  - **Copy** address to clipboard with one click.
  - **Refresh** inbox manually or auto-poll in the background.
  - **Delete** current address and generate a new one instantly.
- **Detailed View**: Read the full content of incoming emails including subject, sender, and body.

## Installation (Local Development)

To install this extension locally on your Chrome browser, follow these steps:

1.  **Prepare the Files**
    Ensure you have the source code files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `icons/`, etc.) in a folder (e.g., `ema`).

2.  **Open Chrome Extensions Page**
    - Open Google Chrome.
    - Type `chrome://extensions/` in the address bar and press Enter.
    - Alternatively, click the three-dot menu icon (top right) > **Extensions** > **Manage Extensions**.

3.  **Enable Developer Mode**
    - Toggle the **Developer mode** switch in the top right corner of the Extensions page to **ON**.

4.  **Load Unpacked Extension**
    - Click the **Load unpacked** button that appears in the top left.
    - Browse to and select the directory containing this extension's files (the `ema` folder).
    - Click **Select** (or **Open**).

5.  **Pin and Use**
    - The **TempMail** icon should now appear in your browser's toolbar.
    - Click the jigsaw piece icon (Extensions) in the toolbar and click the "Pin" icon next to **TempMail** for easy access.
    - Click the extension icon to open the popup. It will automatically generate a temporary email address for you.

## How it Works

This extension communicates with the [mail.tm](https://mail.tm/) API to:
1.  Create a temporary account/domain.
2.  Authenticate and retrieve an access token.
3.  Poll for new messages using Chrome Alarms and Background Workers.
