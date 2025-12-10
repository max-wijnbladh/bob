/**
 * Updates the description of a Google Chat space with opportunity information.
 *
 * @param {string} spaceName The name of the space to update (e.g., "spaces/xyz").
 * @param {object} opportunityData An object containing the opportunity information.
 * Example: {
 * name: "Acme Corp Deal",
 * stage: "Proposal",
 * value: 120000,
 * closeDate: "2024-12-31",
 * notes: "Customer is very interested."
 * }
 * @returns {boolean} True if the update was successful, false otherwise.
 */
/**
 * Updates the description of a Google Chat space with opportunity information.
 *
 * @param {string} spaceName The name of the space to update (e.g., "spaces/xyz").
 * @param {object} opportunityData An object containing the opportunity information.
 * Example: {
 * name: "Acme Corp Deal",
 * stage: "Proposal",
 * value: 120000,
 * closeDate: "2024-12-31",
 * notes: "Customer is very interested."
 * }
 * @returns {boolean} True if the update was successful, false otherwise.
 */
function updateSpaceDescriptionWithOpportunityData(spaceName, opportunityData) {
  if (!spaceName) {
    Logger.log("Error: spaceName is null or undefined.");
    return false;
  }

  if (!opportunityData) {
    Logger.log("Error: opportunityData is null or undefined.");
    return false;
  }

  Logger.log("Opportunity Data: ", opportunityData);


  const newDescription = generate("Summarise this opportunity in 150 characters maximum but keep the same sections, use natural language and no asterisks. It should be easy to read: " + opportunityData);
  Logger.log("Generated Description: ", newDescription);
  return

  try {
    // Get the current space.  This is important to get all space properties.
    const space = Chat.Spaces.get(spaceName);
    if (!space) {
      Logger.log(`Error: Space not found with name: ${spaceName}`);
      return false;
    }

    // Update the space object.  Crucially, update the existing object.
    space.spaceDetails = {
      description: newDescription,
    };

    // Update the space with the new description.  Now passing the modified space object.
    const updatedSpace = Chat.Spaces.patch(
      space,
      spaceName,
      { updateMask: 'spaceDetails' } // Corrected updateMask
    );

    if (updatedSpace) {
      Logger.log(`Space description updated successfully for: ${spaceName}`);
      return true;
    } else {
      Logger.log(`Error: Failed to update space description for: ${spaceName}`);
      return false;
    }
  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    Logger.log(`Space Name: ${spaceName}`);
    return false;
  }
}


/**
 * Example usage: Updates a space description with sample opportunity data.
 */
function testUpdateSpaceDescription() {
  // Replace with your actual space name.
  const spaceName = "spaces/AAAAgplQfbU"; // <-- *** REPLACE THIS WITH YOUR SPACE ID ***

  // Sample opportunity data.  Replace with actual data from AppSheet.
  const opportunityData = "Large enterprise deal"

  const success = updateSpaceDescriptionWithOpportunityData(spaceName, opportunityData);

  if (success) {
    Logger.log("Space description updated successfully.");
  } else {
    Logger.log("Failed to update space description.");
  }
}


/**
 * Example usage: Updates a space description with sample opportunity data.
 */
function testUpdateSpaceDescription() {
  // Replace with your actual space name.
  const spaceName = "spaces/AAAAgplQfbU"; // <-- *** REPLACE THIS WITH YOUR SPACE ID ***

  // Sample opportunity data.  Replace with actual data from AppSheet.
  const opportunityData = {
    name: "Large Enterprise Deal",
    stage: "Negotiation",
    value: 250000,
    closeDate: "2025-03-15",
    notes: "Customer is reviewing the contract.  Follow up next week.",
  };

  const success = updateSpaceDescriptionWithOpportunityData(spaceName, opportunityData);

  if (success) {
    Logger.log("Space description updated successfully.");
  } else {
    Logger.log("Failed to update space description.");
  }
}


