/**
 * ============================================================================
 * Apps Script Code for Opportunity Change Tracking and Notification (Version 1)
 * Sends detailed changes to AppSheet and generates informative Google Chat cards.
 * All function names have '1' appended.
 * ============================================================================
 */


const APPSHEET_COL_DETAILS = 'ChangeDetails'; // <<< NEW: AppSheet LongText column to store JSON change details


// --- Opportunity Tracking Configuration ---
const SPREADSHEET_ID = '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE'; // Central Spreadsheet ID
const DEST_SHEET_NAME = 'Opportunities'; // Destination Sheet Name
const SOURCE_SEARCH_QUERY = "title contains 'Opportunities mawi@' and mimeType = 'application/vnd.google-apps.spreadsheet'"; // Search Query for Source Sheet
const ID_COLUMN_NAME = 'opportunities.opportunity_id'; // Name of the ID column in Opportunities Sheet
const ACCOUNT_NAME_COLUMN = 'opportunities.account_name'; // Name of the Account column in Opportunities Sheet
const ACCOUNTS_SHEET_NAME = 'Accounts'; // Name of the Accounts tab
const ACCOUNTS_KEY_COLUMN = 'opportunities.account_name'; // Key column in Accounts Sheet
const VECTOR_URL_BASE = 'https://your-vector-or-crm-link.com/opportunities/'; // Optional: Base URL for opportunity links

// Columns in Opportunities Sheet to actively track for field changes
const COLUMNS_TO_TRACK = [
  "opportunities.forecast_category_name",
  //"opportunities.next_steps_ce",
  "opportunities.next_step",
  "opportunities.stage_name",
  "opportunities.business_need",
  "opportunities.deal_blocker",
  "opportunities.next_steps_cetech_win",
  "opportunities.close_date"
];

// ============================================================================
// Helper Functions (Version 1)
// ============================================================================

/**
 * Safe logging function.
 */
const safeLog_NEW1 = (value) => {
  if (value !== undefined) Logger.log(value);
  else Logger.log("safeLog_NEW1 received undefined value.");
};

/**
 * Records a change or status update in a structured format.
 */
const recordChange_NEW1 = (changes, id, columnName, before, after, status) => {
  if (!id) return changes;
  if (!changes[id]) changes[id] = [];
  const entry = { date: new Date().toISOString() }; // Use ISO string for easier handling
  if (columnName) entry.column = columnName;
  if (before !== undefined) entry.before = before;
  if (after !== undefined) entry.after = after;
  if (status) entry.status = status;
  changes[id].push(entry);
  return changes;
};

/**
 * Creates a map from a 2D array.
 */
const createMapFromArray_NEW1 = (array, keyIndex) => {
  if (!array || array.length < 1) return new Map();
  const header = array[0];
  if (!header || keyIndex < 0 || keyIndex >= header.length) return new Map();
  const map = new Map();
  for (let i = 1; i < array.length; i++) {
    const row = array[i];
    if (row && row.length > keyIndex) {
      const key = row[keyIndex];
      if (key !== null && key !== undefined && key !== "") map.set(key, row);
    }
  }
  return map;
};

/**
 * Removes duplicate change entries for the same column within an ID, keeping the last one.
 */
function removeDuplicateChanges_NEW1(changes) {
  const uniqueChanges = {};
  for (const id in changes) {
    if (changes.hasOwnProperty(id)) {
      const entries = changes[id];
      const lastSeen = new Map();
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        const key = entry.status ? `status_${entry.status}` : entry.column;
        if (key && !lastSeen.has(key)) lastSeen.set(key, entry);
      }
      uniqueChanges[id] = Array.from(lastSeen.values()).reverse();
    }
  }
  return uniqueChanges;
}

/**
 * Gets the File ID of the most recently updated Google Sheet matching the search query.
 */
const getLatestSheetId_NEW1 = (searchQuery) => {
  try {
    const files = DriveApp.searchFiles(searchQuery);
    let latestFile = null;
    let latestDate = new Date(0);
    while (files.hasNext()) {
      const file = files.next();
      const updatedDate = file.getLastUpdated();
      if (updatedDate > latestDate) {
        latestDate = updatedDate;
        latestFile = file;
      }
    }
    if (latestFile) {
      Logger.log(`Latest sheet identified: "${latestFile.getName()}" (ID: ${latestFile.getId()}), Last updated: ${latestDate}`);
      return latestFile.getId();
    } else {
      Logger.log(`No sheets found matching search: "${searchQuery}"`);
      return null;
    }
  } catch (error) {
    Logger.log(`Error in getLatestSheetId1: ${error}`);
    return null;
  }
};

