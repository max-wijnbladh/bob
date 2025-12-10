# Project Readme

Get started by customizing your environment (defined in the .idx/dev.nix file) with the tools and IDE extensions you'll need for your project!

Learn more at https://developers.google.com/idx/guides/customize-idx-env

---

## Key Functions

This Google Apps Script project is designed to streamline your workflow by integrating and summarizing information from various Google services. Here are some of the core functions that power this automation:

### Information Aggregation & Summarization

*   **`generate` (via an external API):** This is a powerful, general-purpose function used throughout the script to summarize and rephrase text using a generative AI model. It takes a natural language prompt and returns a summarized or transformed text. For example, it's used to:
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

*   **`findOrCreateChatSpace` (`Chat.js`):** This utility function ensures that a dedicated Google Chat space exists for a given topic. It first searches for a space by name, and if one isn't found, it automatically creates a new one and locks down the permissions.

### Authentication & Security

*   **`getToken_` (`Auth.js`):** This function securely handles authentication. It retrieves a service account's credentials (which are stored as secure script properties, not in the code) and uses them to obtain a short-lived OAuth2 token for making secure API calls to Google services.

*   **`setServiceAccountEmail` (`Auth.js`):** A one-time setup function that allows a developer to securely store the service account email as a script property, keeping it out of the version-controlled code.
