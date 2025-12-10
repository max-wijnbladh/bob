/**
 * ============================================================================
 * Version: Full Script with AppSheet API Implementation
 * Date: Jul 3, 2025
 * Notes: Restored full helper function logic and corrected main_NEW().
 * ============================================================================
 */

// Global constants for common ID column names
const DEFAULT_OPPORTUNITY_ID_COL_NAME = 'opportunities.opportunity_id';
const DEFAULT_ACTIVITY_ID_COL_NAME = 'activities.id';

// ============================================================================
// APPSHEET API CONFIGURATION (GLOBAL DEFAULTS)
// ============================================================================
const APPSHEET_APP_ID = '83c66dfc-3578-4806-89b0-8b7da3ab6350'; // User Provided
const APPSHEET_TABLE_NAME = 'Feed'; // User Provided - For Opportunities Feed & Default Activities Feed
const APPSHEET_REGION = 'www.appsheet.com'; // User Provided

const APPSHEET_COL_ID = 'opportunities.opportunity_id'; // User Provided - Default for Opportunities in Feed
const APPSHEET_COL_SUMMARY = 'update';                 // User Provided
const APPSHEET_COL_TIMESTAMP = 'date';                 // User Provided
const APPSHEET_COL_PROCESSED = 'shared';               // User Provided

function getAppSheetAccessKey_() {
  const apiKey = "V2-mbQl8-Vgl2n-tIEmF-4Qbbl-AswcX-QnbRh-SSdYd-kuCfr"; // User Provided
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.length < 20) {
    Logger.log("ERROR: getAppSheetAccessKey_: AppSheet API Key invalid or placeholder.");
    return null;
  }
  return apiKey;
}

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */
const safeLog_NEW = (value) => {
  if (value !== undefined) Logger.log(value);
  else Logger.log("safeLog_NEW received undefined value.");
};

const recordChange_NEW = (changes, id, columnName, before, after, status) => {
  if (!id) { Logger.log("WARN: recordChange_NEW: Invalid ID. Skipping."); return changes; }
  if (!changes[id]) changes[id] = [];
  const entry = { changeLog: "", date: new Date() };
  if (columnName) entry.column = columnName;
  if (before !== undefined) entry.before = before;
  if (after !== undefined) entry.after = after;
  if (status) entry.status = status;
  changes[id].push(entry);
  return changes;
};

const createMapFromArray_NEW = (array, keyIndex) => {
  Logger.log(`createMapFromArray_NEW: Starting. Input array has ${array ? array.length : 'null'} rows. Key index: ${keyIndex}`);
  if (!array || array.length < 1) { Logger.log('createMapFromArray_NEW: Input array empty/undefined. Returning empty map.'); return new Map(); }
  const header = array[0];
  Logger.log(`createMapFromArray_NEW: Header: ${JSON.stringify(header)}`);
  if (!header || keyIndex < 0 || keyIndex >= header.length) { Logger.log(`ERROR: createMapFromArray_NEW: keyIndex ${keyIndex} out of bounds for header. Returning empty map.`); return new Map(); }
  const map = new Map();
  let skipped = 0, duplicates = 0, invalidKeys = 0;
  for (let i = 1; i < array.length; i++) {
    const row = array[i];
    if (row && row.length > keyIndex) {
      const key = row[keyIndex];
      if (key !== null && key !== undefined && key !== "") {
        if (map.has(key)) { Logger.log(`createMapFromArray_NEW: Duplicate key "${key}" at row ${i + 1}. Overwriting.`); duplicates++; }
        map.set(key, row);
      } else { Logger.log(`createMapFromArray_NEW: Invalid/empty key at row ${i + 1}. Skipping.`); invalidKeys++; }
    } else { Logger.log(`createMapFromArray_NEW: Row ${i + 1} short/invalid. Skipping.`); skipped++; }
  }
  Logger.log(`createMapFromArray_NEW: Finished. Map size: ${map.size}. Duplicates: ${duplicates}, InvalidKeys: ${invalidKeys}, SkippedRows: ${skipped}.`);
  return map;
};

function removeDuplicateChanges_NEW(changes) {
  Logger.log(`removeDuplicateChanges_NEW: Starting for ${Object.keys(changes).length} IDs.`);
  const uniqueChanges = {};
  for (const id in changes) {
    if (changes.hasOwnProperty(id)) {
      const entries = changes[id]; const lastSeen = new Map();
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i]; const key = entry.status ? `status_${entry.status}` : entry.column;
        if (key && !lastSeen.has(key)) lastSeen.set(key, entry);
      }
      uniqueChanges[id] = Array.from(lastSeen.values()).reverse();
    }
  }
  Logger.log(`removeDuplicateChanges_NEW: Finished. Returning for ${Object.keys(uniqueChanges).length} IDs.`);
  return uniqueChanges;
}

