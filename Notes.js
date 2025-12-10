function getAppSheetAccessKey_() {
  const apiKey = "V2-mbQl8-Vgl2n-tIEmF-4Qbbl-AswcX-QnbRh-SSdYd-kuCfr"; // User Provided
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.length < 20) {
    Logger.log("ERROR: getAppSheetAccessKey_: AppSheet API Key invalid or placeholder.");
    return null;
  }
  // <<< NEW: It's best practice to return the key directly from the function
  return apiKey;
}

// ====================================================================
// NEW: Generic function to add a row to any table via the AppSheet API
// ====================================================================

/**
 * Adds a single row to a specified AppSheet table using the API.
 * @param {string} tableName The name of the table to add the row to.
 * @param {object} rowDataObject An object where keys are the column names and values are the data to add.
 * @returns {boolean} True if the API call was successful, false otherwise.
 */
function addAppSheetRow_(tableName, rowDataObject) {
  const appKey = getAppSheetAccessKey_();
  if (!appKey) return false;

  const url = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${tableName}/action`;

  const payload = {
    "Action": "Add",
    "Properties": {
      "Locale": "en-US"
    },
    "Rows": [ rowDataObject ]
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'ApplicationAccessKey': appKey
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`SUCCESS: AppSheet API call to add row to "${tableName}" was successful.`);
      return true;
    } else {
      Logger.log(`ERROR: AppSheet API call failed with code ${responseCode}. Response: ${responseBody}`);
      return false;
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR in addAppSheetRow_: ${e.message}`);
    return false;
  }
}

// ====================================================================
// MODIFIED: This function now uses the API instead of sheet.appendRow()
// ====================================================================

/**
 * Logs the details of a parsed meeting note by calling the AppSheet API.
 * @param {object} noteData An object containing all the details of the note to be logged.
 */
function logMeetingNoteToSheet(noteData) {
  // <<< CRUCIAL: The keys in this object MUST EXACTLY MATCH your AppSheet column names >>>
  const rowData = {
    // Replace "RecordID", "Opportunity ID", etc., with your actual column names
    "meeting.id": `${noteData.opportunityId}_${new Date(noteData.meetingTime).getTime()}`,
    "opportunities.opportunity_id": noteData.opportunityId,
    "meeting.name": noteData.meetingName,
    "meeting.time": new Date(noteData.meetingTime).toISOString(),
    "meeting.summary": noteData.summary,
    "meeting.next_steps": noteData.nextSteps,
    "meeting.doc": noteData.documentLink,
    "meeting.status": "Pending Approval"
  };
  
  // The table name for your notes log
  const notesTableName = 'Notes'; 

  Logger.log(`Attempting to add note to AppSheet table "${notesTableName}" via API...`);
  addAppSheetRow_(notesTableName, rowData);
}


// ====================================================================
// GLOBAL CONSTANTS
// ====================================================================

// --- Ensure these exactly match the headers in your Google Sheets ---
const OPPORTUNITY_NAME_COL = 'opportunities.opportunity_name';
const CHAT_SPACE_COL = 'chat.space';
const OPPORTUNITY_ID_COL = 'opportunities.opportunity_id';

// ====================================================================
// Main Function (To be called from AppSheet)
// ====================================================================

/**
 * Main function to be called from AppSheet. Finds the most recent email
 * from the last hour with the label "Notes", processes it, logs it to a
 * sheet, and then REMOVES the label.
 */
