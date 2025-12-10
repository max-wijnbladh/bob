/**
 * Retrieves the AppSheet API access key.
 * @returns {string|null} The API key, or null if it's invalid.
 */
function getAppSheetAccessKey_() {
  const apiKey = "V2-mbQl8-Vgl2n-tIEmF-4Qbbl-AswcX-QnbRh-SSdYd-kuCfr";
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.length < 20) {
    Logger.log("AppSheet API Key is invalid or a placeholder.");
    return null;
  }
  return apiKey;
}

/**
 * Adds a single row to a specified AppSheet table.
 * @param {string} tableName The name of the table.
 * @param {object} rowDataObject An object representing the row data.
 * @returns {boolean} True on success, false on failure.
 */
function addAppSheetRow_(tableName, rowDataObject) {
  const appKey = getAppSheetAccessKey_();
  if (!appKey) return false;

  const url = `https://api.appsheet.com/api/v2/apps/${APPSHEET_APP_ID}/tables/${tableName}/action`;
  const payload = {
    Action: "Add",
    Properties: { Locale: "en-US" },
    Rows: [rowDataObject]
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { ApplicationAccessKey: appKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      Logger.log(`Successfully added row to "${tableName}".`);
      return true;
    } else {
      Logger.log(`AppSheet API call failed: ${response.getContentText()}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Error in addAppSheetRow_: ${e.message}`);
    return false;
  }
}

/**
 * Logs a meeting note to an AppSheet table.
 * @param {object} noteData The note data to log.
 */
function logMeetingNoteToSheet(noteData) {
  const rowData = {
    "meeting.id": `${noteData.opportunityId}_${new Date(noteData.meetingTime).getTime()}`,
    "opportunities.opportunity_id": noteData.opportunityId,
    "meeting.name": noteData.meetingName,
    "meeting.time": new Date(noteData.meetingTime).toISOString(),
    "meeting.summary": noteData.summary,
    "meeting.next_steps": noteData.nextSteps,
    "meeting.doc": noteData.documentLink,
    "meeting.status": "Pending Approval"
  };
  addAppSheetRow_('Notes', rowData);
}

// Constants for sheet column names
const OPPORTUNITY_NAME_COL = 'opportunities.opportunity_name';
const CHAT_SPACE_COL = 'chat.space';
const OPPORTUNITY_ID_COL = 'opportunities.opportunity_id';

/**
 * Processes the most recent email with the "Notes" label.
 * @returns {object} A status object.
 */
function getMeetingNotesAndOpportunityContext() {
  const GMAIL_LABEL = "Notes";

  try {
    const threads = GmailApp.search(`label:${GMAIL_LABEL} newer_than:6h`, 0, 1);
    if (threads.length === 0) {
      const message = `No emails with label "${GMAIL_LABEL}" in the last hour.`
      return { status: message };
    }

    const thread = threads[0];
    const message = thread.getMessages()[0];
    const emailSubject = message.getSubject();
    const emailBody = message.getPlainBody();

    const labelToRemove = GmailApp.getUserLabelByName(GMAIL_LABEL);
    if (!labelToRemove) {
        const errorMsg = `Gmail label "${GMAIL_LABEL}" not found.`
        return { status: errorMsg };
    }
    
    const opportunities = getOpportunities();
    if (!opportunities || opportunities.length === 0) {
      return { status: "Could not retrieve opportunities." };
    }

    const calendarEvent = findCalendarEvent(emailSubject);
    const matchedOpp = findMatchingOpportunity_AI(emailSubject, emailBody, calendarEvent, opportunities);

    thread.removeLabel(labelToRemove);

    if (matchedOpp) {
      const opportunityName = matchedOpp[OPPORTUNITY_NAME_COL];
      const opportunityId = matchedOpp[OPPORTUNITY_ID_COL];
      const chatSpaceId = matchedOpp[CHAT_SPACE_COL];
      const parsedNotes = parseMeetingNotes(message);

      if (!parsedNotes) {
        return { status: `Match found, but could not parse notes.` };
      }
      if (!chatSpaceId) {
        return { status: `Match found, but no Chat Space ID.` };
      }

      const noteDataForSheet = {
        opportunityId: opportunityId,
        meetingName: emailSubject,
        meetingTime: message.getDate(),
        summary: parsedNotes.summary,
        nextSteps: parsedNotes.nextSteps,
        documentLink: parsedNotes.documentLink
      };
      logMeetingNoteToSheet(noteDataForSheet);

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
      return { status: "No opportunity match found." };
    }
  } catch (e) {
    return { status: `Error: ${e.message}` };
  }
}

/**
 * Finds a Google Calendar event from an email subject.
 * @param {string} emailSubject The email subject.
 * @returns {object|null} The event details or null.
 */
function findCalendarEvent(emailSubject) {
  if (!emailSubject) return null;

  const subjectMatch = emailSubject.match(/Notes: “([^”]*)” (.+)/);
  if (!subjectMatch) return null;

  const meetingTitle = subjectMatch[1];
  const meetingDate = new Date(subjectMatch[2]);
  if (isNaN(meetingDate.getTime())) return null;

  try {
    const timeMin = new Date(meetingDate); timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(meetingDate); timeMax.setHours(23, 59, 59, 999);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(meetingTitle)}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`;
    
    const token = ScriptApp.getOAuthToken();
    const options = { headers: { Authorization: `Bearer ${token}` }, muteHttpExceptions: true };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) throw new Error(`Calendar API failed.`);

    const data = JSON.parse(response.getContentText());
    if (data.items && data.items.length > 0) {
      const event = data.items[0];
      const attendees = event.attendees ? event.attendees.map(a => a.email) : [];
      return {
        description: event.description || "",
        attendees: attendees
      };
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Retrieves and joins opportunity and custom data from a spreadsheet.
 * @returns {Array<object>} An array of opportunity objects.
 */
function getOpportunities() {
  const SPREADSHEET_ID = '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const OPPS_SHEET_NAME = 'Opportunities';
  const CUSTOM_SHEET_NAME = 'Custom';
  const ID_COL = 'opportunities.opportunity_id';
  const OVERVIEW_COL = 'ai.overview';

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const oppsSheet = ss.getSheetByName(OPPS_SHEET_NAME);
    const customSheet = ss.getSheetByName(CUSTOM_SHEET_NAME);
    if (!oppsSheet || !customSheet) throw new Error('Sheet not found');

    const customData = customSheet.getDataRange().getValues();
    const customHeaders = customData.shift();
    const customIdIndex = customHeaders.indexOf(ID_COL);
    const overviewIndex = customHeaders.indexOf(OVERVIEW_COL);
    const chatSpaceIndex = customHeaders.indexOf(CHAT_SPACE_COL);
    if ([customIdIndex, overviewIndex, chatSpaceIndex].includes(-1)) throw new Error('Required columns not found in Custom sheet');

    const customDataMap = new Map();
    customData.forEach(row => {
      if (row[customIdIndex]) customDataMap.set(row[customIdIndex], { overview: row[overviewIndex], chatSpace: row[chatSpaceIndex] });
    });
    
    const oppsData = oppsSheet.getDataRange().getValues();
    const oppsHeaders = oppsData.shift();
    const opportunities = oppsData.map(row => {
      const opp = {};
      oppsHeaders.forEach((header, index) => { opp[header] = row[index]; });
      return opp;
    });

    opportunities.forEach(opp => {
      const customInfo = customDataMap.get(opp[ID_COL]);
      opp[OVERVIEW_COL] = customInfo ? customInfo.overview : null;
      opp[CHAT_SPACE_COL] = customInfo ? customInfo.chatSpace : null;
    });
    return opportunities;
  } catch (e) {
    return [];
  }
}

/**
 * Uses AI to find the best matching opportunity for an email.
 * @param {string} emailSubject The email subject.
 * @param {string} emailBody The email body.
 * @param {object} calendarEvent The calendar event details.
 * @param {Array<object>} opportunities A list of opportunities.
 * @returns {object|null} The matched opportunity or null.
 */
function findMatchingOpportunity_AI(emailSubject, emailBody, calendarEvent, opportunities) {
  const opportunitiesForAI = opportunities.map(opp => ({ name: opp[OPPORTUNITY_NAME_COL], overview: opp['ai.overview'] })).filter(opp => opp.name && opp.overview);
  if (opportunitiesForAI.length === 0) return null;
  
  const prompt = `Analyze the meeting details to determine the most likely opportunity match from the provided list. Respond with ONLY the exact opportunity 'name' or "None".
  Meeting Title: "${emailSubject}"
  Calendar Event: "${calendarEvent ? calendarEvent.description : 'Not found'}"
  Attendees: "${calendarEvent ? calendarEvent.attendees.join(', ') : 'Not found'}"
  Notes:
  ${emailBody}
  Opportunities:
  ${JSON.stringify(opportunitiesForAI)}
  `;
  
  const aiResponse = generate(prompt).trim();
  return aiResponse.toLowerCase() !== 'none' ? opportunities.find(opp => opp[OPPORTUNITY_NAME_COL] === aiResponse) : null;
}

/**
 * Parses meeting notes from an email using AI.
 * @param {GoogleAppsScript.Gmail.GmailMessage} messageObject The Gmail message object.
 * @returns {object|null} The parsed notes or null.
 */
function parseMeetingNotes(messageObject) {
  const emailBody = messageObject.getPlainBody();
  const emailHtml = messageObject.getBody();
  
  const prompt = `Extract "Meeting Summary" and "Next Steps" from the email text. Respond with a valid JSON object with keys "summary" and "nextSteps", using double newlines for readability. If a section is missing, its value should be null.
  Email Text:
  ${emailBody}
  `;
  
  const rawResponse = generate(prompt);
  
  try {
    const cleanedResponse = cleanJSONString(rawResponse);
    const parsedObject = JSON.parse(cleanedResponse);
    parsedObject.documentLink = extractDocLinkFromEmail(emailHtml);
    return parsedObject;
  } catch (e) {
    const docLink = extractDocLinkFromEmail(emailHtml);
    return docLink ? { summary: "Could not parse AI summary.", nextSteps: "N/A", documentLink: docLink } : null;
  }
}

/**
 * Extracts a Google Docs link from email HTML.
 * @param {string} emailHtmlContent The HTML content of the email.
 * @returns {string|null} The extracted link or null.
 */
function extractDocLinkFromEmail(emailHtmlContent) {
  if (!emailHtmlContent) return null;
  const match = emailHtmlContent.match(/href="(https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9\-_]+[^"]*)"/);
  return match ? match[1].replace(/&amp;/g, '&') : null;
}

/**
 * Cleans a string to prepare it for JSON parsing.
 * @param {string} jsonString The string to clean.
 * @returns {string} The cleaned string.
 */
function cleanJSONString(jsonString) {
  if (typeof jsonString !== 'string') return "{}";
  let cleaned = jsonString.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.substring(7, cleaned.length - 3).trim();
  else if (cleaned.startsWith("```")) cleaned = cleaned.substring(3, cleaned.length - 3).trim();
  return cleaned.replace(/[\u0000-\u001F]/g, '');
}

/**
 * Posts a meeting debrief card to a Google Chat space.
 * @param {string} spaceId The ID of the chat space.
 * @param {string} opportunityName The name of the opportunity.
 * @param {string} summary The meeting summary.
 * @param {string} nextSteps The next steps.
 * @param {string} documentLink A link to the notes document.
 * @param {string} iconUrl The URL of an icon to display.
 * @param {string} meetingName The name of the meeting.
 */
function postMeetingDebriefToChat(spaceId, opportunityName, summary, nextSteps, documentLink, iconUrl, meetingName) {
  const token = getToken_();
  if (!token) return;

  const cardSections = [
    { header: "Meeting Summary", collapsible: true, uncollapsibleWidgetsCount: 1, widgets: [{ textParagraph: { text: summary || "<i>No summary.</i>", maxLines: 6 } }] },
    { header: "Next Steps", collapsible: true, uncollapsibleWidgetsCount: 1, widgets: [{ textParagraph: { text: nextSteps || "<i>No next steps.</i>", maxLines: 6 } }] }
  ];

  if (documentLink) {
    cardSections.push({ widgets: [{ buttonList: { buttons: [{ text: "Notes Doc", icon: { knownIcon: "DESCRIPTION" }, onClick: { openLink: { url: documentLink } } }] } }] });
  }

  const message = {
    cardsV2: [{
      cardId: `meeting-debrief-${new Date().getTime()}`,
      card: {
        header: {
          title: "Meeting Debrief",
          subtitle: meetingName,
          imageUrl: iconUrl || "https://fonts.gstatic.com/s/i/short-term/release/googlesymbols/event_note/default/48px.svg",
          imageType: "CIRCLE"
        },
        sections: cardSections
      }
    }]
  };

  try {
    Chat.Spaces.Messages.create(message, spaceId, {}, { Authorization: `Bearer ${token}` });
  } catch (e) {
    Logger.log(`Error sending card to ${spaceId}: ${e.message}`);
  }
}
