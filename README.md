# Project Readme

Get started by customizing your environment (defined in the .idx/dev.nix file) with the tools and IDE extensions you'''ll need for your project!

Learn more at https://developers.google.com/idx/guides/customize-idx-env

---

## Key Functions

This Google Apps Script project is designed to streamline your workflow by integrating and summarizing information from various Google services. Here are some of the core functions that power this automation:

### Information Aggregation & Summarization

*   **`generate` (via an external API):** This is a powerful, general-purpose function used throughout the script to summarize and rephrase text using a generative AI model. It takes a natural language prompt and returns a summarized or transformed text. For example, it'''s used to:
    *   Summarize upcoming Google Calendar meetings (`Code.js`, `Snipper.js`).
    *   Summarize recently updated Google Tasks (`Code.js`, `Snipper.js`).
    *   Generate concise overviews of business opportunities.

### Google Chat Integration

*   **`shareWeeklyDigest` (`Digest.js`):** This function is responsible for creating and posting a rich, informative card to a specified Google Chat space. The card includes:
    *   An AI-generated summary of recent activities.
    *   An overview of the opportunity.
    *   Key next steps.
    *   Helpful tips from Gemini.
    *   Buttons that link out to more detailed resources like a "Vector" or an "Executive Summary."

*   **`createFeedCard2` (`Feed.js`):** Similar to the weekly digest, this function creates a detailed card for a Google Chat space, focusing on a specific opportunity update. It includes a header with the account name and an icon, and a collapsible section with the summary.

*   **`findOrCreateChatSpace` (`Chat.js`):** This utility function ensures that a dedicated Google Chat space exists for a given topic. It first searches for a space by name, and if one isn'''t found, it automatically creates a new one and locks down the permissions.

### Authentication & Security

*   **`getToken_` (`Auth.js`):** This function securely handles authentication. It retrieves a service account'''s credentials (which are stored as secure script properties, not in the code) and uses them to obtain a short-lived OAuth2 token for making secure API calls to Google services.

*   **`setServiceAccountEmail` (`Auth.js`):** A one-time setup function that allows a developer to securely store the service account email as a script property, keeping it out of the version-controlled code.

## Sales Automation and Intelligence Features

This project appears to be a sophisticated sales automation and intelligence tool built using Google Apps Script. It integrates with Google Workspace (Chat, Docs, Sheets, Calendar) and a generative AI model to streamline common sales and pre-sales workflows.

Here’s a breakdown of what the code does, specifically for a sales context:

### Core Function: AI-Powered Summarization

*   **`Generate.js` / `Gemini.js`**: These files are the engine of the whole system. They contain a function called `generate` that connects to a powerful AI model. This function is used throughout the code to read, understand, and summarize text. For example, it can take a long, messy block of notes and turn it into a concise, easy-to-read summary.

### Key Sales-Related Features:

1.  **Opportunity & Data Hygiene (`Hygiene.js`)**:
    *   The `postHygienePost` function automatically monitors your sales data (likely from a CRM like Salesforce, referred to as "Vector").
    *   It specifically looks for opportunities that are missing critical information, such as the "Business Need".
    *   When it finds one, it automatically posts a "Vector Hygiene" alert card in a Google Chat space. This prompts the sales team to update the opportunity record, ensuring data quality and helping everyone stay informed on why a deal is being pursued.

2.  **Streamlining Engagement Requests (`ERs.js`)**:
    *   When a salesperson needs support from a customer engineer, they submit an "Engagement Request" (ER) with many details.
    *   The `createDescription` function takes all these details, uses the `generate` AI function to summarize them into a clean, natural-language paragraph, and returns it. This saves the customer engineer time and helps them quickly grasp the essence of the opportunity.

3.  **Automated Deal-Flow Updates (`Feed.js`)**:
    *   This script can compare different versions of your opportunity pipeline (e.g., from a Google Sheet).
    *   It automatically detects changes to important fields like `stage_name`, `next_step`, or `deal_blocker`.
    *   When a change is found, it uses the AI to generate a one-sentence summary of what happened (e.g., "The deal stage was updated from '''Discovery''' to '''Proposal'''"). It then posts this update as a card to a Google Chat space to keep the team informed in real-time.

4.  **Weekly Sales Digests (`Digest.js`)**:
    *   The `shareWeeklyDigest` function creates a comprehensive weekly summary card and posts it to Google Chat.
    *   This card includes an AI-generated overview of the week'''s activities, a summary of a key opportunity, and important next steps. It'''s designed to keep the entire sales team aligned and informed without needing to manually compile the information.

5.  **Archiving Lost Opportunities (`NFTF.js`)**:
    *   When an opportunity is lost or removed from the pipeline, the `archiveRemovedOpportunity` function automatically creates a Google Doc.
    *   This document serves as an archive, containing the opportunity'''s final details and a complete history of all its updates. This is valuable for future win/loss analysis and record-keeping.