/**
 * Updates the destination sheet by overwriting its content with data from the source sheet.
 */
const updateSheetData_NEW1 = (sourceSheet, destinationSheet) => {
  if (!sourceSheet || !destinationSheet) return false;
  Logger.log(`Attempting to update "${destinationSheet.getName()}" from "${sourceSheet.getName()}"...`);
  try {
    const sourceData = sourceSheet.getDataRange().getValues();
    destinationSheet.clearContents();
    if (sourceData.length > 0 && sourceData[0].length > 0) {
      destinationSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);
      Logger.log(`Successfully updated "${destinationSheet.getName()}" (${sourceData.length} rows).`);
    } else {
       Logger.log(`Source sheet "${sourceSheet.getName()}" was empty. Destination sheet "${destinationSheet.getName()}" cleared.`);
    }
    return true;
  } catch (error) {
    Logger.log(`Error updating sheet "${destinationSheet.getName()}": ${error}`);
    return false;
  }
};

/**
 * Deletes rows from a sheet based on a set of IDs found in a specific column.
 */
function deleteRowsById_NEW1(sheet, idColumnIndex, idsToDelete) {
  if (!sheet || idColumnIndex < 0 || !idsToDelete || idsToDelete.size === 0) return;
  let data;
  try { data = sheet.getDataRange().getValues(); }
  catch (e) { Logger.log(`Error reading data from sheet "${sheet.getName()}" for deletion: ${e}`); return; }
  if (data.length > 0 && idColumnIndex >= data[0].length) return;
  const rowsToDeleteIndices = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].length > idColumnIndex) {
      const rowId = data[i][idColumnIndex];
      if (rowId !== undefined && rowId !== "" && rowId !== null && idsToDelete.has(rowId)) {
        rowsToDeleteIndices.push(i + 1);
      }
    }
  }
  if (rowsToDeleteIndices.length > 0) {
    rowsToDeleteIndices.sort((a, b) => b - a);
    Logger.log(`Attempting to delete ${rowsToDeleteIndices.length} rows from sheet "${sheet.getName()}"`);
    let deletedCount = 0;
    for (const rowIndex of rowsToDeleteIndices) {
      try { sheet.deleteRow(rowIndex); deletedCount++; }
      catch (e) { Logger.log(`Error deleting row ${rowIndex} from sheet "${sheet.getName()}": ${e}.`); }
    }
    Logger.log(`Finished deleting. Successfully deleted ${deletedCount} rows.`);
  }
}

/**
 * Finds changes (field updates, additions) and identifies removed IDs.
 */
const findChangesAndRemovedIds1 = (originalDataMap, sheet2, originalHeader, originalIdIndex, columnsToTrack) => {
  let data2;
  try { data2 = sheet2.getDataRange().getValues(); }
  catch (e) { Logger.log(`Error getting data from sheet2 "${sheet2.getName()}": ${e}`); return { changes: {}, removedIds: new Set(), newDataMap: new Map(), newDataHeader: [] }; }

  if (!data2 || data2.length < 1) {
    Logger.log(`Sheet "${sheet2.getName()}" contains no data rows or is empty.`);
    const allOriginalIds = new Set(originalDataMap.keys());
    const emptyChanges = {};
    if (allOriginalIds.size > 0) for (const id of allOriginalIds) emptyChanges[id] = [{ status: `Entry removed (Source empty)` }];
    return { changes: emptyChanges, removedIds: allOriginalIds, newDataMap: new Map(), newDataHeader: (data2 && data2.length > 0 ? data2[0] : []) };
  }

  const header2 = data2[0];
  const idIndex2 = header2.indexOf(ID_COLUMN_NAME);
  if (idIndex2 === -1) { Logger.log(`'${ID_COLUMN_NAME}' column not found in source sheet "${sheet2.getName()}".`); return { changes: {}, removedIds: new Set(), newDataMap: new Map(), newDataHeader: header2 }; }

  let changes = {};
  const processedNewIds = new Set();
  const dataMap2 = createMapFromArray_NEW1(data2, idIndex2); // Call updated function name

  for (const [id, rowData2] of dataMap2.entries()) {
    processedNewIds.add(id);
    if (originalDataMap.has(id)) {
      const rowData1 = originalDataMap.get(id);
      for (let j = 0; j < header2.length; j++) {
        const columnName = header2[j] ? header2[j].trim() : '';
        if (columnsToTrack && columnName && columnsToTrack.includes(columnName) && j !== idIndex2) {
          const colIndex1 = originalHeader.indexOf(columnName);
          if (colIndex1 !== -1) {
            let value1 = rowData1[colIndex1];
            let value2 = rowData2[j];
            let changed = false;
            if (value1 instanceof Date || value2 instanceof Date) {
              const time1 = value1 instanceof Date ? value1.getTime() : String(value1 ?? "");
              const time2 = value2 instanceof Date ? value2.getTime() : String(value2 ?? "");
              if (time1 !== time2) changed = true;
            } else if (String(value1 ?? "") !== String(value2 ?? "")) {
              changed = true;
            }
            if (changed) changes = recordChange_NEW1(changes, id, columnName, value1, value2, null); // Call updated function name
          }
        }
      }
    } else {
      changes = recordChange_NEW1(changes, id, null, null, null, 'New entry added'); // Call updated function name
    }
  }

  const removedIds = new Set();
  for (const id of originalDataMap.keys()) {
    if (!processedNewIds.has(id)) {
      removedIds.add(id);
      changes = recordChange_NEW1(changes, id, null, null, null, 'Entry removed'); // Call updated function name
    }
  }

  const finalChanges = removeDuplicateChanges_NEW1(changes); // Call updated function name
  Logger.log(`Comparison complete. Found changes/statuses for ${Object.keys(finalChanges).length} IDs. Identified ${removedIds.size} removed IDs.`);
  return { changes: finalChanges, removedIds: removedIds, newDataMap: dataMap2, newDataHeader: header2 };
};

