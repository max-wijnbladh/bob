/**
 * Fetches messages from the last 7 days in a specified Google Chat space,
 * processing human messages and specific bot messages containing "Opportunity Update)",
 * and then processes them.
 *
 * @param {string} spaceName The resource name of the space (e.g., "spaces/AAAA_x3ZYqw").
 * @param {string} icon Optional: Icon URL for potential notifications.
 * @param {string} vector_url Optional: URL related to vector operations.
 * @param {string} account_name Optional: Account name for context.
 * @param {string} context Optional: Context string.
 * @param {function} next_steps Optional: Callback function for next steps.
 * @param {object} tips Optional: Tips object.
 * @param {boolean} execSummary Optional: Boolean for executive summary.
 * @return {boolean} Returns false if an error occurs or no relevant messages are found, otherwise implicit return upon successful processing.
 */
function getWeeklyMessages2(spaceName = "spaces/AAAADTV_G7g", icon = "", vector_url = "", account_name = "", context = "none", next_steps, tips, execSummary) {
  // Calculate the timestamp for 7 days ago.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startTime = sevenDaysAgo.toISOString();

  let allFetchedMessages = []; // Store all messages fetched initially
  let pageToken = null;

  try {
    // --- Fetch all messages (including bots) first ---
    do {
      // Use the Advanced Chat service to list messages.
      // https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list
      const response = Chat.Spaces.Messages.list(spaceName, {
        pageSize: 100, // Fetch max allowed to minimize API calls
        filter: `createTime > "${startTime}"`,
        pageToken: pageToken,
      });

      if (response.messages && response.messages.length > 0) {
        allFetchedMessages = allFetchedMessages.concat(response.messages);
      }
      // Continue fetching subsequent pages if nextPageToken exists.
      pageToken = response.nextPageToken;
    } while (pageToken);

    // --- Filter messages: Include human messages OR bot messages containing "Opportunity Update)" ---
    const relevantMessages = allFetchedMessages.filter(message => {
      if (!message.sender) return false; // Skip messages without a sender

      // Condition 1: Message is from a human
      if (message.sender.type !== 'BOT') {
        return true;
      }

      // Condition 2: Message is from a BOT AND contains "Opportunity Update)" in its text
      if (message.sender.type === 'BOT') {
        Logger.log(message)
        if (message.includes("Opportunity Update)")) {
          // If you want to "disguise" the bot sender, you could modify the sender property here.
          // However, the request was to just include it and not mention it's a bot.
          // So, simply returning true is enough for inclusion.
          // If downstream functions specifically check sender.type, you might need to adjust it:
          // Example: message.sender.type = 'HUMAN_EQUIVALENT'; // Or some other custom type
          // For now, we'll just include it as is, and the downstream logic should
          // process it based on its content rather than sender type if this is the goal.
          return true;
        }
      }
      return false; // Exclude other bot messages
    });

    // --- Check if any relevant messages remain ---
    if (relevantMessages.length === 0) {
      Logger.log(`No relevant messages (human or specified bot messages) found in the last 7 days for space: ${spaceName}`);
      // Optionally, call shareWeeklyDigest with a "no updates" message
      const summary = "No new relevant messages in the last 7 days."; // Or use your preferred "no updates" text
      if (typeof shareWeeklyDigest === 'function') { // Check if the function exists before calling
        return 0
        shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps);
      }
      return false; // Indicate no relevant messages were processed
    }

    // At this point, 'relevantMessages' contains:
    // 1. All messages from humans.
    // 2. Messages from bots that include "Opportunity Update)" in their message.text.

    // --- Original code to process messages would continue here using 'relevantMessages' ---
    Logger.log(`Found ${relevantMessages.length} relevant messages to process for space: ${spaceName}`);

    // Example of how you might pass these messages on (replace with your actual processing logic)
    if (typeof processMessagesFurther === 'function') { // Assuming you have a function to handle them
        processMessagesFurther(relevantMessages, spaceName, icon, vector_url, account_name, context, next_steps, tips, execSummary);
    } else {
        Logger.log("processMessagesFurther function not defined. Relevant messages logged above.");
        // Log the messages for debugging if no further processing function is defined
        relevantMessages.forEach(msg => {
            Logger.log(`Sender: ${msg.sender.displayName} (Type: ${msg.sender.type}), Text: ${msg.text ? msg.text.substring(0,100) + "..." : "[No Text]"}`);
        });
    }

    // return true; // Or whatever your function should return upon successful processing.
    // The original function had an implicit return on success, so keeping that.

  } catch (e) {
    Logger.log(`Error fetching or processing messages for space ${spaceName}: ${e.toString()}`);
    Logger.log(`Stack: ${e.stack}`);
    // Optionally, call shareWeeklyDigest with an error message
    const summary = `Error encountered while fetching weekly messages: ${e.toString()}`;
    if (typeof shareWeeklyDigest === 'function') { // Check if the function exists before calling
         shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps);
    }
    return false;
  }
}

