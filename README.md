# Google Apps Script Sales Automation Project

This Google Apps Script project provides a suite of tools to automate and enhance sales workflows within Google Workspace. It leverages generative AI to summarize information, integrates with Google Chat for real-time updates, and helps maintain data hygiene in your sales processes.

## Features

*   **AI-Powered Summarization:** Utilizes generative AI to create concise summaries of meeting notes, engagement requests, and opportunity updates.
*   **Google Chat Integration:** Delivers automated updates, digests, and alerts to designated Google Chat spaces.
*   **Sales Data Hygiene:** Monitors sales data for completeness and prompts teams to fill in missing information.
*   **Automated Reporting:** Generates weekly digests and archives lost opportunities for future analysis.
*   **Secure Authentication:** Employs OAuth2 for secure communication with Google APIs.

## Project Structure

The project is organized into the following modules:

*   **`Generate.js`**: Core module for interacting with the generative AI model.
*   **`Digest.js`**: Generates and shares a weekly digest of sales activities.
*   **`Feed.js`**: Posts real-time updates on deal flow to Google Chat.
*   **`Hygiene.js`**: Monitors and alerts on data hygiene issues in sales records.
*   **`ERs.js`**: Streamlines the creation of Engagement Requests by summarizing details.
*   **`NFTF.js`**: Archives details of lost opportunities into Google Docs.
*   **`Chat.js`**: Manages the creation and retrieval of Google Chat spaces.
*   **`TechWin.js`**: (Purpose to be clarified, seems to be for creating tables or formatted content).
*   **`Snippets.js`**: (Purpose to be clarified, seems to contain reusable snippets).
*   **`Auth.js`**: Handles authentication with Google Cloud services.
*   **`setup.js`**: Contains a one-time setup function for configuring the service account.
*   **`Utils.js`**: (Purpose to be clarified, likely contains utility functions).

## Setup

1.  **Service Account:**
    *   Create a Google Cloud Service Account with the required permissions for Google Chat, Google Docs, and any other integrated services.
    *   Enable the IAM Credentials API for the project.

2.  **Configuration:**
    *   Run the `setServiceAccountEmail` function from the `setup.js` module in the Apps Script editor, passing your service account's email address as an argument. This will securely store the email as a script property.

    '''javascript
    // Run this once in the Apps Script editor
    setServiceAccountEmail('your-service-account-email@your-project.iam.gserviceaccount.com');
    '''

3.  **Triggers:**
    *   Set up time-based or event-based triggers in the Apps Script editor to run the desired automation functions (e.g., `shareWeeklyDigest`, `postHygienePost`) on a schedule.

## Usage

Once configured, the scripts will run automatically based on the triggers you've set. You can also manually run functions from the Apps Script editor for testing or on-demand execution.

---
*This README was last updated by an AI assistant.*