/**
 * Retrieves the AppSheet API Access Key.
 * WARNING: Hardcoding keys is not recommended for security. Use Script Properties instead.
 */
function getAppSheetAccessKey_1() {
  const apiKey = "V2-mbQl8-Vgl2n-tIEmF-4Qbbl-AswcX-QnbRh-SSdYd-kuCfr"; // <<< Consider moving to Script Properties
  if (!apiKey) {
    Logger.log("ERROR: AppSheet API Key is missing.");
    return null;
  }
  return apiKey;
}

/**
 * Adds a record to the AppSheet Feed table via API, including detailed changes.
 */
const addRecordToAppSheet1 = (dataForAppSheet) => {
  // Input validation
  if (!dataForAppSheet || dataForAppSheet.id === undefined || !Array.isArray(dataForAppSheet.details)) {
    Logger.log(`Invalid dataForAppSheet provided (missing id or details array): ${JSON.stringify(dataForAppSheet)}`);
    return false;
  }
  const opportunityId = dataForAppSheet.id;
  const changeDetailsArray = dataForAppSheet.details;
  const changeLogSummary = dataForAppSheet.changeLog; // Optional summary string

  // API Key & Config validation
  const apiKey = getAppSheetAccessKey_1(); // Call updated function name
  if (!apiKey) return false;
  if (!APPSHEET_APP_ID || APPSHEET_APP_ID === 'YOUR_APPSHEET_APP_ID' || !APPSHEET_TABLE_NAME || APPSHEET_TABLE_NAME === 'YourFeedTableName') {
     Logger.log('ERROR: AppSheet App ID or Table Name is not configured correctly.');
     return false;
  }
  if (!APPSHEET_COL_DETAILS) {
     Logger.log('ERROR: APPSHEET_COL_DETAILS constant is not defined.');
     return false;
  }

  // Construct API URL
  const encodedTableName = encodeURIComponent(APPSHEET_TABLE_NAME);
  const apiUrl = `https://${APPSHEET_REGION}/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodedTableName}/Action`;

  // Construct Row Payload
  const rowPayload = {
    [APPSHEET_COL_ID]: String(opportunityId),
    [APPSHEET_COL_TIMESTAMP]: new Date().toISOString(),
    [APPSHEET_COL_PROCESSED]: false,
    [APPSHEET_COL_DETAILS]: JSON.stringify(changeDetailsArray) // Send details as JSON string
  };

  // Optional: Include simple summary if provided and column constant exists
  if (changeLogSummary !== undefined && APPSHEET_COL_SUMMARY) {
    rowPayload[APPSHEET_COL_SUMMARY] = String(changeLogSummary);
  }

  // Construct Full Request Body
  const requestBody = {
    "Action": "Add",
    "Properties": { "Locale": "sv-SE" },
    "Rows": [ rowPayload ]
  };

  // Construct Request Options
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'ApplicationAccessKey': apiKey },
    'payload': JSON.stringify(requestBody),
    'muteHttpExceptions': true
  };

  // DEBUG: Log the exact payload being sent
  Logger.log(`DEBUG: Payload being sent to AppSheet: ${options.payload}`);

  // Make API Call
  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Successfully added record ID ${opportunityId} to AppSheet table ${APPSHEET_TABLE_NAME}.`);
      return true;
    } else {
      Logger.log(`Error adding record ID ${opportunityId} to AppSheet. Status: ${responseCode}. Response: ${responseBody}`);
      return false;
    }
  } catch (error) {
    Logger.log(`FATAL ERROR calling AppSheet API for ID ${opportunityId}: ${error}`);
    return false;
  }
};

/**
 * Placeholder function for getting Chat API token (replace with your implementation)
 */
function getToken_1() {
    Logger.log("WARNING: getToken_1() is a placeholder. Replace with your actual token retrieval logic.");
    // Example: return ScriptApp.getOAuthToken(); // If using OAuth
    return "YOUR_CHAT_API_TOKEN"; // Replace or implement
}

/**
 * Placeholder object for Google Chat API calls (replace with actual library/UrlFetch calls)
 */
const Chat1 = { // Renamed placeholder object
    Spaces: {
        Messages: {
            create: (message, spaceName, parameters, headers) => {
                Logger.log(`INFO: Placeholder Chat1.Spaces.Messages.create called for space ${spaceName}.`);
                Logger.log(`INFO: Message Payload: ${JSON.stringify(message)}`);
                // In a real scenario, you would use UrlFetchApp here with the Chat API endpoint
                // const chatApiUrl = `https://chat.googleapis.com/v1/${spaceName}/messages`;
                // const options = { method: 'post', contentType: 'application/json', headers: headers, payload: JSON.stringify(message), muteHttpExceptions: true };
                // const response = UrlFetchApp.fetch(chatApiUrl, options);
                // Logger.log(`Chat API Response Code: ${response.getResponseCode()}`);
                // Logger.log(`Chat API Response Body: ${response.getContentText()}`);
                return { name: "spaces/XYZ/messages/ABC" }; // Placeholder success response
            }
        }
    }
};


