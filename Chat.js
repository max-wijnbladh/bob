/**
 * Finds a Google Chat space by its display name. If the space doesn't exist, it creates a new one.
 * The function then returns the ID of the found or newly created space.
 *
 * @param {string} spaceName The display name of the Google Chat space to find or create. Defaults to "NewSpace!".
 * @returns {string|null} The space ID (e.g., "spaces/AAAA...") of the space, or null if an error occurs.
 */
function findOrCreateChatSpace(spaceName = "NewSpace!") {
  Logger.log(`--- Starting findOrCreateChatSpace for: "${spaceName}" ---`);

  if (!spaceName || typeof spaceName !== 'string' || spaceName.trim() === '') {
    Logger.log("ERROR: A valid spaceName string must be provided.");
    return null;
  }
  
  // First, try to find an existing space with the given name.
  let spaceId = findChatSpaceIdByName(spaceName);

  // If the space already exists, return its ID.
  if (spaceId) {
    Logger.log(`Space already exists. Returning existing ID: ${spaceId}`);
    return spaceId;
  }
  
  // If the space doesn't exist, create a new one.
  Logger.log(`Space not found. Proceeding to create it...`);
  const newSpaceId = createSpace(spaceName);
  Utilities.sleep(10000); // Wait for the space to be fully created before proceeding.
  lockDownSpacePermissions(spaceName); // Secure the new space by restricting permissions.
  
  // Return the ID of the newly created space.
  return newSpaceId;
}

// ====================================================================
// HELPER FUNCTIONS (These are required by findOrCreateChatSpace)
// ====================================================================

/**
 * Helper function to find a Google Chat space by its display name using the REST API.
 * @param {string} displayName The display name of the space to find.
 * @returns {string|null} The space ID if found, otherwise null.
 */