const writeJsonToSheet_NEW = (jsonData, feedSheetId, feedSheetName) => {
  Logger.log(`writeJsonToSheet_NEW: ID: ${jsonData?.id}, Target: ${feedSheetName} (SID: ${feedSheetId})`);
  if (!feedSheetId || !feedSheetName) { Logger.log(`ERROR: writeJsonToSheet_NEW: feedSheetId/Name missing.`); return; }
  let sheet;
  try {
    const ss = SpreadsheetApp.openById(feedSheetId); sheet = ss.getSheetByName(feedSheetName);
    if (!sheet) { Logger.log(`ERROR: Sheet '${feedSheetName}' not found in SID ${feedSheetId}.`); return; }
  } catch (e) { Logger.log(`ERROR accessing Feed sheet: ${e}`); return; }
  if (!jsonData || jsonData.id === undefined || jsonData.changeLog === undefined) { Logger.log(`ERROR: Invalid jsonData: ${JSON.stringify(jsonData)}.`); return; }
  const dataToWrite = [[String(jsonData.id), String(jsonData.changeLog), new Date(), 'FALSE']];
  try {
    sheet.insertRowsBefore(2, 1); const range = sheet.getRange(2, 1, 1, dataToWrite[0].length);
    range.setValues(dataToWrite); sheet.getRange(2, 3, 1, 1).setNumberFormat('yyyy-MM-dd HH:mm:ss');
    Logger.log(`writeJsonToSheet_NEW: Wrote data for ID ${jsonData.id}.`);
  } catch (error) { Logger.log(`ERROR writing to Feed for ID ${jsonData.id}: ${error}`); }
};

const updateSheetData_NEW = (sourceSheet, destinationSheet) => {
  Logger.log(`updateSheetData_NEW: From "${sourceSheet.getName()}" to "${destinationSheet.getName()}".`);
  if (!sourceSheet || !destinationSheet) { Logger.log('ERROR: updateSheetData_NEW: Invalid sheet(s).'); return false; }
  try {
    const sourceData = sourceSheet.getDataRange().getValues();
    const numSourceRows = sourceData.length; const numSourceCols = numSourceRows > 0 ? sourceData[0].length : 0;
    Logger.log(`updateSheetData_NEW: Source has ${numSourceRows}r, ${numSourceCols}c.`);
    destinationSheet.clearContents(); Logger.log(`updateSheetData_NEW: Cleared "${destinationSheet.getName()}".`);
    if (numSourceRows > 0 && numSourceCols > 0) {
      destinationSheet.getRange(1, 1, numSourceRows, numSourceCols).setValues(sourceData);
      Logger.log(`INFO: Updated "${destinationSheet.getName()}" with ${numSourceRows}r.`);
    } else { Logger.log(`WARN: Source "${sourceSheet.getName()}" empty. Dest cleared.`); }
    return true;
  } catch (error) { Logger.log(`ERROR updating "${destinationSheet.getName()}": ${error}`); return false; }
};

