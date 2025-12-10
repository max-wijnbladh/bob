// ============================================================================
// --- NEW: FUNCTIONS FOR ARCHIVING REMOVED OPPORTUNITIES ---
// ============================================================================

/**
 * Queries the AppSheet API to get all feed history for a specific opportunity ID.
 * @param {string} opportunityId The ID of the opportunity to get history for.
 * @return {Array|null} An array of feed record objects, or null on failure.
 */

// --- NEW: Configuration for Archiving Removed Opportunities ---
const ARCHIVE_FOLDER_ID = "1rk6J3h0ywyFYo2NxPZadUpWUX9df_QT3"; // <-- IMPORTANT: Set this ID

function getFeedHistoryForOpportunity_(opportunityId) {
  Logger.log(`getFeedHistoryForOpportunity_: Fetching history for ID '${opportunityId}'`);
  const apiKey = getAppSheetAccessKey_();
  if (!apiKey) return null;

  // This uses the 'find' endpoint which is designed for querying records
  const url = `https://${APPSHEET_REGION}/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/find`;

  const payload = {
    "Query": `[${APPSHEET_COL_ID}] = "${opportunityId}"`,
    "Properties": {
      "Locale": "en-US",
      "Sort": [{ "Column": APPSHEET_COL_TIMESTAMP, "SortOrder": "Ascending" }]
    }
  };

  const options = {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'ApplicationAccessKey': apiKey
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const records = JSON.parse(responseBody);
      Logger.log(`SUCCESS: Found ${records.length} feed records for opportunity ID ${opportunityId}.`);
      return records;
    } else {
      Logger.log(`ERROR: AppSheet API query for history failed. Code: ${responseCode}. Response: ${responseBody}`);
      return null;
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR in getFeedHistoryForOpportunity_ for ID ${opportunityId}: ${e.toString()}`);
    return null;
  }
}

/**
 * Creates a Google Doc summarizing a removed opportunity.
 * @param {string} opportunityId The ID of the removed opportunity.
 * @param {Array} opportunityData The final row of data for the opportunity.
 * @param {Array} header The header row corresponding to the data.
 * @param {Array|null} feedHistory An array of historical feed updates.
 */
function archiveRemovedOpportunity(opportunityId, opportunityData, header, feedHistory) {
  Logger.log(`archiveRemovedOpportunity: Starting archive process for ID '${opportunityId}'`);
  if (ARCHIVE_FOLDER_ID === "PASTE_YOUR_ARCHIVE_FOLDER_ID_HERE" || !ARCHIVE_FOLDER_ID) {
    Logger.log("ERROR: ARCHIVE_FOLDER_ID is not set. Cannot create document.");
    return;
  }

  try {
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docName = `Removed Opportunity Summary - ${opportunityId} - ${timestamp}`;
    
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();

    // --- Define Styles ---
    const styles = {};
    styles[DocumentApp.Attribute.HEADING1] = { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 16, [DocumentApp.Attribute.SPACING_AFTER]: 12 };
    styles[DocumentApp.Attribute.HEADING2] = { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 13, [DocumentApp.Attribute.SPACING_BEFORE]: 12, [DocumentApp.Attribute.SPACING_AFTER]: 6 };
    const boldStyle = { [DocumentApp.Attribute.BOLD]: true };
    
    // --- Populate Document (Corrected) ---
    body.setMarginTop(72).setMarginBottom(72).setMarginLeft(72).setMarginRight(72);

    body.appendParagraph(`Opportunity Archive: ${opportunityId}`)
        .setAttributes(styles[DocumentApp.Attribute.HEADING1]);
    body.appendParagraph(`This summary was generated on ${new Date().toLocaleString()} following the opportunity's removal from the source data.`).setItalic(true);

    // Section 1: Final Details
    body.appendParagraph("Final Opportunity Details")
        .setAttributes(styles[DocumentApp.Attribute.HEADING2]);

    for (let i = 0; i < header.length; i++) {
      const fieldName = header[i];
      let fieldValue = opportunityData[i];
      if (fieldValue instanceof Date) {
        fieldValue = fieldValue.toLocaleString();
      } else if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
        fieldValue = "N/A";
      }
      const p = body.appendParagraph('');
      p.appendText(`${fieldName}: `).setAttributes(boldStyle);
      p.appendText(String(fieldValue));
    }

    // Section 2: Historical Feed Updates
    body.appendParagraph("Historical Feed Updates")
        .setAttributes(styles[DocumentApp.Attribute.HEADING2]);

    if (feedHistory && feedHistory.length > 0) {
      feedHistory.forEach(record => {
        const date = record[APPSHEET_COL_TIMESTAMP] ? new Date(record[APPSHEET_COL_TIMESTAMP]).toLocaleString() : 'No Date';
        const update = record[APPSHEET_COL_SUMMARY] || 'No summary text.';
        const li = body.appendListItem(`[${date}] - ${update}`);
        li.setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    } else {
      body.appendParagraph("No feed history could be retrieved for this opportunity.");
    }

    // --- Save and Move File ---
    doc.saveAndClose();
    const docFile = DriveApp.getFileById(doc.getId());
    archiveFolder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);

    Logger.log(`SUCCESS: Created archive document for '${opportunityId}' in folder '${archiveFolder.getName()}'. URL: ${doc.getUrl()}`);

  } catch (e) {
    Logger.log(`CRITICAL ERROR in archiveRemovedOpportunity for ID ${opportunityId}: ${e.toString()}\nStack: ${e.stack}`);
  }
}