function getMeetingNotesAndOpportunityContext() {
  // --- Configuration ---
  const GMAIL_LABEL = "Notes"; // The Gmail label to search for

  Logger.log(`--- Starting getMeetingNotesAndOpportunityContext for label: "${GMAIL_LABEL}" ---`);
  
  try {
    // Search query now ONLY looks for the label within the last hour
    const searchQuery = `label:${GMAIL_LABEL} newer_than:6h`;
    const threads = GmailApp.search(searchQuery, 0, 1); // Get the most recent thread with the label
    
    if (threads.length === 0) {
      const message = `No emails found with the "${GMAIL_LABEL}" label in the last hour.`;
      Logger.log(message);
      return { status: message };
    }

    const thread = threads[0];
    const message = thread.getMessages()[0];
    const emailSubject = message.getSubject();
    const emailBody = message.getPlainBody();
    Logger.log(`Processing email with subject: "${emailSubject}"`);

    const labelToRemove = GmailApp.getUserLabelByName(GMAIL_LABEL);
    if (!labelToRemove) {
        const errorMsg = `ERROR: The Gmail label "${GMAIL_LABEL}" does not exist in your account. Please create it.`;
        Logger.log(errorMsg);
        return { status: errorMsg };
    }
    
    const opportunities = getOpportunities();
    if (!opportunities || opportunities.length === 0) {
      return { status: "Could not retrieve opportunities from sheet." };
    }

    const calendarEvent = findCalendarEvent(emailSubject);
    const matchedOpp = findMatchingOpportunity_AI(emailSubject, emailBody, calendarEvent, opportunities);

    // After processing, always remove the label to prevent an infinite loop
    Logger.log(`Removing label "${GMAIL_LABEL}" from thread.`);
    thread.removeLabel(labelToRemove);

    if (matchedOpp) {
      const opportunityName = matchedOpp[OPPORTUNITY_NAME_COL];
      const opportunityId = matchedOpp[OPPORTUNITY_ID_COL];
      const chatSpaceId = matchedOpp[CHAT_SPACE_COL];
      const parsedNotes = parseMeetingNotes(message);

      if (!parsedNotes) {
        return { status: `Match found for ${opportunityName}, but could not parse notes.` };
      }
      if (!chatSpaceId) {
        return { status: `Match found for ${opportunityName}, but no Chat Space ID was found.` };
      }

      // Call the function to log the notes to the sheet
      const noteDataForSheet = {
        opportunityId: opportunityId,
        meetingName: emailSubject,
        meetingTime: message.getDate(),
        summary: parsedNotes.summary,
        nextSteps: parsedNotes.nextSteps,
        documentLink: parsedNotes.documentLink
      };
      logMeetingNoteToSheet(noteDataForSheet);
      return
      // SUCCESS: Return all the data needed for the next step in AppSheet
      return {
        status: "Success",
        opportunityId: opportunityId,
        emailSubject: emailSubject,
        spaceId: chatSpaceId,
        opportunityName: opportunityName,
        summary: parsedNotes.summary,
        nextSteps: parsedNotes.nextSteps,
        documentLink: parsedNotes.documentLink,
        meetingDescription: calendarEvent ? calendarEvent.description : "Not found",
        meetingAttendees: calendarEvent ? calendarEvent.attendees.join(', ') : "Not found"
      };

    } else {
      Logger.log(`INFO: No opportunity match found for email: "${emailSubject}". The "Notes" label has been removed.`);
      return { status: "No opportunity match found for this email." };
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR in getMeetingNotesAndOpportunityContext: ${e.message}\nStack: ${e.stack}`);
    return { status: `Error: ${e.message}` };
  }
}



/**
 * Finds a Google Calendar event by parsing the meeting title and date from an email subject.
 */
function findCalendarEvent(emailSubject) {
  if (!emailSubject) {
    Logger.log("findCalendarEvent: No email subject provided.");
    return null;
  }

  const subjectMatch = emailSubject.match(/Notes: “([^”]*)” (.+)/);
  if (!subjectMatch || !subjectMatch[1] || !subjectMatch[2]) {
    Logger.log(`findCalendarEvent: Could not parse meeting title and date from subject: "${emailSubject}"`);
    return null;
  }

  const meetingTitle = subjectMatch[1];
  const meetingDate = new Date(subjectMatch[2]);
  if (isNaN(meetingDate.getTime())) {
    Logger.log(`findCalendarEvent: Could not parse a valid date from string: "${subjectMatch[2]}"`);
    return null;
  }
  Logger.log(`findCalendarEvent: Parsed - Title: "${meetingTitle}", Date: ${meetingDate.toLocaleDateString()}`);

  try {
    const timeMin = new Date(meetingDate);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(meetingDate);
    timeMax.setHours(23, 59, 59, 999);

    const calendarId = "primary";
    let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?`;
    url += `q=${encodeURIComponent(meetingTitle)}`;
    url += `&timeMin=${timeMin.toISOString()}`;
    url += `&timeMax=${timeMax.toISOString()}`;
    url += `&singleEvents=true`;
    
    const token = ScriptApp.getOAuthToken();
    const options = { method: "GET", headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      throw new Error(`Calendar API failed. Code: ${response.getResponseCode()}.`);
    }

    const data = JSON.parse(response.getContentText());
    if (data.items && data.items.length > 0) {
      const event = data.items[0];
      const attendees = event.attendees ? event.attendees.map(a => a.email) : [];
      Logger.log(`SUCCESS: Found calendar event. Attendees: ${attendees.length}`);
      return {
        description: event.description || "",
        attendees: attendees
      };
    } else {
      Logger.log("INFO: No matching calendar event found for that title and date.");
      return null;
    }
  } catch (e) {
    Logger.log(`ERROR in findCalendarEvent: ${e.message}`);
    return null;
  }
}

/**
 * Reads 'Opportunities' and 'Custom' sheets, joins the data, and returns an array of objects.
 */
function getOpportunities() {
  const SPREADSHEET_ID = '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const OPPS_SHEET_NAME = 'Opportunities';
  const CUSTOM_SHEET_NAME = 'Custom';
  const ID_COL = 'opportunities.opportunity_id';
  const OVERVIEW_COL = 'ai.overview';
  const CHAT_SPACE_COL = 'chat.space';

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const oppsSheet = spreadsheet.getSheetByName(OPPS_SHEET_NAME);
    const customSheet = spreadsheet.getSheetByName(CUSTOM_SHEET_NAME);
    if (!oppsSheet || !customSheet) { throw new Error(`Sheet not found.`); }

    const customData = customSheet.getDataRange().getValues();
    const customHeaders = customData.shift();
    const customIdIndex = customHeaders.indexOf(ID_COL);
    const overviewIndex = customHeaders.indexOf(OVERVIEW_COL);
    const chatSpaceIndex = customHeaders.indexOf(CHAT_SPACE_COL);
    if (customIdIndex === -1 || overviewIndex === -1 || chatSpaceIndex === -1) {
      throw new Error(`Required columns not found in "${CUSTOM_SHEET_NAME}".`);
    }

    const customDataMap = new Map();
    for (const row of customData) {
      if (row[customIdIndex]) {
        customDataMap.set(row[customIdIndex], {
          overview: row[overviewIndex],
          chatSpace: row[chatSpaceIndex]
        });
      }
    }
    
    const oppsData = oppsSheet.getDataRange().getValues();
    const oppsHeaders = oppsData.shift();
    const opportunities = oppsData.map(row => {
      const opp = {};
      oppsHeaders.forEach((header, index) => { opp[header] = row[index]; });
      return opp;
    });

    for (const opp of opportunities) {
      const oppId = opp[ID_COL];
      if (customDataMap.has(oppId)) {
        const customInfo = customDataMap.get(oppId);
        opp[OVERVIEW_COL] = customInfo.overview;
        opp[CHAT_SPACE_COL] = customInfo.chatSpace;
      } else {
        opp[OVERVIEW_COL] = null;
        opp[CHAT_SPACE_COL] = null;
      }
    }
    return opportunities;
  } catch (e) {
    Logger.log(`CRITICAL ERROR in getOpportunities: ${e.message}`);
    return [];
  }
}