/**
 * Opens a Google Drive file by its ID and retrieves its content as a string,
 * handling different file types appropriately, using Apps Script Advanced Services.
 *
 * @param {string} fileId The ID of the Google Drive file.
 * @returns {string|null} The content of the file, or null if an error occurs or the file type is unsupported.
 */
function getDriveFileContentAdvanced(fileId) {
  try {
    file = Drive.Files.get(fileId)
    Logger.log(file)
    const mimeType = file.mimeType;
    Logger.log(mimeType)

    if (mimeType === MimeType.GOOGLE_DOCS) {
      // Google Docs: Export as plain text.
      return Drive.Files.export(fileId, 'text/plain', {
          fields: 'data'
      }).data;


    } else if (mimeType === MimeType.GOOGLE_SHEETS) {
      // Google Sheets: Export as CSV.
       return Drive.Files.export(fileId, 'text/csv', {
          fields: 'data'
      }).data;

    } else if (mimeType === MimeType.GOOGLE_SLIDES) {
      // Google Slides: Export as plain text.
      return Drive.Files.export(fileId, 'text/plain', {
          fields: 'data'
      }).data;

    } else if (mimeType === MimeType.GOOGLE_DRAWINGS) {
      // Google Drawings: Export as SVG
      return Drive.Files.export(fileId, 'image/svg+xml', {
          fields: 'data'
      }).data;

    } else if (mimeType === MimeType.PDF) {
      // PDF: Use OCR.
      const updatedFile = Drive.Files.update({}, fileId, null, {
        ocr: true,
        ocrLanguage: 'en', // Optional, defaults to English
        fields: 'id' // Only request the ID in the response.
      });
      // We need to *re-fetch* the file to get the extracted text content *after* OCR.
      const ocrFile = Drive.Files.get(updatedFile.id); // Get the *updated* file.
      return ocrFile.exportLinks['text/plain']; //Directly fetching the url to the OCR'd text
    } else if (mimeType.startsWith('text/')) {
      // Plain text: Get content directly (using Advanced Service).
        const response = UrlFetchApp.fetch(file.downloadUrl, {
            headers: {
                Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
            }
        });
        return response.getContentText();

    }  else if (mimeType.startsWith('image/')) {  // Handle images
        return "Image files are not supported for text extraction in this script. MimeType: " + mimeType;
    }
     else {
      // Unsupported file type.
      Logger.log(`Unsupported file type: ${mimeType}`);
      return `Unsupported file type: ${mimeType}`;
    }

  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    Logger.log(`File ID: ${fileId}`);
    return null;
  }
}

/**
 * Example usage: Gets the content of a Drive file and logs it.
 */
function testGetDriveFileContentAdvanced() {
  // Replace with the actual Drive file ID.
  const fileId = "1cTxvNbG66n76PbLc14YCYhbXjgcwfyB7VdPqJNexqms"; // <-- *** REPLACE THIS WITH YOUR FILE ID ***

  const content = getDriveFileContentAdvanced(fileId);

  if (content) {
    Logger.log(content);
  } else {
    Logger.log("Could not retrieve file content.");
  }
}


  /**
 *  !!! IMPORTANT !!!  Enable the Google Drive API Advanced Service
 *
 *  Before running this script, you MUST manually enable the Google Drive API
 *  as an Advanced Service in your Apps Script project.  Follow these steps:
 *
 *  1. In the Apps Script editor, click on "Services" in the left-hand menu (the "+" icon).
 *  2. Scroll down the list to find "Drive API".
 *  3. Click "Add".
 *
 *  If you do not enable the Advanced Service, the `Drive` object will be undefined.
 */
    function enableDriveAdvancedService(){
        Logger.log("Please enable the Google Drive API Advanced Service manually in the Services menu.");
        Logger.log("1. Click the '+' icon next to 'Services' in the left-hand menu.");
        Logger.log("2. Find 'Drive API' in the list.");
        Logger.log("3. Click 'Add'.");
    }