/**
 * Creates and sends an informative Google Chat card detailing opportunity changes.
 * Parses detailed changes from a JSON string.
 *
 * @param {string} accountName - The account name for the card header.
 * @param {string} changeDetailsJson - A JSON string representing an array of change objects.
 * @param {string} opportunityDetails - Additional details for the header subtitle (e.g., Opp ID).
 * @param {string} spaceName - The Google Chat space ID to post the card to.
 * @param {string} icon - URL for the header icon.
 * @param {string} date - ISO 8601 date string of the change detection/log time.
 * @param {string} vectorUrl - Optional URL for a button link.
 */
const createFeedCard1 = (
  accountName = "Opportunity Update",
  changeDetailsJson = "[]", // Expecting JSON string from AppSheet [ChangeDetails] column
  opportunityDetails = "",
  spaceName = CHAT_SPACE_ID, // Use constant
  icon = "https://developers.google.com/chat/images/quickstart-app-icon.png",
  date = new Date().toISOString(), // Default to now if not provided
  vectorUrl = ""
) => {
  const token = getToken_1(); // Call updated function name
  if (!token || token === "YOUR_CHAT_API_TOKEN") {
    Logger.log("Cannot send chat card: Invalid token.");
    return false; // Indicate failure
  }
  if (!spaceName || spaceName === "spaces/YOUR_SPACE_ID") {
    Logger.log("Cannot send chat card: Invalid spaceName.");
    return false; // Indicate failure
  }

  // --- Parse the detailed changes ---
  let changeEntries = [];
  try {
    changeEntries = JSON.parse(changeDetailsJson || '[]');
    if (!Array.isArray(changeEntries)) throw new Error("Parsed data is not an array");
  } catch (e) {
    Logger.log(`Error parsing changeDetailsJson: ${e} - JSON received: ${changeDetailsJson}`);
    changeEntries = [{ status: "Error: Could not display change details." }];
  }

  // --- Build the formatted change widgets ---
  const changeWidgets = [];
  if (changeEntries.length > 0) {
    changeEntries.forEach(entry => {
      let changeText = "";
      if (entry.status) {
        changeText = `<b>Status:</b> ${entry.status}`;
      } else if (entry.column) {
        // Represent null/undefined/empty string consistently as (empty)
        const formatValue = (val) => (val !== null && val !== undefined && val !== "") ? `"${val}"` : "<i>(empty)</i>";
        const beforeVal = formatValue(entry.before);
        const afterVal = formatValue(entry.after);
        changeText = `<b>${entry.column}:</b> ${beforeVal} ➔ ${afterVal}`;
      }
      if (changeText) {
        changeWidgets.push({ "textParagraph": { "text": changeText } });
      }
    });
  } else {
    changeWidgets.push({ "textParagraph": { "text": "No specific changes detected or provided." } });
  }

  // --- Format the date ---
  let formattedDate = "Unknown Date";
  try {
    // Format for Sweden locale, using script's timezone
    formattedDate = Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    // Alternatively, specify timezone directly e.g., "Europe/Stockholm"
  } catch (e) {
    Logger.log(`Error formatting date: ${e} - Date received: ${date}`);
     formattedDate = date; // Keep original date string if formatting fails
  }

  // --- Construct the Card ---
  const message = {
    "cardsV2": [{
      "cardId": `opp_update_${opportunityDetails}_${Date.now()}`,
      "card": {
        "header": {
          "title": accountName,
          "subtitle": opportunityDetails,
          "imageUrl": icon,
          "imageType": "CIRCLE"
        },
        "sections": [
          {
             "header": "Changes Detected:", // Add a header to the changes section
             "widgets": changeWidgets // Use the array of widgets built above
          },
          {
             // Section for Date
             "widgets": [
                { "decoratedText": { "text": `Time: ${formattedDate}`, "startIcon": { "knownIcon": "CLOCK" } } }
             ]
          },
          // Optional: Button section
          vectorUrl ? {
            "widgets": [{
              "buttonList": {
                "buttons": [{
                  "text": "Open Opportunity", // More specific text?
                  "icon": { "knownIcon": "OPEN_IN_NEW" },
                  "onClick": { "openLink": { "url": vectorUrl } }
                }]
              }
            }]
          } : null
        ].filter(section => section !== null) // Remove null sections
      }
    }]
  };

  // --- Send the card ---
  const parameters = {}; // Optional parameters like messageReplyOption
  const headers = { 'Authorization': 'Bearer ' + token };

  try {
    Logger.log(`Attempting to send card to Chat space: ${spaceName}`);
    // Use the RENAMED placeholder Chat object call
    Chat1.Spaces.Messages.create(message, spaceName, parameters, headers);
    Logger.log(`Card sent successfully to ${spaceName} for Opp ID ${opportunityDetails}.`);
    return true; // Indicate success
  } catch (e) {
     Logger.log(`Error sending card to Chat space ${spaceName}: ${e}`);
     return false; // Indicate failure
  }
};