const findChangesAndRemovedIds = (
  originalDataMap, sourceDataArrayWithHeader, headerForOriginalDataMapRows,
  idIndexInOriginalDataMapRows, columnsToTrack, idColumnToUse
) => {
  Logger.log(`findChangesAndRemovedIds: Start. Original map: ${originalDataMap.size}. ID Col: "${idColumnToUse}".`);
  Logger.log(`findChangesAndRemovedIds: Original Header (for map value interpretation): ${JSON.stringify(headerForOriginalDataMapRows)}`);
  Logger.log(`findChangesAndRemovedIds: Tracked Cols: ${JSON.stringify(columnsToTrack)}`);

  if (!sourceDataArrayWithHeader || sourceDataArrayWithHeader.length < 1) {
    Logger.log(`WARN: findChangesAndRemovedIds: Source data empty/no header.`);
    const allOriginalIds = new Set(originalDataMap.keys()); const emptyChanges = {};
    if (allOriginalIds.size > 0) {
      for (const id of allOriginalIds) emptyChanges[id] = [{ status: `Entry removed (Source data empty)` }];
    }
    return { changes: emptyChanges, removedIds: allOriginalIds, newDataMap: new Map(), newDataHeader: (sourceDataArrayWithHeader && sourceDataArrayWithHeader[0] ? sourceDataArrayWithHeader[0] : []) };
  }
  const header2_source = sourceDataArrayWithHeader[0];
  const idIndex2_in_source = header2_source.indexOf(idColumnToUse);
  Logger.log(`findChangesAndRemovedIds: Source Header: ${JSON.stringify(header2_source)}. ID Index in Source: ${idIndex2_in_source}`);
  if (idIndex2_in_source === -1) {
    Logger.log(`ERROR: findChangesAndRemovedIds: ID Col "${idColumnToUse}" NOT in source header.`);
    return { changes: {}, removedIds: new Set(), newDataMap: new Map(), newDataHeader: header2_source };
  }
  const dataMap2_source = sourceDataArrayWithHeader.length > 1 ? createMapFromArray_NEW(sourceDataArrayWithHeader, idIndex2_in_source) : new Map();
  Logger.log(`findChangesAndRemovedIds: New data map (dataMap2_source) size: ${dataMap2_source.size}.`);
  
  let changes = {}; const processedNewIds = new Set();
  Logger.log(`findChangesAndRemovedIds: Comparing ${dataMap2_source.size} new entries...`);
  for (const [currentId, rowData2_source] of dataMap2_source.entries()) {
    processedNewIds.add(currentId);
    Logger.log(`findChangesAndRemovedIds: Processing ID: "${currentId}" from new source.`);
    if (originalDataMap.has(currentId)) {
      const rowData1_original = originalDataMap.get(currentId);
      Logger.log(`findChangesAndRemovedIds: --> ID "${currentId}" in original. Comparing fields...`);
      for (const columnName of columnsToTrack) {
        const colIndex1 = headerForOriginalDataMapRows.indexOf(columnName);
        const colIndex2 = header2_source.indexOf(columnName);
        if (colIndex1 !== -1 && colIndex2 !== -1) {
          let v1 = rowData1_original[colIndex1], v2 = rowData2_source[colIndex2];
          Logger.log(`findChangesAndRemovedIds: ---- Col '${columnName}': Old='${v1}'(T:${typeof v1}), New='${v2}'(T:${typeof v2})`);
          let changed = false;
          if (v1 instanceof Date || v2 instanceof Date) {
            if ((v1 instanceof Date ? v1.getTime() : String(v1??"")) !== (v2 instanceof Date ? v2.getTime() : String(v2??""))) changed = true;
          } else if (String(v1??"") !== String(v2??"")) changed = true;
          if (changed) {
            Logger.log(`findChangesAndRemovedIds: ---->> CHANGE for '${columnName}' on ID "${currentId}"`);
            changes = recordChange_NEW(changes, currentId, columnName, v1, v2, null);
          }
        } else if (columnsToTrack.includes(columnName)) Logger.log(`WARN: Col '${columnName}' missing in a header for ID ${currentId}. OriginalIdx: ${colIndex1}, SourceIdx: ${colIndex2}`);
      }
    } else {
      Logger.log(`findChangesAndRemovedIds: --> ID "${currentId}" is NEW.`);
      changes = recordChange_NEW(changes, currentId, null, null, null, 'New entry added');
    }
  }
  const removedIds = new Set();
  Logger.log(`findChangesAndRemovedIds: Checking ${originalDataMap.size} original IDs for removals...`);
  for (const id_original of originalDataMap.keys()) {
    if (!processedNewIds.has(id_original)) {
      removedIds.add(id_original);
      Logger.log(`findChangesAndRemovedIds: --> REMOVAL: ID "${id_original}"`);
      changes = recordChange_NEW(changes, id_original, null, null, null, 'Entry removed');
    }
  }
  const finalChanges = removeDuplicateChanges_NEW(changes);
  Logger.log(`findChangesAndRemovedIds: Summary: Changes for ${Object.keys(finalChanges).length} IDs. Removed: ${removedIds.size} IDs.`);
  Logger.log(`findChangesAndRemovedIds: Final Changes (keys="${idColumnToUse}"): ${JSON.stringify(finalChanges)}`);
  Logger.log(`findChangesAndRemovedIds: Removed IDs ("${idColumnToUse}"): ${JSON.stringify(Array.from(removedIds))}`);
  return { changes: finalChanges, removedIds: removedIds, newDataMap: dataMap2_source, newDataHeader: header2_source };
};