function getDriveFileIdFromRecentMessages(spaceName = "spaces/AAAADTV_G7g") {
  // Calculate the timestamp for 5 minutes ago.
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 120);
  const startTime = fiveMinutesAgo.toISOString();

  let driveFileId = null;

  try {
    // Use the Advanced Chat service to list messages.
    const response = Chat.Spaces.Messages.list(spaceName, {
      pageSize: 100, // Adjust as needed, but typically 100 is sufficient for a 5-minute window.
      filter: `createTime > "${startTime}"`,
    });

    if (response.messages && response.messages.length > 0) {
      // Iterate through the messages in reverse chronological order (most recent first).
      for (let i = response.messages.length - 1; i >= 0; i--) {
        const message = response.messages[i];
        Logger.log(message)

        // Check if the message has attachments.
        if (message.attachment && message.attachment.length > 0) {
          // Iterate through attachments (though usually there's only one).
          for (const attachment of message.attachment) {
            // Check if the attachment is a Drive file.
            if (attachment.source === "DRIVE_FILE" && attachment.driveDataRef && attachment.driveDataRef.driveFileId) {
              driveFileId = attachment.driveDataRef.driveFileId;
              // Exit the loops since we found a Drive file ID.
              break; // Exit inner loop (attachments)
            }
          }
          if (driveFileId) {
              break; // Exit outer loop (messages). We have what we need
          }
        }
      }
    }
    Logger.log(driveFileId)
    getDriveFileContentAdvanced(driveFileId)
    return driveFileId;

  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    return null;
  }
}



/**
 * Example usage: Retrieves the Drive file ID from recent messages in a specific space and logs it.
 */
function testGetDriveFileId() {
  // Replace "spaces/YOUR_SPACE_ID" with the actual space ID.
  const spaceId = "spaces/AAAADTV_G7g";  //  <-- *** REPLACE THIS WITH YOUR SPACE ID ***

  const fileId = getDriveFileIdFromRecentMessages(spaceId);

  if (fileId) {
    Logger.log(`Drive File ID: ${fileId}`);
  } else {
    Logger.log("No Drive attachments found in the last 5 minutes, or an error occurred.");
  }
}


/**
 *  !!! IMPORTANT !!!  Enable the Google Chat API Advanced Service
 *
 *  Before running this script, you MUST manually enable the Google Chat API
 *  as an Advanced Service in your Apps Script project.  Follow these steps:
 *
 *  1. In the Apps Script editor, click on "Services" in the left-hand menu (the "+" icon).
 *  2. Scroll down the list to find "Google Chat API".
 *  3. Click "Add".
 *
 *  If you do not enable the Advanced Service, the `Chat` object will be undefined,
 *  and you will get an error like:  `ReferenceError: Chat is not defined`
 */
function enableChatAdvancedService() {
   // This function is intentionally left blank. The user must manually enable the service.
  Logger.log("Please enable the Google Chat API Advanced Service manually in the Services menu.");
  Logger.log("1. Click the '+' icon next to 'Services' in the left-hand menu.");
  Logger.log("2. Find 'Google Chat API' in the list.");
  Logger.log("3. Click 'Add'.");
}



