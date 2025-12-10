/**
 * Shares a weekly digest card in a Google Chat space.
 * 
 * @param {string} spaceName The resource name of the space to post to.
 * @param {string} summary The AI-generated summary of recent updates.
 * @param {string} vector_url URL for the 'Vector' button.
 * @param {string} icon URL for the header icon.
 * @param {string} account_name The subtitle for the card header.
 * @param {string} context Additional context (currently unused).
 * @param {string} next_steps The next steps text.
 * @param {string} tips The tips from Gemini text.
 * @param {string} execSummary URL for the 'Executive Summary' button.
 * @param {string} overview The text for the new Overview section.
 * @returns {boolean} True on success.
 */
function shareWeeklyDigest(spaceName = "spaces/AAAA_x3ZYqw", summary = "", vector_url = "test", icon = "test", account_name = "test", context = "test", next_steps = "test", tips, execSummary = "google.com", overview = "Test") {
  const token = getToken_();

  if (summary === "") {
    return;
  }

  const message = {
    cardsV2: [{
      card: {
        header: {
          title: "Monday Recap",
          subtitle: account_name,
          imageUrl: icon
        },
        sections: [
          {
            header: "Overview",
            widgets: [{ textParagraph: { text: overview } }]
          },
          {
            header: "Recent updates",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: summary, maxLines: 10 } }]
          },
          {
            header: "Next steps",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: next_steps, maxLines: 10 } }]
          },
          {
            header: "Tips from Gemini",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: tips, maxLines: 10 } }]
          },
          {
            widgets: [{
              buttonList: {
                buttons: [
                  {
                    text: "Vector",
                    icon: { knownIcon: "OPEN_IN_NEW" },
                    onClick: { openLink: { url: vector_url } }
                  },
                  {
                    text: "Executive Summary",
                    icon: { knownIcon: "DESCRIPTION" },
                    onClick: { openLink: { url: execSummary } }
                  }
                ]
              }
            }]
          }
        ]
      }
    }]
  };

  Chat.Spaces.Messages.create(message, spaceName, {}, { 'Authorization': 'Bearer ' + token });
  return true;
}

/**
 * Shares a monthly opportunity digest in a Google Chat space.
 * 
 * @param {string} account_name The name of the account.
 * @param {string} overview An overview of the opportunity.
 * @param {string} icon An icon URL.
 * @param {string} spaceName The name of the chat space.
 * @param {string} activities A summary of activities.
 * @param {string} vector_url A URL for a vector image.
 * @param {string} next_steps The next steps for the opportunity.
 * @returns {boolean} True on success.
 */
function shareDigest(account_name, overview, icon, spaceName, activities, vector_url, next_steps) {
  const token = getToken_();
  spaceName = spaceName || "spaces/AAAA_x3ZYqw";

  const prompt = `We have an ongoing Google Workspace business deal with a company. Based on the following details, provide a suggestion on how we can win the customer. Keep it concise, actionable, and formatted as plain text with double newlines. No intro text, just the suggestion: ${overview} ${next_steps} ${activities}`;
  const suggestion = gemini(prompt, "gemini-2.0-flash-thinking-exp-01-21");

  const message = {
    cardsV2: [{
      cardId: "uniqueCardId",
      card: {
        header: {
          title: "Monthly Opportunity Digest",
          subtitle: account_name,
          imageUrl: icon,
          imageAltText: "Avatar for Monthly Digest",
        },
        sections: [
          {
            header: "Overview",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: overview, maxLines: 3 } }]
          },
          {
            header: "Activities",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: activities, maxLines: 3 } }]
          },
          {
            header: "Next Steps",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: next_steps, maxLines: 3 } }]
          },
          {
            header: "Gemini Suggestion",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [{ textParagraph: { text: suggestion, maxLines: 3 } }]
          },
        ],
      }
    }]
  };

  Chat.Spaces.Messages.create(message, spaceName, {}, { 'Authorization': 'Bearer ' + token });
  return true;
}