// ======================= FULLY IMPLEMENTED APPSHEET FUNCTIONS =======================
const addRecordToAppSheet = (jsonData, appSheetConfigOverride = null) => {
  const config = appSheetConfigOverride || {
    APP_ID: APPSHEET_APP_ID, TABLE_NAME: APPSHEET_TABLE_NAME, REGION: APPSHEET_REGION,
    COL_ID: APPSHEET_COL_ID, COL_SUMMARY: APPSHEET_COL_SUMMARY,
    COL_TIMESTAMP: APPSHEET_COL_TIMESTAMP, COL_PROCESSED: APPSHEET_COL_PROCESSED
  };
  Logger.log(`addRecordToAppSheet: Adding ID ${jsonData.id} to table '${config.TABLE_NAME}'`);

  const apiKey = getAppSheetAccessKey_();
  if (!apiKey) return;

  const url = `https://${config.REGION}/api/v2/apps/${config.APP_ID}/tables/${encodeURIComponent(config.TABLE_NAME)}/Action`;
  
  const newRow = {};
  newRow[config.COL_ID] = jsonData.id;
  newRow[config.COL_SUMMARY] = jsonData.changeLog;
  newRow[config.COL_TIMESTAMP] = new Date().toISOString();
  newRow[config.COL_PROCESSED] = 'FALSE';
  
  const payload = {
    "Action": "Add",
    "Properties": { "Locale": "en-US" },
    "Rows": [newRow]
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
    Logger.log(`addRecordToAppSheet: Sending request to ${url} with payload: ${JSON.stringify(payload)}`);
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    if (responseCode === 200) {
      Logger.log(`SUCCESS: AppSheet API call for ID ${jsonData.id} successful. Response: ${responseBody}`);
    } else {
      Logger.log(`ERROR: AppSheet API call for ID ${jsonData.id} failed. Code: ${responseCode}. Response: ${responseBody}`);
    }
  } catch (e) {
    Logger.log(`CRITICAL ERROR in addRecordToAppSheet for ID ${jsonData.id}: ${e.toString()}`);
  }
};

function deleteRowsById_NEW(idsToDelete, appSheetConfig) {
    if (!idsToDelete || idsToDelete.size === 0) {
        Logger.log("deleteRowsById_NEW: No IDs provided for deletion. Skipping.");
        return;
    }
    const apiKey = getAppSheetAccessKey_();
    if (!apiKey) return;
    if (!appSheetConfig || !appSheetConfig.APP_ID || !appSheetConfig.TABLE_NAME || !appSheetConfig.COL_ID) {
        Logger.log("ERROR: deleteRowsById_NEW: Invalid AppSheet config provided.");
        return;
    }

    const url = `https://${appSheetConfig.REGION || APPSHEET_REGION}/api/v2/apps/${appSheetConfig.APP_ID}/tables/${encodeURIComponent(appSheetConfig.TABLE_NAME)}/Action`;

    const rowsToDelete = Array.from(idsToDelete).map(id => {
        const rowKey = {};
        rowKey[appSheetConfig.COL_ID] = id; // Assumes COL_ID is the key in the target table
        return rowKey;
    });

    const payload = {
        "Action": "Delete",
        "Properties": { "Locale": "en-US" },
        "Rows": rowsToDelete
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
        Logger.log(`deleteRowsById_NEW: Deleting ${rowsToDelete.length} rows from table '${appSheetConfig.TABLE_NAME}'. Payload: ${JSON.stringify(payload)}`);
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseBody = response.getContentText();
        if (responseCode === 200) {
            Logger.log(`SUCCESS: AppSheet deletion successful. Response: ${responseBody}`);
        } else {
            Logger.log(`ERROR: AppSheet deletion failed. Code: ${responseCode}. Response: ${responseBody}`);
        }
    } catch (e) {
        Logger.log(`CRITICAL ERROR in deleteRowsById_NEW: ${e.toString()}`);
    }
}
// =================================================================================