function getChatMessagesLast7DaysAdvanced(spaceName = "spaces/AAAA_x3ZYqw", icon = "", vector_url = "", account_name = "", context = "none", next_steps) {
  // Calculate the timestamp for 14 days ago.
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);
  const startTime = fourteenDaysAgo.toISOString();

  let messages = [];
  let pageToken = null;

  try {
    do {
      // Use the Advanced Chat service to list messages.
      // This corresponds to the spaces.messages.list method:
      // https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/list
      const response = Chat.Spaces.Messages.list(spaceName, {
        pageSize: 100,
        filter: `createTime > "${startTime}"`,
        pageToken: pageToken, // Use pageToken for subsequent requests.
      });

      if (response.messages && response.messages.length > 0) {
        messages = messages.concat(response.messages);
      }
      else {
        return false
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    // Create the final JSON object.
    const formattedMessages = messages.map(message => ({
      name: message.name,
      sender: message.sender,
      createTime: message.createTime,
      text: message.text,
      thread: message.thread,
      annotations: message.annotations,
      cards: message.cards,
      cardsV2: message.cardsV2,
      attachment: message.attachment,
      slashCommand: message.slashCommand,
      actionResponse: message.actionResponse,
      argumentText: message.argumentText
    }));

    const result = {
      messages: formattedMessages,
      space: spaceName,
    };
    Logger.log("Space text: " + result)
    summary = (generate("This is a Google Chat collaboration space, with members collaborating on a Google Workspace business opportunity. Summarise this Google Chat message history, and no need to introduce what the space is about, just focus on the summary. If there are bots posting updates, dont mention that a bot posted it but just describe the update itself (unless it is about next steps or ai suggestions, in that case just ignore it.). Use plain text language and insert newlines where appropiate. If there are no messages to summarise, just write something along the lines of no updates" + JSON.stringify(result)))
    shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps);

  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    return false;
  }
}



/**
 * Example usage:  Retrieves messages from a specific space and logs the JSON output.
 *  Be sure to authorize the script to access Google Chat before running.
 */
function testGetChatMessages() {
  // Replace "spaces/YOUR_SPACE_ID" with the actual space ID.
  const spaceId = "spaces/YOUR_SPACE_ID";  //  <-- *** REPLACE THIS WITH YOUR SPACE ID ***

  const messagesJson = getChatMessagesLast14Days(spaceId);

  if (messagesJson) {
    Logger.log(JSON.stringify(messagesJson, null, 2)); // Pretty-print the JSON.
  } else {
    Logger.log("No messages retrieved or an error occurred.");
  }
}






function onMessage(event) {
  // Extract relevant information from the event.
  const message = event.message;
  const space = event.space;
  const user = event.user;
  let userName = user.displayName || "User"; // Fallback to "User" if displayName is not available

  // Log the event for debugging (optional but very helpful)
  console.log(JSON.stringify(event, null, 2));

  // Handle different message types and spaces.
  if (space.type === 'DM') {  // Direct Message (DM)
    return handleDmMessage(message, userName);
  } else if (space.type === 'ROOM') {  // Room/Space
    return handleRoomMessage(message, userName, event);
  } else {
     return { text: "I'm not sure how to handle this type of space yet." };
  }
}

function handleDmMessage(message, userName) {
  const messageText = message.text;

  if (!messageText) {
    return { text: `Hi ${userName}!  I didn't receive any text.  What can I help you with?` };
  }

  // Basic text response
  if (messageText.toLowerCase().includes("hello")) {
    return { text: `Hello ${userName}! How can I help you today?` };
  } else if (messageText.toLowerCase().includes("help")) {
    return createHelpCardDm();
  } else if (messageText.toLowerCase().includes("card")) {
    return createExampleCard();
  }  else {
    // Default response (echo the message with a prefix).  A good place for more advanced processing.
    return { text: `You said: "${messageText}".  I'm still learning, so I don't know what to do with that yet.  Try typing "help".` };
  }
}

function createMessageAppCred(account_name = "", summary = "", spaceName, icon = "", date = "", vector_url = "") {
  Logger.log("spacename going in: " + spaceName)
  spaceName = "spaces/AAAA_x3ZYqw"
  //date = ""
  //summary = "This is a test!"
  token = getToken_()
  //icon = ""

  const message = {
    text: '',
    cardsV2: [{
      card: {
        header: {
          title: account_name,
          subtitle: "",
          imageUrl: icon,
        },
        sections: [{
          widgets: [{

          }]
        }, {
          widgets: [{
            textParagraph: {
              text: date
            }
          }]
        }],
      }
    }],
    accessoryWidgets: [{
      buttonList: {
        buttons: [{
          text: 'Vector',
          icon: {
            materialIcon: {
              name: 'link'
            }
          },
          onClick: {
            openLink: {
              url: vector_url
            }
          }
        }]
      }
    }]
  };
  parameters = {}
  Logger.log(message)
  Logger.log(spaceName)
  Chat.Spaces.Messages.create(message, spaceName, parameters, { 'Authorization': 'Bearer ' + token })
}