/**
 * Uses AI to intelligently match meeting details to the closest opportunity.
 */
function findMatchingOpportunity_AI(emailSubject, emailBody, calendarEvent, opportunities) {
  const OPP_OVERVIEW_COL = 'ai.overview';

  const opportunitiesForAI = opportunities.map(opp => ({
    name: opp[OPPORTUNITY_NAME_COL],
    overview: opp[OPP_OVERVIEW_COL]
  })).filter(opp => opp.name && opp.overview);

  if (opportunitiesForAI.length === 0) {
    Logger.log("ERROR: No opportunities with both a name and an 'ai.overview' were found.");
    return null;
  }
  
  const prompt = `
    Analyze the following meeting details to determine which opportunity from the "List of Opportunities" it is about. The "Meeting Title" and "Calendar Attendees" are very strong indicators.
    Meeting Title: "${emailSubject}"
    Calendar Event Description: "${calendarEvent ? calendarEvent.description : 'Not found.'}"
    Calendar Attendees: "${calendarEvent ? calendarEvent.attendees.join(', ') : 'Not found.'}"
    Meeting Notes Text:
    ---
    ${emailBody}
    ---
    List of Opportunities:
    ${JSON.stringify(opportunitiesForAI)}
    Based on all details, which single opportunity is the most likely match?
    Respond with ONLY the exact 'name' from the list. If no confident match, respond with "None".
  `;
  
  const aiResponse = generate(prompt).trim();

  if (aiResponse && aiResponse.toLowerCase() !== 'none') {
    Logger.log(`AI selected match: "${aiResponse}"`);
    return opportunities.find(opp => opp[OPPORTUNITY_NAME_COL] === aiResponse) || null;
  }
  
  Logger.log("AI did not find a confident match.");
  return null;
}

/**
 * Uses AI to parse the body of a notes email for summary, next steps, and a doc link.
 */