function findLatestOpportunitySheet(title = "Opportunities mawi@") {
  Logger.log(`findLatestOpportunitySheet: Starting search: "${title}"`);
  var query = `title contains '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  Logger.log(`findLatestOpportunitySheet: Query: ${query}`);
  var regex = new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + " (\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3,}Z)");
  Logger.log(`findLatestOpportunitySheet: Regex: ${regex}`);
  var matchingFiles = [], filesFound = 0, nonMatchingNames = [];
  try {
    var files = DriveApp.searchFiles(query);
    while (files.hasNext()) {
      var file = files.next(); filesFound++; var fileName = file.getName(); var match = regex.exec(fileName);
      if (match && match[1]) {
        var timestampStr = match[1];
        try {
          var currentTimestamp = new Date(timestampStr);
          if (!isNaN(currentTimestamp.getTime())) matchingFiles.push({ file: file, timestamp: currentTimestamp });
          else { Logger.log(`WARN: findLatestOpportunitySheet: Bad date parse: "${timestampStr}" in file: ${fileName}`); nonMatchingNames.push(fileName + "(DateParseFail)");}
        } catch (e) { Logger.log(`ERROR: findLatestOpportunitySheet: Date parse exception for ${fileName}, ts:"${timestampStr}". Err:${e}`); nonMatchingNames.push(fileName + "(DateException)");}
      } else { Logger.log(`findLatestOpportunitySheet: File "${fileName}" query OK, regex FAIL.`); nonMatchingNames.push(fileName + "(RegexFail)");}
    }
    Logger.log(`findLatestOpportunitySheet: Checked ${filesFound} files from query.`);
    if (nonMatchingNames.length > 0) Logger.log(`findLatestOpportunitySheet: ${nonMatchingNames.length} failed regex/date (first 5): ${JSON.stringify(nonMatchingNames.slice(0,5))}...`);
    if (matchingFiles.length === 0) { Logger.log("WARN: findLatestOpportunitySheet: No files fully matched pattern."); return { latest: null, olderFiles: [] };}
    matchingFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const latestEntry = matchingFiles[0]; const olderEntries = matchingFiles.slice(1);
    Logger.log(`INFO: Found ${matchingFiles.length} valid files. Latest: '${latestEntry.file.getName()}' (TS:${latestEntry.timestamp.toISOString()}). ${olderEntries.length} older.`);
    Logger.log(`findLatestOpportunitySheet: Finished successfully.`);
    return { latest: latestEntry.file, olderFiles: olderEntries.map(e => e.file) };
  } catch (e) { Logger.log(`ERROR: findLatestOpportunitySheet: Uncaught error: ${e}\nStack:${e.stack}`); return { latest: null, olderFiles: [] };}
}

function deleteOldOpportunitySheets(filesToDelete) {
  Logger.log(`deleteOldOpportunitySheets: Trashing disabled. Would process ${filesToDelete?.length || 0} file(s).`);
  return;
}

/**
 * ============================================================================
 * Main Orchestration Functions
 * ============================================================================
 */

function main_NEW() { // For Opportunities
  const SPREADSHEET_ID = '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const DEST_SHEET_NAME = 'Opportunities';
  const SOURCE_SHEET_PREFIX = "Opportunities mawi@";
  const ID_COLUMN_NAME = DEFAULT_OPPORTUNITY_ID_COL_NAME;
  const COLUMNS_TO_TRACK = [
    "opportunities.forecast_category_name",
    "opportunities.next_step", "opportunities.stage_name",
    "opportunities.business_need", "opportunities.deal_blocker",
  ];
  const USE_APPSHEET_API_FOR_FEED = true;

  Logger.log(`================ Starting main_NEW (Opportunities) [${new Date().toLocaleString()}] ================`);
  try {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet1_dest = ss.getSheetByName(DEST_SHEET_NAME);
    if (!sheet1_dest) { Logger.log(`ERROR: Dest sheet "${DEST_SHEET_NAME}" not found. Aborting.`); return; }

    // Using the robust findLatestOpportunitySheet function
    const findResultOpps = findLatestOpportunitySheet(SOURCE_SHEET_PREFIX);
    const { latest: latestSourceFile, olderFiles } = findResultOpps;
    if (!latestSourceFile) { Logger.log(`INFO: No new source Opps sheet found.`); return; }

    let sheet2_opps_source_raw_sheet_obj;
    try {
      sheet2_opps_source_raw_sheet_obj = SpreadsheetApp.openById(latestSourceFile.getId()).getSheets().filter(s => !s.isSheetHidden())[0];
      if (!sheet2_opps_source_raw_sheet_obj) { Logger.log(`ERROR: No visible sheets in source Opps file. Aborting.`); return; }
    } catch (e) { Logger.log(`ERROR opening source Opps spreadsheet: ${e}. Aborting.`); return; }
    Logger.log(`main_NEW: Dest: "${sheet1_dest.getName()}", Source: "${sheet2_opps_source_raw_sheet_obj.getName()}" from "${latestSourceFile.getName()}"`);

    let originalData = sheet1_dest.getDataRange().getValues();
    if (!originalData || originalData.length < 2) {
      Logger.log(`WARN: Dest Opps sheet empty. Direct update.`);
      updateSheetData_NEW(sheet2_opps_source_raw_sheet_obj, sheet1_dest);
      // deleteOldOpportunitySheets(olderFiles); // Trashing disabled
      Logger.log(`================ main_NEW (Opps) finished (empty dest) ================`); return;
    }
    const originalHeader = originalData[0];
    const originalIdIndex = originalHeader.indexOf(ID_COLUMN_NAME);
    if (originalIdIndex === -1) { Logger.log(`ERROR: ID "${ID_COLUMN_NAME}" not in dest Opps header. Aborting.`); return; }
    const originalDataMap = createMapFromArray_NEW(originalData, originalIdIndex);
    
    const sourceOppsDataArray = sheet2_opps_source_raw_sheet_obj.getDataRange().getValues();
    if (!sourceOppsDataArray || sourceOppsDataArray.length === 0) { Logger.log("ERROR: Source Opps sheet empty. Aborting."); return; }

    const { changes, removedIds } = findChangesAndRemovedIds(
      originalDataMap, sourceOppsDataArray, originalHeader, originalIdIndex, COLUMNS_TO_TRACK, ID_COLUMN_NAME
    );
    Logger.log(`main_NEW: Opps Changes: ${Object.keys(changes).length} IDs, Removed: ${removedIds.size}.`);
    
// ======================= REPLACEMENT FOR FEED PROCESSING BLOCK =======================

    // --- Process Updates (for existing or new entries) ---
    if (Object.keys(changes).length > 0) {
      for (const oppId in changes) {
        if (changes.hasOwnProperty(oppId)) {
          // Skip removed entries here; they will be handled by the archive block below
          if (removedIds.has(oppId)) continue; 
          
          const changeEntries = changes[oppId];
          const summaries = changeEntries.map(entry => {
            if (entry.status) {
              return `${entry.status} (ID: ${oppId})`;
            } else if (entry.column) {
              const changeDetails = { column: entry.column, from: entry.before, to: entry.after };
              const prompt = `An opportunity was updated. Describe the following change in simple, natural language. For example, if the stage changes, say 'The stage moved to Proposal.' instead of just listing the values. Do not include what the value was previously, just the new status. Here is the change: ${JSON.stringify(changeDetails)}`;
              return generate(prompt); // Your existing LLM call
            }
            return '';
          }).filter(s => s);

          const finalSummary = summaries.join('; ');
          const dataForFeed = { id: oppId, changeLog: finalSummary };
          
          Logger.log(`Feed Entry for ${oppId}: ${finalSummary}`);
          if (USE_APPSHEET_API_FOR_FEED) {
            addRecordToAppSheet(dataForFeed, null); // Use default config
          } else {
            writeJsonToSheet_NEW(dataForFeed, SPREADSHEET_ID, 'Feed');
          }
        }
      }
    }
    
    // --- NEW: HANDLE AND ARCHIVE REMOVED OPPORTUNITIES ---
    if (removedIds && removedIds.size > 0) {
      Logger.log(`--- Starting Archive Process for ${removedIds.size} Removed Opportunities ---`);
      for (const removedId of removedIds) {
        // 1. Get the final data of the opportunity before it was removed
        const opportunityData = originalDataMap.get(removedId);
        if (!opportunityData) {
          Logger.log(`WARN: Could not find original data for removed ID '${removedId}'. Skipping archive.`);
          continue;
        }

        // 2. Fetch its entire history from the AppSheet feed
        const feedHistory = getFeedHistoryForOpportunity_(removedId);

        // 3. Create the archive document
        archiveRemovedOpportunity(removedId, opportunityData, originalHeader, feedHistory);
        
        // 4. Also add one final "Entry removed" message to the feed
        const removalFeedData = { id: removedId, changeLog: `Entry removed: A final summary document has been archived.` };
        if (USE_APPSHEET_API_FOR_FEED) {
            addRecordToAppSheet(removalFeedData, null);
        } else {
            writeJsonToSheet_NEW(removalFeedData, SPREADSHEET_ID, 'Feed');
        }
      }
      Logger.log(`--- Finished Archive Process ---`);
    }
// ===============================================================================
    
    if (USE_APPSHEET_API_FOR_FEED && removedIds && removedIds.size > 0) {
       // Optional: configure and call deleteRowsById_NEW if you have a main AppSheet data table for Opps
    }
    
    updateSheetData_NEW(sheet2_opps_source_raw_sheet_obj, sheet1_dest);
    // if (updateSuccess) deleteOldOpportunitySheets(olderFiles); // Trashing disabled

    Logger.log(`================ main_NEW (Opps) finished [${new Date().toLocaleString()}] ================`);
  } catch (error) { Logger.log(`!!!!!!!!!! CRITICAL ERROR in main_NEW (Opps) !!!!!!!!!!\nError: ${error.message}\nStack: ${error.stack}`); }
}

// =======================================================================================================

function main_Activities_Full_Sync() {
  const ACTIVITIES_SPREADSHEET_ID = '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ACTIVITIES_DEST_SHEET_NAME = 'Activities';
  const ACTIVITIES_SOURCE_SHEET_PREFIX = "Activities mawi@";
  const ACTIVITIES_ID_COLUMN_NAME = DEFAULT_ACTIVITY_ID_COL_NAME; // Using 'activities.id'

  const ACTIVITIES_COLUMNS_TO_TRACK_FOR_UPDATES = [
     'activities.status', 'activities.comments', 'activities.subject', 'activities.completed_date'
  ];
  const ACTIVITIES_FEED_USE_APPSHEET = true;
  const ACTIVITIES_FEED_GOOGLE_SHEET_ID = ACTIVITIES_SPREADSHEET_ID;
  const ACTIVITIES_FEED_GOOGLE_SHEET_NAME = 'Feed';
  const ACTIVITIES_APPSHEET_FEED_CONFIG = {
      APP_ID: APPSHEET_APP_ID, TABLE_NAME: APPSHEET_TABLE_NAME, REGION: APPSHEET_REGION,
      COL_ID: 'activity_id_in_feed', // This should be the column name in your AppSheet 'Feed' table that will store 'activities.id'
      COL_SUMMARY: APPSHEET_COL_SUMMARY, COL_TIMESTAMP: APPSHEET_COL_TIMESTAMP, COL_PROCESSED: APPSHEET_COL_PROCESSED
  };
  
  Logger.log(`================ Starting main_Activities_Full_Sync [${new Date().toLocaleString()}] ===============`);
  try {
    let ss = SpreadsheetApp.openById(ACTIVITIES_SPREADSHEET_ID);
    let sheet1_activities_dest = ss.getSheetByName(ACTIVITIES_DEST_SHEET_NAME);
    if (!sheet1_activities_dest) {
      Logger.log(`WARN: Dest sheet "${ACTIVITIES_DEST_SHEET_NAME}" not found. Creating.`);
      sheet1_activities_dest = ss.insertSheet(ACTIVITIES_DEST_SHEET_NAME);
      if (!sheet1_activities_dest) { Logger.log(`ERROR: Could not create dest sheet. Aborting.`); return; }
    }

    const findResultFromActivities = findLatestOpportunitySheet(ACTIVITIES_SOURCE_SHEET_PREFIX);
    const { latest: latestSourceFile, olderFiles: olderSourceFiles } = findResultFromActivities;

    if (!latestSourceFile) {
      Logger.log(`INFO: No new source Activities sheet found. Nothing to sync.`);
      Logger.log(`================ main_Activities_Full_Sync finished (no source) ===============`); return;
    }
    
    let sheet2_activities_source_raw_sheet_obj;
    try {
      const sourceSpreadsheet = SpreadsheetApp.openById(latestSourceFile.getId());
      sheet2_activities_source_raw_sheet_obj = sourceSpreadsheet.getSheets().filter(s => !s.isSheetHidden())[0];
      if (!sheet2_activities_source_raw_sheet_obj) { Logger.log(`ERROR: No visible sheets in source. Aborting.`); return; }
    } catch (e) { Logger.log(`ERROR opening source Activities spreadsheet: ${e}. Aborting.`); return; }
    
    const originalActivitiesData = sheet1_activities_dest.getDataRange().getValues();
    let originalActivitiesHeader = []; let originalActivitiesIdIndex = -1; let originalActivitiesDataMap = new Map();

    if (originalActivitiesData && originalActivitiesData.length > 0 && originalActivitiesData[0] && originalActivitiesData[0].length > 0) {
        originalActivitiesHeader = originalActivitiesData[0];
        originalActivitiesIdIndex = originalActivitiesHeader.indexOf(ACTIVITIES_ID_COLUMN_NAME);
        if (originalActivitiesIdIndex !== -1) {
            if (originalActivitiesData.length > 1) {
                originalActivitiesDataMap = createMapFromArray_NEW(originalActivitiesData, originalActivitiesIdIndex);
            }
        } else { Logger.log(`WARN: ID col "${ACTIVITIES_ID_COLUMN_NAME}" NOT in dest Activities header. Original map empty.`); }
    } else { Logger.log(`INFO: Dest Activities sheet "${ACTIVITIES_DEST_SHEET_NAME}" empty/no header. Original map empty.`); }
    
    const sourceActivitiesDataArray = sheet2_activities_source_raw_sheet_obj.getDataRange().getValues();
    if (!sourceActivitiesDataArray || sourceActivitiesDataArray.length === 0 || (sourceActivitiesDataArray.length > 0 && sourceActivitiesDataArray[0].length === 0) ) {
        Logger.log("ERROR: Source Activities sheet empty/no header. Aborting."); return;
    }
    
    const sourceActivitiesHeader = sourceActivitiesDataArray[0];
    const sourceActivitiesIdIndex = sourceActivitiesHeader.indexOf(ACTIVITIES_ID_COLUMN_NAME);
    if (sourceActivitiesIdIndex === -1) {
        Logger.log(`ERROR: ID col "${ACTIVITIES_ID_COLUMN_NAME}" NOT in source Activities header. Aborting.`); return;
    }
    if (originalActivitiesHeader.length === 0) { // If dest was totally empty
        originalActivitiesHeader = [...sourceActivitiesHeader]; originalActivitiesIdIndex = sourceActivitiesIdIndex;
    }
    
    const { changes, removedIds } = findChangesAndRemovedIds(
      originalActivitiesDataMap, sourceActivitiesDataArray, originalActivitiesHeader,
      originalActivitiesIdIndex, ACTIVITIES_COLUMNS_TO_TRACK_FOR_UPDATES, ACTIVITIES_ID_COLUMN_NAME
    );

    Logger.log(`Activities Changes: ${Object.keys(changes).length} IDs, Removed: ${removedIds.size}.`);
    if (Object.keys(changes).length > 0) {
      for (const activityId in changes) {
        if (changes.hasOwnProperty(activityId)) {
          const changeEntries = changes[activityId]; let summary = "Activity Update";
          if (changeEntries.length > 0) {
            const firstEntry = changeEntries[0];
            if (firstEntry.status) summary = `${firstEntry.status} (Activity ID: ${activityId})`;
            else if (firstEntry.column) summary = `Activity ID ${activityId}: Col '${firstEntry.column}' was updated.`;
          }
          const dataForFeed = { id: activityId, changeLog: summary };
          if (ACTIVITIES_FEED_USE_APPSHEET) {
              addRecordToAppSheet(dataForFeed, ACTIVITIES_APPSHEET_FEED_CONFIG);
          } else {
              writeJsonToSheet_NEW(dataForFeed, ACTIVITIES_FEED_GOOGLE_SHEET_ID, ACTIVITIES_FEED_GOOGLE_SHEET_NAME);
          }
        }
      }
    }

    if (ACTIVITIES_FEED_USE_APPSHEET && removedIds && removedIds.size > 0) {
       // Optional: configure and call deleteRowsById_NEW if needed
    }

    const updateSuccess = updateSheetData_NEW(sheet2_activities_source_raw_sheet_obj, sheet1_activities_dest);

    if (updateSuccess) {
      // deleteOldOpportunitySheets(olderSourceFiles); // Trashing disabled
    } else { Logger.log("ERROR: Failed to update destination Activities GSheet tab."); }

    Logger.log(`================ main_Activities_Full_Sync finished [${new Date().toLocaleString()}] ===============`);
  } catch (error) {
    Logger.log(`!!!!!!!!!! CRITICAL ERROR in main_Activities_Full_Sync !!!!!!!!!!\nError: ${error.message}\nStack: ${error.stack}`);
  }
}

/**
 * ============================================================================
 * --- TEST FUNCTION ---
 * Use this to test the document creation process for a removed opportunity
 * without affecting your actual data.
 * ============================================================================
 */
function test_archiveRemovedOpportunity() {
  Logger.log("--- Starting Test: archiveRemovedOpportunity ---");

  // 1. --- MOCK DATA ---
  // This data simulates what the main script would find for a removed opportunity.
  // You can change these values to test with different scenarios.

  const testOpportunityId = "Microsoft A/S";

  // Simulate the header row from your 'Opportunities' sheet
  const testHeader = [
    "opportunities.opportunity_id",
    "opportunities.stage_name",
    "opportunities.owner.name",
    "opportunities.amount",
    "opportunities.close_date"
  ];

  // Simulate the data row for the removed opportunity
  const testOpportunityData = [
    "TEST-OPP-123",
    "Closed Lost",
    "Jane Smith",
    75000,
    new Date("2025-08-15")
  ];

  // Simulate the feed history that would be fetched from AppSheet
  const testFeedHistory = [
    {
      "date": "2025-07-01T10:00:00.000Z",
      "update": "New entry added (ID: TEST-OPP-123)"
    },
    {
      "date": "2025-07-20T14:30:00.000Z",
      "update": "The stage moved to Negotiation."
    },
    {
      "date": "2025-08-14T09:15:00.000Z",
      "update": "The stage moved to Closed Lost."
    }
  ];

  // 2. --- RUN THE FUNCTION ---
  // First, check if the required folder ID has been set.
  if (ARCHIVE_FOLDER_ID === "PASTE_YOUR_ARCHIVE_FOLDER_ID_HERE" || !ARCHIVE_FOLDER_ID) {
    Logger.log("⛔️ ERROR: Cannot run test. Please set the ARCHIVE_FOLDER_ID constant at the top of the script first.");
    return;
  }

  Logger.log(`Calling archiveRemovedOpportunity with test data for ID: ${testOpportunityId}`);
  archiveRemovedOpportunity(testOpportunityId, testOpportunityData, testHeader, testFeedHistory);

  Logger.log("✅ --- Finished Test: archiveRemovedOpportunity ---");
  Logger.log("Please check your designated archive folder in Google Drive.");
  Logger.log("You should find a new document named 'Removed Opportunity Summary - TEST-OPP-123 - [today's date]'.");
}