// Placeholder for your downstream processing logic, if any, or if shareWeeklyDigest is called later
// function processMessagesFurther(messages, spaceName, icon, vector_url, account_name, context, next_steps, tips, execSummary) {
//   // Your logic to handle the filtered messages
//   Logger.log(`Processing ${messages.length} messages in processMessagesFurther for space ${spaceName}.`);
//   // For example, calling shareWeeklyDigest here if it wasn't called in the "no messages" case.
//   // const digestContent = createDigestFromMessages(messages); // You'd need to create this function
//   // if (typeof shareWeeklyDigest === 'function' && digestContent) {
//   //    shareWeeklyDigest(spaceName, digestContent, vector_url, icon, account_name, context, next_steps);
//   // }
// }

// Placeholder for the shareWeeklyDigest function, ensure it's defined in your script.
// function shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps) {
//    Logger.log(`Called shareWeeklyDigest for ${spaceName} with summary: ${summary}`);
//    // Actual implementation to share the digest
// }


function getWeeklyMessages(spaceName = "spaces/AAAA_x3ZYqw", icon = "test", vector_url = "test", account_name_param = "test", context = "none", next_steps_param = "", tips_param = "", execSummary_param = "") {
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
        // For BOT messages, check if it's the specific "Opportunity Update" card
        const opportunityCardText = getOpportunityUpdateTextFromCard(message);
        if (opportunityCardText) {
          Logger.log(`Including BOT message (Card Opportunity Update) from ${message.sender.displayName}: "${opportunityCardText.substring(0, 100)}..."`);
          formattedMessages.push({
            name: message.name,
            sender: {
              name: message.sender.name,
              displayName: message.sender.displayName,
              type: message.sender.type
            },
            createTime: message.createTime,
            // Prefix the extracted text for clarity in the summary input
            text: `Opportunity Update (from Bot Card): ${opportunityCardText}`,
            thread: message.thread ? { name: message.thread.name } : null,
          });
        }
        // You could add more 'else if' blocks here to handle other types of bot messages if needed
      }
    }

    // --- Check if any relevant messages remain ---
    if (formattedMessages.length === 0) {
        Logger.log(`No relevant human messages or structured 'Opportunity Update' bot cards found in the last 7 days for space: ${spaceName}`);
        const summaryText = "";
        if (summaryText = "")
          return 0
        if (typeof shareWeeklyDigest === 'function') {
             shareWeeklyDigest(spaceName, summaryText, vector_url, icon, account_name_param, context, next_steps_param, tips_param, execSummary_param);
        }
        return; // Exit if no relevant messages
    }

    const result = {
      messages: formattedMessages,
      space: spaceName,
    };

    Logger.log("Relevant messages processed (Human messages and structured Bot Opportunity Updates): " + JSON.stringify(result, null, 2));

    const summaryPrompt = `This is a Google Chat collaboration space, with members collaborating on a Google Workspace business opportunity. Summarise this Google Chat message history. The history includes messages from human participants and important 'Opportunity Update' notifications from bots (extracted from structured cards). Focus on discussion content and key updates. No need to go into exact detail, just an overview. Insert newlines where appropriate for readability.'\n\nChat History:\n${JSON.stringify(result)}`;

    let generatedSummary = "Summary generation failed or function not available.";
     if (typeof generate === 'function') {
        generatedSummary = generate(summaryPrompt);
     } else {
        Logger.log("Error: 'generate' function is not defined.");
     }

     if (typeof shareWeeklyDigest === 'function') {
        shareWeeklyDigest(spaceName, generatedSummary, vector_url, icon, account_name_param, context, next_steps_param, tips_param, execSummary_param);
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
  var docId = "1d7Y-2NN3sFsvQv0pyRC6dy3lgtA4_StHvuOce_1Qlrw";
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var date = new Date();

  // Format the date and week number
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  var formattedDate = date.toLocaleDateString("en-US", options);
  var weekNumber = getWeekNumber(date);

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