function parseMeetingNotes(messageObject) {
  const emailBody = messageObject.getPlainBody();
  const emailHtml = messageObject.getBody();
  
  const prompt = `
    Extract the "Meeting Summary" and "Next Steps" from the following email text.
    Your response MUST be a single, valid JSON object with the keys "summary" and "nextSteps".
    
    IMPORTANT: For the "summary" and "nextSteps" text, please format it for readability by adding two newlines (\\n) between distinct points or topics. The text should be easy to read inside a small chat card.

    If a section is not found, its value should be null.

    Email Text:
    ---
    ${emailBody}
    ---
  `;
  
  Logger.log("parseMeetingNotes: Calling AI to extract details from email body...");
  const rawResponse = generate(prompt);
  Logger.log(`parseMeetingNotes: Raw response from AI for parsing: ${rawResponse}`);
  
  try {
    const cleanedResponse = cleanJSONString(rawResponse);
    const parsedObject = JSON.parse(cleanedResponse);

    parsedObject.documentLink = extractDocLinkFromEmail(emailHtml);

    Logger.log(`parseMeetingNotes: Successfully parsed content. Final object: ${JSON.stringify(parsedObject)}`);
    return parsedObject;

  } catch (e) {
    Logger.log(`ERROR: Failed to parse summary/next steps from AI response: ${rawResponse}`);
    const docLink = extractDocLinkFromEmail(emailHtml);
    if (docLink) {
      return { summary: "Could not parse AI summary.", nextSteps: "N/A", documentLink: docLink };
    }
    return null;
  }
}

/**
 * Extracts the first Google Docs link from the raw HTML content of an email.
 */
function extractDocLinkFromEmail(emailHtmlContent) {
  if (!emailHtmlContent) return null;
  const regex = /href="(https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9\-_]+[^"]*)"/;
  const match = emailHtmlContent.match(regex);
  if (match && match[1]) {
    const decodedUrl = match[1].replace(/&amp;/g, '&');
    Logger.log(`Successfully extracted document link from email HTML: ${decodedUrl}`);
    return decodedUrl;
  } else {
    Logger.log("Could not find a Google Docs link in the email's HTML content.");
    return null;
  }
}

/**
 * Cleans a string to make it safe for JSON.parse().
 */
function cleanJSONString(jsonString) {
  if (typeof jsonString !== 'string') return "{}";
  let cleanedString = jsonString.trim();
  if (cleanedString.startsWith("```json")) cleanedString = cleanedString.substring(7);
  else if (cleanedString.startsWith("```")) cleanedString = cleanedString.substring(3);
  if (cleanedString.endsWith("```")) cleanedString = cleanedString.substring(0, cleanedString.length - 3);
  cleanedString = cleanedString.trim();
  cleanedString = cleanedString.replace(/[\u0000-\u001F]/g, '');
  return cleanedString;
}

/**
 * Receives meeting note details and posts a formatted card to the specified Google Chat space.
 */
function postMeetingDebriefToChat(spaceId, opportunityName, summary, nextSteps, documentLink, iconUrl, meetingName) {
  Logger.log(`Attempting to post debrief for "${opportunityName}" to space: ${spaceId} using Chat App credentials.`);
  Logger.log(meetingName)
  Logger.log(documentLink)
  
  const token = getToken_(); // Your function to get the user's OAuth token
  if (!token) {
    Logger.log("Could not retrieve token. Aborting post.");
    return;
  }

  const cardSections = [
    { "header": "Meeting Summary", "collapsible": true, "uncollapsibleWidgetsCount": 1, "widgets": [{ "textParagraph": { "text": summary || "<i>No summary provided.</i>" , maxLines: 6} }] },
    { "header": "Next Steps", "collapsible": true, "uncollapsibleWidgetsCount": 1, "widgets": [{ "textParagraph": { "text": nextSteps || "<i>No next steps provided.</i>" , maxLines: 6} }] }
  ];

  if (documentLink) {
    cardSections.push({
      "widgets": [{
        "buttonList": {
          "buttons": [{
            "text": "Notes Doc",
            "icon": { "knownIcon": "DESCRIPTION" },
            "onClick": { "openLink": { "url": documentLink } }
          }]
        }
      }]
    });
  }

  const message = {
    "cardsV2": [{
      "cardId": "meeting-debrief-" + new Date().getTime(),
      "card": {
        "header": {
          "title": "Meeting Debrief",
          "subtitle": meetingName,
          "imageUrl": iconUrl || "[https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/event_note/default/48px.svg](https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/event_note/default/48px.svg)",
          "imageType": "CIRCLE"
        },
        "sections": cardSections
      }
    }]
  };

  const parameters = {};
  Logger.log(message)
  try {
    Chat.Spaces.Messages.create(message, spaceId, parameters, { 'Authorization': 'Bearer ' + token });
    Logger.log(`Successfully sent card message to space ${spaceId}.`);
  } catch (e) {
    Logger.log(`ERROR sending card message to ${spaceId}: ${e.message}`);
    Logger.log(e);
  }
}

// NOTE: The functions 'generate(prompt)' and 'getToken_()' are assumed to exist elsewhere
// in your project or are provided by the environment. They are not defined here.