function findChatSpaceIdByName(displayName) {
  Logger.log(`Searching for Chat space named: "${displayName}"`);
  try {
    const token = ScriptApp.getOAuthToken();
    const options = { method: "GET", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
    let foundSpaceId = null; 
    let pageToken = null;

    do {
      let url = "https://chat.googleapis.com/v1/spaces?pageSize=1000";
      if (pageToken) url += "&pageToken=" + pageToken;
      const response = UrlFetchApp.fetch(url, options);

      if (response.getResponseCode() !== 200) {
        throw new Error(`Failed to fetch spaces. Code: ${response.getResponseCode()}`);
      }

      const data = JSON.parse(response.getContentText());
      if (data.spaces) {
        const matchingSpace = data.spaces.find(space => space.displayName === displayName);
        if (matchingSpace) {
          foundSpaceId = matchingSpace.name;
          Logger.log(`SUCCESS: Found matching space. ID: ${foundSpaceId}`);
          break;
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (!foundSpaceId) {
      Logger.log(`INFO: No match found for "${displayName}".`);
    }
    return foundSpaceId;
  } catch (e) {
    Logger.log(`ERROR in findChatSpaceIdByName: ${e.message}`);
    return null;
  }
}

/**
 * Updates the description of a Google Chat space with opportunity information.
 *
 * @param {string} spaceName The name of the space to update (e.g., "spaces/xyz").
 * @param {object} opportunityData An object containing the opportunity information.
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

  // Generate a concise summary of the opportunity data.
  const newDescription = generate("Summarise this opportunity in 150 characters maximum but keep the same sections, use natural language and no asterisks. It should be easy to read: " + opportunityData);
  Logger.log("Generated Description: ", newDescription);
  return;

  try {
    // Get the current space details to ensure all properties are preserved.
    const space = Chat.Spaces.get(spaceName);
    if (!space) {
      Logger.log(`Error: Space not found with name: ${spaceName}`);
      return false;
    }

    // Update the space object with the new description.
    space.spaceDetails = {
      description: newDescription,
    };

    // Patch the space with the updated description.
    const updatedSpace = Chat.Spaces.patch(
      space,
      spaceName,
      { updateMask: 'spaceDetails' } // Specifies which field to update.
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
 * Opens a Google Drive file by its ID and retrieves its content as a string.
 * This function handles different file types and uses Apps Script Advanced Services.
 *
 * @param {string} fileId The ID of the Google Drive file.
 * @returns {string|null} The content of the file, or null if an error occurs.
 */
function getDriveFileContentAdvanced(fileId) {
  try {
    const file = Drive.Files.get(fileId);
    const mimeType = file.mimeType;

    // Handle different file types.
    if (mimeType === MimeType.GOOGLE_DOCS) {
      return Drive.Files.export(fileId, 'text/plain', { fields: 'data' }).data;
    } else if (mimeType === MimeType.GOOGLE_SHEETS) {
      return Drive.Files.export(fileId, 'text/csv', { fields: 'data' }).data;
    } else if (mimeType === MimeType.GOOGLE_SLIDES) {
      return Drive.Files.export(fileId, 'text/plain', { fields: 'data' }).data;
    } else if (mimeType === MimeType.GOOGLE_DRAWINGS) {
      return Drive.Files.export(fileId, 'image/svg+xml', { fields: 'data' }).data;
    } else if (mimeType === MimeType.PDF) {
      // Use OCR to extract text from PDFs.
      const updatedFile = Drive.Files.update({}, fileId, null, { ocr: true, ocrLanguage: 'en', fields: 'id' });
      const ocrFile = Drive.Files.get(updatedFile.id);
      return ocrFile.exportLinks['text/plain'];
    } else if (mimeType.startsWith('text/')) {
      const response = UrlFetchApp.fetch(file.downloadUrl, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
      return response.getContentText();
    } else if (mimeType.startsWith('image/')) {
        return "Image files are not supported for text extraction in this script. MimeType: " + mimeType;
    } else {
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
 *  !!! IMPORTANT !!!  Enable the Google Drive API Advanced Service
 *
 *  This function reminds the user to manually enable the Google Drive API
 *  as an Advanced Service in the Apps Script project.
 */
function enableDriveAdvancedService(){
    Logger.log("Please enable the Google Drive API Advanced Service manually in the Services menu.");
    Logger.log("1. Click the '+' icon next to 'Services' in the left-hand menu.");
    Logger.log("2. Find 'Drive API' in the list.");
    Logger.log("3. Click 'Add'.");
}

/**
 * Retrieves the ID of a Google Drive file from recent messages in a chat space.
 * 
 * @param {string} spaceName The name of the chat space.
 * @returns {string|null} The ID of the Drive file, or null if not found.
 */
function getDriveFileIdFromRecentMessages(spaceName = "spaces/AAAADTV_G7g") {
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 120);
  const startTime = fiveMinutesAgo.toISOString();

  let driveFileId = null;

  try {
    const response = Chat.Spaces.Messages.list(spaceName, {
      pageSize: 100,
      filter: `createTime > "${startTime}"`,
    });

    if (response.messages && response.messages.length > 0) {
      for (let i = response.messages.length - 1; i >= 0; i--) {
        const message = response.messages[i];
        if (message.attachment && message.attachment.length > 0) {
          for (const attachment of message.attachment) {
            if (attachment.source === "DRIVE_FILE" && attachment.driveDataRef && attachment.driveDataRef.driveFileId) {
              driveFileId = attachment.driveDataRef.driveFileId;
              break;
            }
          }
          if (driveFileId) {
              break;
          }
        }
      }
    }
    getDriveFileContentAdvanced(driveFileId);
    return driveFileId;
  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    return null;
  }
}

/**
 *  !!! IMPORTANT !!!  Enable the Google Chat API Advanced Service
 *
 *  This function reminds the user to manually enable the Google Chat API
 *  as an Advanced Service in the Apps Script project.
 */
function enableChatAdvancedService() {
  Logger.log("Please enable the Google Chat API Advanced Service manually in the Services menu.");
  Logger.log("1. Click the '+' icon next to 'Services' in the left-hand menu.");
  Logger.log("2. Find 'Google Chat API' in the list.");
  Logger.log("3. Click 'Add'.");
}

/**
 * Retrieves and summarizes Google Chat messages from the last 7 days.
 * 
 * @param {string} spaceName The name of the chat space.
 * @param {string} icon An icon to use for the summary.
 * @param {string} vector_url A URL for a vector image.
 * @param {string} account_name The name of the account.
 * @param {string} context Additional context for the summary.
 * @param {string} next_steps The next steps for the opportunity.
 * @returns {boolean} True on success, false on failure.
 */
function getChatMessagesLast7DaysAdvanced(spaceName = "spaces/AAAA_x3ZYqw", icon = "", vector_url = "", account_name = "", context = "none", next_steps) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);
  const startTime = fourteenDaysAgo.toISOString();

  let messages = [];
  let pageToken = null;

  try {
    do {
      const response = Chat.Spaces.Messages.list(spaceName, {
        pageSize: 100,
        filter: `createTime > "${startTime}"`,
        pageToken: pageToken,
      });

      if (response.messages && response.messages.length > 0) {
        messages = messages.concat(response.messages);
      } else {
        return false;
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    const formattedMessages = messages.map(message => ({ ...message }));
    const result = { messages: formattedMessages, space: spaceName };
    const summary = generate("This is a Google Chat collaboration space, with members collaborating on a Google Workspace business opportunity. Summarise this Google Chat message history, and no need to introduce what the space is about, just focus on the summary. If there are bots posting updates, dont mention that a bot posted it but just describe the update itself (unless it is about next steps or ai suggestions, in that case just ignore it.). Use plain text language and insert newlines where appropiate. If there are no messages to summarise, just write something along the lines of no updates" + JSON.stringify(result));
    shareWeeklyDigest(spaceName, summary, vector_url, icon, account_name, context, next_steps);
  } catch (error) {
    Logger.log(`An error occurred: ${error}`);
    return false;
  }
}

/**
 * Handles incoming messages to the Chat bot.
 * 
 * @param {object} event The event object from Google Chat.
 * @returns {object} A response object to send back to the user.
 */
function onMessage(event) {
  const { message, space, user } = event;
  const userName = user.displayName || "User";

  if (space.type === 'DM') {
    return handleDmMessage(message, userName);
  } else if (space.type === 'ROOM') {
    return handleRoomMessage(message, userName, event);
  } else {
     return { text: "I'm not sure how to handle this type of space yet." };
  }
}

/**
 * Handles direct messages to the Chat bot.
 * 
 * @param {object} message The message object from the event.
 * @param {string} userName The display name of the user.
 * @returns {object} A response object.
 */
function handleDmMessage(message, userName) {
  const messageText = message.text;

  if (!messageText) {
    return { text: `Hi ${userName}!  I didn't receive any text.  What can I help you with?` };
  }

  const lowerCaseMessage = messageText.toLowerCase();
  if (lowerCaseMessage.includes("hello")) {
    return { text: `Hello ${userName}! How can I help you today?` };
  } else if (lowerCaseMessage.includes("help")) {
    return createHelpCardDm();
  } else if (lowerCaseMessage.includes("card")) {
    return createExampleCard();
  } else {
    return { text: `You said: "${messageText}".  I'm still learning, so I don't know what to do with that yet.  Try typing "help".` };
  }
}

/**
 * Creates a message card for a Google Chat space.
 * 
 * @param {string} account_name The name of the account.
 * @param {string} summary A summary of the message.
 * @param {string} spaceName The name of the chat space.
 * @param {string} icon An icon URL.
 * @param {string} date The date of the message.
 * @param {string} vector_url A URL for a vector image.
 */
function createMessageAppCred(account_name = "", summary = "", spaceName, icon = "", date = "", vector_url = "") {
  spaceName = "spaces/AAAA_x3ZYqw";
  const token = getToken_();

  const message = {
    text: '',
    cardsV2: [{ card: { header: { title: account_name, subtitle: "", imageUrl: icon }, sections: [{ widgets: [] }, { widgets: [{ textParagraph: { text: date } }] }] } }],
    accessoryWidgets: [{ buttonList: { buttons: [{ text: 'Vector', icon: { materialIcon: { name: 'link' } }, onClick: { openLink: { url: vector_url } } }] } }]
  };

  Chat.Spaces.Messages.create(message, spaceName, {}, { 'Authorization': 'Bearer ' + token });
}

/**
 * Creates a new Google Chat space.
 * 
 * @param {string} spaceName The display name of the new space.
 * @returns {string} The name of the created space.
 */
function createSpace(spaceName = "Unnamed Space") {
  const space = {
    name: spaceName,
    spaceType: 'SPACE',
    displayName: spaceName,
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(space),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch('https://chat.googleapis.com/v1/spaces', options);

  if (response.getResponseCode() === 200) {
    const spaceData = JSON.parse(response.getContentText());
    return spaceData.name;
  } else {
    Logger.log('Error creating space: %s', response.getContentText());
    return "";
  }
}

/**
 * Posts a message to a Google Chat space using user credentials.
 * 
 * @param {string} message The message to post.
 * @param {string} spaceName The name of the chat space.
 */
function postMessageWithUserCredentials(message, spaceName) {
  Chat.Spaces.Messages.create({ text: message || "Test" }, spaceName);
}

/**
 * Posts a message to a Google Chat space using bot credentials.
 * 
 * @param {string} message The message to post.
 * @param {string} spaceName The name of the chat space.
 */
function postMessageWithBotCredentials(message, spaceName) {
  Chat.Spaces.Messages.create({ text: message || "Test" }, spaceName);
}

/**
 * Adds a user to a Google Chat space.
 * 
 * @param {string} spaceName The name of the chat space.
 * @param {string} ldap The LDAP username of the user.
 * @returns {boolean} True on success.
 */
function createMembershipUserCred(spaceName = "spaces/AAAA0XsUhb4", ldap = "joakimtj") {
  const membership = { member: { name: `users/${ldap}@google.com`, type: 'HUMAN' } };
  Chat.Spaces.Members.create(membership, spaceName);
  return true;
}

/**
 * Adds the app to a Google Chat space.
 * 
 * @param {string} spaceName The name of the chat space.
 */
function createMembershipUserCredForApp(spaceName) {
  const membership = { member: { name: 'users/app', type: 'BOT' } };
  Chat.Spaces.Members.create(membership, spaceName);
}

/**
 * Adds a group to a Google Chat space.
 * 
 * @param {string} spaceName The name of the chat space.
 * @param {string} groupName The name of the group.
 */
function createMembershipUserCredForGroup(spaceName, groupName) {
  const membership = { groupMember: { name: groupName } };
  Chat.Spaces.Members.create(membership, spaceName);
}

/**
 * Adds a bot to a Google Chat space.
 * 
 * @param {string} spaceId The ID of the chat space.
 * @returns {object|null} The membership object on success, or null on failure.
 */
function addBotToSpace(spaceId) {
  const botAppId = 976136649470;
  const url = `https://chat.googleapis.com/v1/${spaceId}/members`;
  const requestBody = { member: { name: "users/app", type: "BOT" } };
  const token = ScriptApp.getOAuthToken();

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      return JSON.parse(response.getContentText());
    } else if (responseCode === 409) {
      return { status: "Already a member" };
    } else {
      Logger.log(`Error adding bot. Code: ${responseCode}. Response: ${response.getContentText()}`);
      return null;
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR calling Chat Memberships API: ${e.message}\nStack: ${e.stack}`);
    return null;
  }
}

/**
 * Locks down the permissions of a Google Chat space.
 * 
 * @param {string} spaceName The name of the chat space.
 * @returns {boolean} True on success, false on failure.
 */
function lockDownSpacePermissions(spaceName = "spaces/AAQAwcYjp9A") {
  const updateMask = "permissionSettings.manageMembersAndGroups";
  const url = `https://chat.googleapis.com/v1/${spaceName}?updateMask=${updateMask}`;
  const payload = { permissionSettings: { manageMembersAndGroups: { managersAllowed: true, membersAllowed: false } } };

  const options = {
    method: 'PATCH',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);

  if (response.getResponseCode() === 200) {
    return true;
  } else {
    Logger.log(`ERROR: Failed to update permissions. Code: ${response.getResponseCode()}. Response: ${response.getContentText()}`);
    return false;
  }
}
