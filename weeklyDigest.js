
function getWeeklyMessages(spaceName = "spaces/AAAA_x3ZYqw", icon = "test", vector_url = "test", account_name_param = "test", context = "none", next_steps_param = "", tips_param = "", execSummary_param = "", overview = "overview test") {
  // Note: renamed some input parameters like account_name to account_name_param to avoid conflict
  // if these names are also used as global variables for card creation elsewhere.

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startTime = sevenDaysAgo.toISOString();

  let allFetchedMessages = [];
  let pageToken = null;

  // Helper function to extract summary text from the specific "Opportunity Update" card
  function getOpportunityUpdateTextFromCard(message) {
    try {
      if (message.cardsV2 && Array.isArray(message.cardsV2) && message.cardsV2.length > 0) {
        for (const cardItem of message.cardsV2) { // Iterate through cards in cardsV2
          if (cardItem.card && cardItem.card.sections && Array.isArray(cardItem.card.sections)) {
            for (const section of cardItem.card.sections) { // Iterate through sections
              // Check if the section header is "Opportunity Update"
              if (section && section.header === "Opportunity Update") {
                // The summary text is expected in the first widget of this section
                if (section.widgets && Array.isArray(section.widgets) && section.widgets.length > 0 &&
                    section.widgets[0].textParagraph &&
                    typeof section.widgets[0].textParagraph.text === 'string') {
                  return section.widgets[0].textParagraph.text; // This is the 'summary' from your card structure
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Log error if parsing the card fails, but don't let it stop the whole process
      Logger.log(`Error parsing card for Opportunity Update for message ${message.name}: ${e.toString()}`);
    }
    return null; // Return null if not the specific card or text not found
  }

  try {
    // --- Fetch all messages (including bots) first ---
    do {
      const response = Chat.Spaces.Messages.list(spaceName, {
        pageSize: 100,
        filter: `createTime > "${startTime}"`,
        pageToken: pageToken,
      });

      if (response.messages && response.messages.length > 0) {
        allFetchedMessages = allFetchedMessages.concat(response.messages);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    const formattedMessages = [];
    for (const message of allFetchedMessages) {
      if (!message.sender) continue; // Skip messages without sender information

      if (message.sender.type === 'HUMAN') {
        // Process human messages, ensure there's text content
        if (message.text && message.text.trim() !== "") {
          formattedMessages.push({
            name: message.name,
            sender: {
              name: message.sender.name,
              displayName: message.sender.displayName,
              type: message.sender.type
            },
            createTime: message.createTime,
            text: message.text, // Use direct text for human messages
            thread: message.thread ? { name: message.thread.name } : null,
          });
        }
} else if (message.sender.type === 'BOT') {
        // Check for different types of bot cards
        const opportunityCardText = getOpportunityUpdateTextFromCard(message);
        const meetingDebriefText = getMeetingDebriefTextFromCard(message); // <<< Call the new helper

        let botMessageText = null;
        let logMessage = "";

        if (opportunityCardText) {
          botMessageText = `Opportunity Update: ${opportunityCardText}`;
          logMessage = `Including BOT message (Opportunity Update) from ${message.sender.displayName}`;
        } else if (meetingDebriefText) {
          botMessageText = `Meeting Info: ${meetingDebriefText}`;
          logMessage = `Including BOT message (Meeting Debrief) from ${message.sender.displayName}`;
        }

        // If we found text from a recognized bot card, add it to our list
        if (botMessageText) {
          Logger.log(`${logMessage}: "${botMessageText.substring(0, 100)}..."`);
          formattedMessages.push({
            name: message.name,
            sender: {
              name: message.sender.name,
              displayName: message.sender.displayName,
              type: 'BOT_UPDATE' // Use a custom type for clarity in the prompt
            },
            createTime: message.createTime,
            text: botMessageText,
            thread: message.thread ? { name: message.thread.name } : null,
          });
        }
      }
    }

    // --- Check if any relevant messages remain ---
    if (formattedMessages.length === 0) {
        Logger.log(`No relevant human messages or structured 'Opportunity Update' bot cards found in the last 7 days for space: ${spaceName}`);
        return
    }

    const result = {
      messages: formattedMessages,
      space: spaceName,
    };

    Logger.log("Relevant messages processed (Human messages and structured Bot Opportunity Updates): " + JSON.stringify(result, null, 2));

    const summaryPrompt = `This is a Google Chat collaboration space, with members collaborating on a Google Workspace business opportunity. Summarise this Google Chat message history. The history includes messages from human participants and important 'Opportunity Update' notifications from bots (extracted from structured cards). Focus on discussion content and key updates, and dont introduce what the space is or any other of the other instructions youve been given. Dont say whether its a human or bot that has written something. If its an opportunity update, just say what the update as related to the opportunity, dont say its a bot just focus on the update content and impact to the opportunity. No need to go into exact detail of every event, just an overview. Insert newlines where appropriate for readability.'\n\nChat History:\n${JSON.stringify(result)}`;

    let generatedSummary = "Summary generation failed or function not available.";
     if (typeof generate === 'function') {
        generatedSummary = generate(summaryPrompt);
     } else {
        Logger.log("Error: 'generate' function is not defined.");
     }

     if (typeof shareWeeklyDigest === 'function') {
        shareWeeklyDigest(spaceName, generatedSummary, vector_url, icon, account_name_param, context, next_steps_param, tips_param, execSummary_param, overview);
     } else {
         Logger.log("Error: 'shareWeeklyDigest' function is not defined.");
     }

  } catch (error) {
    Logger.log(`An error occurred in getWeeklyMessages: ${error}\nStack: ${error.stack}`);
    return false;
  }
}

// --- Helper/Placeholder Functions (ensure these are defined in your script) ---

// function generate(prompt) {
//   Logger.log("Generating summary with prompt: " + prompt);
//   // Replace with your actual implementation (e.g., call to Gemini API)
//   return "Placeholder summary based on provided human messages.";
// }

// function shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps) {
//    Logger.log(`Sharing digest for ${spaceName}: ${summary}`);
//   // Replace with your actual implementation (e.g., posting a message to the chat space)
// }

function appendWeeklyDigest(text) {
  const docId = PropertiesService.getScriptProperties().getProperty('WEEKLY_DIGEST_DOC_ID') || "1d7Y-2NN3sFsvQv0pyRC6dy3lgtA4_StHvuOce_1Qlrw";
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const date = new Date();

  // Format the date and week number
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date.toLocaleDateString("en-US", options);
  const weekNumber = getWeekNumber(date);

  // Insert the header at the top
  body.insertParagraph(0, "Weekly Digest - Week " + weekNumber + ", " + formattedDate).setHeading(DocumentApp.ParagraphHeading.HEADING1);

  // Insert the text below the header
  body.insertParagraph(1, text);

  // Insert the separator below the text
  body.insertParagraph(2, "---");
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

/**
 * Helper function to extract summary and next steps from a "Meeting Debrief" card.
 * @param {object} message The full message object from the Chat API.
 * @returns {string|null} A formatted string with the debrief content, or null if it's not a debrief card.
 */
function getMeetingDebriefTextFromCard(message) {
  try {
    if (message.cardsV2 && Array.isArray(message.cardsV2) && message.cardsV2.length > 0) {
      for (const cardItem of message.cardsV2) {
        const card = cardItem.card;
        // Check if this is the right type of card by looking at the header title
        if (card && card.header && card.header.title === "Meeting Debrief") {
          let summary = "Summary not provided.";
          let nextSteps = "Next steps not provided.";
          
          if (card.sections && Array.isArray(card.sections)) {
            // Find the summary section and get its text
            const summarySection = card.sections.find(s => s.header === "Meeting Summary");
            if (summarySection && summarySection.widgets[0].textParagraph) {
              summary = summarySection.widgets[0].textParagraph.text;
            }
            
            // Find the next steps section and get its text
            const nextStepsSection = card.sections.find(s => s.header === "Next Steps" || s.header === "Action Items");
            if (nextStepsSection && nextStepsSection.widgets[0].textParagraph) {
              nextSteps = nextStepsSection.widgets[0].textParagraph.text;
            }
          }
          // Return a single, descriptive string for the AI to summarize
          return `A meeting was held around the following: "${card.header.subtitle}". Summary: ${summary}. Next Steps: ${nextSteps}.`;
        }
      }
    }
  } catch (e) {
    Logger.log(`Error parsing Meeting Debrief card: ${e.toString()}`);
  }
  return null; // Return null if it's not a debrief card or parsing fails
}