// ============================================================================
// Main Execution Function (Version 1)
// ============================================================================

function main_NEW1() {
  Logger.log("Starting main_NEW1 execution...");
  try {
    // --- Get Sheets ---
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet1 = ss.getSheetByName(DEST_SHEET_NAME); // Destination (Opportunities)
    if (!sheet1) throw new Error(`Destination sheet "${DEST_SHEET_NAME}" not found.`);

    const latestSheetId = getLatestSheetId_NEW1(SOURCE_SEARCH_QUERY); // Call updated function name
    if (!latestSheetId) throw new Error('Could not find the latest source sheet.');

    let sheet2; // Source (Latest Export)
    let sourceSpreadsheetName = "Unknown";
    try {
      let sourceSpreadsheet = SpreadsheetApp.openById(latestSheetId);
      sourceSpreadsheetName = sourceSpreadsheet.getName();
      sheet2 = sourceSpreadsheet.getSheets().filter(s => !s.isSheetHidden())[0];
      if (!sheet2) throw new Error(`No visible sheets found in source spreadsheet "${sourceSpreadsheetName}".`);
    } catch (e) {
      throw new Error(`Error opening source spreadsheet ID ${latestSheetId}: ${e}`);
    }
    Logger.log(`Using Destination: "${sheet1.getName()}", Source: "${sheet2.getName()}" from "${sourceSpreadsheetName}"`);

    // --- Get Original Data & Handle Empty Sheet ---
    let originalData = sheet1.getDataRange().getValues();
    if (!originalData || originalData.length < 2) {
      Logger.log(`Destination sheet "${sheet1.getName()}" is empty or has only a header. Updating directly.`);
      updateSheetData_NEW1(sheet2, sheet1); // Call updated function name
      Logger.log("main_NEW1 execution finished (updated empty sheet).");
      return;
    }

    const originalHeader = originalData[0];
    const originalIdIndex = originalHeader.indexOf(ID_COLUMN_NAME);
    if (originalIdIndex === -1) throw new Error(`ID column "${ID_COLUMN_NAME}" not found in ${sheet1.getName()} header.`);
    const originalDataMap = createMapFromArray_NEW1(originalData, originalIdIndex); // Call updated function name
    Logger.log(`Original map created from "${sheet1.getName()}" with ${originalDataMap.size} entries.`);

    // --- Get Accounts Data (Optional, for enrichment) ---
    let accountsDataMap = new Map();
    try {
      const accountsSheet = ss.getSheetByName(ACCOUNTS_SHEET_NAME);
      if (accountsSheet) {
        const accountsData = accountsSheet.getDataRange().getValues();
        accountsDataMap = createMapFromArray_NEW1(accountsData, accountsData[0].indexOf(ACCOUNTS_KEY_COLUMN)); // Call updated function name
        Logger.log(`Accounts data map created from "${ACCOUNTS_SHEET_NAME}" with ${accountsDataMap.size} entries.`);
      } else Logger.log(`Warning: Accounts sheet "${ACCOUNTS_SHEET_NAME}" not found.`);
    } catch (e) { Logger.log(`Error accessing Accounts sheet: ${e}.`); }

    // --- Compare Data ---
    Logger.log(`Comparing original data with source sheet "${sheet2.getName()}"...`);
    const { changes, removedIds, newDataMap, newDataHeader } = findChangesAndRemovedIds1( // Call updated function name
      originalDataMap, sheet2, originalHeader, originalIdIndex, COLUMNS_TO_TRACK
    );

    // --- Process Changes -> Send to AppSheet ---
    if (changes && Object.keys(changes).length > 0) {
      Logger.log(`Processing ${Object.keys(changes).length} IDs with changes/status updates for AppSheet Feed...`);
      for (const id in changes) {
        if (changes.hasOwnProperty(id)) {
          const changeDetails = changes[id]; // Array of change objects for this ID

          // Optional: Generate simple summary if still needed for the 'update' column
          let simpleSummary = "";
          const statusEntry = changeDetails.find(c => c.status);
          if (statusEntry) {
            simpleSummary = `Opportunity ${id} ${statusEntry.status}.`;
          } else {
            const fieldChanges = changeDetails.filter(c => c.column);
            if (fieldChanges.length > 0) {
              simpleSummary = `Opportunity ${id} updated: ${fieldChanges.map(c => `'${c.column}'`).join(', ')} changed.`;
            }
          }

          // Prepare data object for AppSheet API call
          if (changeDetails && changeDetails.length > 0) {
            const dataForAppSheet = {
              id: id,
              details: changeDetails // Pass the detailed array
              // changeLog: simpleSummary // Uncomment this line ONLY if you want to keep populating the 'update' column
            };
            addRecordToAppSheet1(dataForAppSheet); // Call updated function name
          } else {
             Logger.log(`Skipping AppSheet add for ID ${id} - no details found.`);
          }
        }
      }
      Logger.log("Finished processing changes for AppSheet Feed.");
    } else {
      Logger.log("No changes, additions, or removals identified for AppSheet Feed.");
    }

    // --- Delete Removed Rows from Destination ---
    if (removedIds && removedIds.size > 0) {
      Logger.log(`Calling explicit deletion for ${removedIds.size} rows from "${sheet1.getName()}"...`);
      deleteRowsById_NEW1(sheet1, originalIdIndex, removedIds); // Call updated function name
    }

    // --- Overwrite Destination with Source Data ---
    Logger.log(`Updating "${sheet1.getName()}" to match "${sheet2.getName()}"...`);
    const updateSuccess = updateSheetData_NEW1(sheet2, sheet1); // Call updated function name
    if (!updateSuccess) Logger.log(`!!! Failed to update "${sheet1.getName()}". Sheet may be inconsistent.`);

    Logger.log("main_NEW1 execution finished successfully.");

  } catch (error) {
    Logger.log(`!!!!!!!!!! Critical Error in main_NEW1 !!!!!!!!!!!`);
    Logger.log(`Error: ${error}`);
    Logger.log(`Stack Trace: ${error.stack}`);
    Logger.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  }
}