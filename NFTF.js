/**
 * The folder ID where removed opportunity archives are stored.
 * @type {string}
 */
const ARCHIVE_FOLDER_ID = "1rk6J3h0ywyFYo2NxPZadUpWUX9df_QT3";

/**
 * Queries the AppSheet API to get all feed history for a specific opportunity ID.
 * 
 * @param {string} opportunityId The ID of the opportunity to get history for.
 * @returns {Array|null} An array of feed record objects, or null on failure.
 */
function getFeedHistoryForOpportunity_(opportunityId) {
  const apiKey = getAppSheetAccessKey_();
  if (!apiKey) return null;

  const url = `https://${APPSHEET_REGION}/api/v2/apps/${APPSHEET_APP_ID}/tables/${encodeURIComponent(APPSHEET_TABLE_NAME)}/find`;

  const payload = {
    Query: `[${APPSHEET_COL_ID}] = "${opportunityId}"`,
    Properties: {
      Locale: "en-US",
      Sort: [{ Column: APPSHEET_COL_TIMESTAMP, SortOrder: "Ascending" }]
    }
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'ApplicationAccessKey': apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const records = JSON.parse(responseBody);
      Logger.log(`Found ${records.length} feed records for opportunity ID ${opportunityId}.`);
      return records;
    } else {
      Logger.log(`AppSheet API query failed. Code: ${responseCode}, Response: ${responseBody}`);
      return null;
    }
  } catch (e) {
    Logger.log(`Error fetching feed history for ID ${opportunityId}: ${e.toString()}`);
    return null;
  }
}

/**
 * Creates a Google Doc summarizing a removed opportunity.
 * 
 * @param {string} opportunityId The ID of the removed opportunity.
 * @param {Array} opportunityData The final row of data for the opportunity.
 * @param {Array} header The header row corresponding to the data.
 * @param {Array|null} feedHistory An array of historical feed updates.
 */
function archiveRemovedOpportunity(opportunityId, opportunityData, header, feedHistory) {
  if (ARCHIVE_FOLDER_ID === "PASTE_YOUR_ARCHIVE_FOLDER_ID_HERE" || !ARCHIVE_FOLDER_ID) {
    Logger.log("ARCHIVE_FOLDER_ID is not set. Cannot create document.");
    return;
  }

  try {
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    const timestamp = new Date().toISOString().split('T')[0];
    const docName = `Removed Opportunity Summary - ${opportunityId} - ${timestamp}`;
    
    const doc = DocumentApp.create(docName);
    const body = doc.getBody();

    const styles = {
      HEADING1: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 16, [DocumentApp.Attribute.SPACING_AFTER]: 12 },
      HEADING2: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 13, [DocumentApp.Attribute.SPACING_BEFORE]: 12, [DocumentApp.Attribute.SPACING_AFTER]: 6 },
      BOLD: { [DocumentApp.Attribute.BOLD]: true }
    };
    
    body.setMarginTop(72).setMarginBottom(72).setMarginLeft(72).setMarginRight(72);

    body.appendParagraph(`Opportunity Archive: ${opportunityId}`).setAttributes(styles.HEADING1);
    body.appendParagraph(`This summary was generated on ${new Date().toLocaleString()} following the opportunity's removal from the source data.`).setItalic(true);

    body.appendParagraph("Final Opportunity Details").setAttributes(styles.HEADING2);

    for (let i = 0; i < header.length; i++) {
      const fieldName = header[i];
      let fieldValue = opportunityData[i];
      if (fieldValue instanceof Date) {
        fieldValue = fieldValue.toLocaleString();
      } else if (!fieldValue) {
        fieldValue = "N/A";
      }
      const p = body.appendParagraph('');
      p.appendText(`${fieldName}: `).setAttributes(styles.BOLD);
      p.appendText(String(fieldValue));
    }

    body.appendParagraph("Historical Feed Updates").setAttributes(styles.HEADING2);

    if (feedHistory && feedHistory.length > 0) {
      feedHistory.forEach(record => {
        const date = record[APPSHEET_COL_TIMESTAMP] ? new Date(record[APPSHEET_COL_TIMESTAMP]).toLocaleString() : 'No Date';
        const update = record[APPSHEET_COL_SUMMARY] || 'No summary text.';
        body.appendListItem(`[${date}] - ${update}`).setGlyphType(DocumentApp.GlyphType.BULLET);
      });
    } else {
      body.appendParagraph("No feed history could be retrieved for this opportunity.");
    }

    doc.saveAndClose();
    const docFile = DriveApp.getFileById(doc.getId());
    archiveFolder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);

    Logger.log(`Created archive document for '${opportunityId}' in folder '${archiveFolder.getName()}'. URL: ${doc.getUrl()}`);

  } catch (e) {
    Logger.log(`Error archiving opportunity ID ${opportunityId}: ${e.toString()}\nStack: ${e.stack}`);
  }
}