function createSpace(spaceName) {
  if (!spaceName)
    spaceName = "Unnamed Space"
  spaceName = spaceName
  // Construct the space object with required and optional properties
  var space = {
    name: spaceName, // The name of the space
    spaceType: 'SPACE', // Use SPACE for a standard space
    displayName: spaceName, // Set the display name (required for SPACE type)

    // Add other optional properties as needed, e.g.:
    // description: 'This is a space for discussing...',
    // singleUserBotDm: false, 
    // spaceDetails: {
    //   description: 'This is a space for discussing...',
    //   guidelines: 'Be kind and respectful.'
    // },
    // externalUserAllowed: true, 
    // ...
  };

  // Make the API request to create the space
  var options = {
    'method': 'POST',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
    },
    'payload': JSON.stringify(space),
    'muteHttpExceptions': true // Optional: Suppress default error logging
  };

  var response = UrlFetchApp.fetch('https://chat.googleapis.com/v1/spaces', options);

  // Handle the API response (check for errors, process data, etc.)
  if (response.getResponseCode() == 200) {
    // Space created successfully
    var spaceData = JSON.parse(response.getContentText());
    Logger.log('Space created: %s', JSON.stringify(spaceData.name));
    return spaceData.name;
  } else {
    // Handle errors
    Logger.log('Error creating space: %s', response.getContentText());
    return ""
  }
}

function postMessageWithUserCredentials(message, spaceName) {
  message = {'text': message};
  Logger.log(message)
  Logger.log(spaceName)
  if (message == "")
    message = "Test"
  Chat.Spaces.Messages.create(message, spaceName);

}

function postMessageWithBotCredentials(message, spaceName) {
  message = {'text': message};
  Logger.log(message)
  Logger.log(spaceName)
  if (message == "")
    message = "Test"
  Chat.Spaces.Messages.create(message, spaceName);

}

function createMembershipUserCred(spaceName,ldap) {
  const parent = spaceName
  const membership = {
    member: {
      // TODO(developer): Replace USER_NAME here
      name: "users/" + ldap + "@google.com",
      // User type for the membership
      type: 'HUMAN'
    }
  };

  // Make the request
  const response = Chat.Spaces.Members.create(membership, parent);

  // Handle the response
  console.log(response);
  return true
}

function createMembershipUserCredForApp(spaceName) {
  // Initialize request argument(s)
  // TODO(developer): Replace SPACE_NAME here.
  const parent = spaceName;
  const membership = {
    member: {
      // Member name for app membership, do not change this
      name: 'users/app',
      // User type for the membership
      type: 'BOT'
    }
  };

  // Make the request
  const response = Chat.Spaces.Members.create(membership, parent);

  // Handle the response
  console.log(response);
}

function createMembershipUserCredForGroup(spaceName, groupName) {
  const parent = spaceName
  const membership = {
    groupMember: {
      // TODO(developer): Replace GROUP_NAME here
      name: groupName
    }
  };

  // Make the request
  const response = Chat.Spaces.Members.create(membership, parent);

  // Handle the response
  console.log(response);
}

function postToSpace(spaceName, message) {
  const parent = spaceName
  const membership = {
    groupMember: {
      // TODO(developer): Replace GROUP_NAME here
      name: groupName
    }
  };

  // Make the request
  const response = Chat.Spaces.Members.create(membership, parent);

  // Handle the response
  console.log(response);
}

// Helper function to add a bot to the space
function addBotToSpace(spaceId, botId) {
  if (botId) {
    try {
      Chat.Spaces.Members.create({
        spaceId: spaceId,
        user: {
          type: 'APP_SHEET_BOT',
          appId: botId
        }
      });
    } catch (e) {
      Logger.log('Error adding bot: %s', e);
    }
  }
}