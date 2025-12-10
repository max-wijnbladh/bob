/**
 * Safe logging function.
 * @param {any} value - The value to log.
 */
function safeLog(value) {
  if (value !== undefined) {
    Logger.log(value);
  }
}

/**
 * Creates a map from a 2D array, using a specified column as the key.
 * @param {Array[][]} array - The 2D array.
 * @param {number} keyIndex - The index of the column to use as the key.
 * @return {Map} - A map with keys from the specified column.
 */
function createMapFromArray(array, keyIndex) {
  const map = new Map();
  for (let i = 1; i < array.length; i++) {
    const key = array[i][keyIndex];
    map.set(key, array[i]);
  }
  return map;
}

/**
 * Records a change in a structured format.
 * @param {object} changes - The object to store changes.
 * @param {string} id - The ID of the changed item.
 * @param {string} columnName - The column name that changed.
 * @param {any} before - The value before the change.
 * @param {any} after - The value after the change.
 */
function recordChange(changes, id, columnName, before, after) {
  if (!changes[id]) {
    changes[id] = [];
  }
  changes[id].push({
    id: id,
    column: columnName,
    before: before,
    after: after,
    changeLog: "",
    date: "",
  });
  return changes
}

/**
 * Compares two sheets and logs changes.
 * @param {Sheet} sheet1 - The first sheet.
 * @param {Sheet} sheet2 - The second sheet.
 * @param {string[]} columnsToTrack - An array of column names to track.
 * @return {object} - An object containing the changes.
 */
/**
 * Compares two sheets and logs changes, removing duplicates.
 * @param {Sheet} sheet1 - The first sheet.
 * @param {Sheet} sheet2 - The second sheet.
 * @param {string[]} columnsToTrack - An array of column names to track.
 * @return {object} - An object containing the changes, with duplicates removed.
 */
function compareSheetsAndLogChanges(sheet1, sheet2, columnsToTrack = null) {
  if (!sheet1 || !sheet2) {
    Logger.log("One or both sheets were not found.");
    return null;
  }

  const data1 = sheet1.getDataRange().getValues();
  const data2 = sheet2.getDataRange().getValues();
  safeLog(data1[0]);
  safeLog(data2[0]);

  const header1 = data1[0];
  const header2 = data2[0];

  const idIndex1 = header1.indexOf('opportunities.opportunity_id');
  const idIndex2 = header2.indexOf('opportunities.opportunity_id');

  if (idIndex1 === -1 || idIndex2 === -1) {
    Logger.log("'opportunities.opportunity_id' column not found in one or both sheets.");
    return null;
  }

  const dataMap1 = createMapFromArray(data1, idIndex1);
  const dataMap2 = createMapFromArray(data2, idIndex2);

  let changes = {};
  const addedOpportunityIds = new Set();

  for (let i = 1; i < data2.length; i++) {
    const id = data2[i][idIndex2];
    const rowData2 = data2[i];

    if (dataMap1.has(id)) {
      const rowData1 = dataMap1.get(id);
      let opportunityHasChanges = false;

      for (let j = 0; j < header2.length; j++) {
        const columnName = header2[j];

        const trimmedColumnName = columnName.trim();
        Logger.log("Evaluating column: " + trimmedColumnName);

        if (columnsToTrack && !columnsToTrack.includes(trimmedColumnName)) continue;

        const colIndex1 = header1.indexOf(columnName);

        if (colIndex1 === -1 || j === idIndex2) continue;

        const value1 = rowData1[colIndex1];
        const value2 = rowData2[j];
        Logger.log("Current value1: " + value1);
        Logger.log("Compared to new value2: " + value2);

        if (columnName === 'opportunities.close_date') {
          if (new Date(value1).getTime() !== new Date(value2).getTime()) {
            changes = recordChange(changes, id, columnName, value2, value1);
            opportunityHasChanges = true;
          }
        } else {
          if (value1 !== value2) {
            changes = recordChange(changes, id, columnName, value2, value1);
            opportunityHasChanges = true;
          }
        }
      }
    } else {
      if (!addedOpportunityIds.has(id)) {
        if (!changes[id]) {
          changes[id] = [];
        }
        changes[id].push({ status: "New entry added in sheet 2" });
        addedOpportunityIds.add(id);
      }
    }
  }

  for (let i = 1; i < data1.length; i++) {
    const id = data1[i][idIndex1];
    if (!dataMap2.has(id)) {
      if (!changes[id]) {
        changes[id] = [];
      }
      changes[id].push({ status: "Entry removed from sheet 2" });
    }
  }

  // Remove duplicate entries within the changes object
  //changes = removeDuplicateChanges(changes);

  return changes;
}

/**
 * Removes duplicate changes within the changes object.
 * @param {object} changes - The changes object.
 * @return {object} - The changes object with duplicates removed.
 */
function removeDuplicateChanges(changes) {
  const uniqueChanges = {};

  for (const id in changes) {
    if (changes.hasOwnProperty(id)) {
      const uniqueEntries = [];
      const seenEntries = new Set();

      for (const entry of changes[id]) {
        const entryString = JSON.stringify(entry);
        if (!seenEntries.has(entryString)) {
          uniqueEntries.push(entry);
          seenEntries.add(entryString);
        }
      }
      uniqueChanges[id] = uniqueEntries;
    }
  }

  return uniqueChanges;
}

function compareSheets(sheet1, sheet2) {
  const columnsToTrack = [
    "opportunities.forecast_category_name",
    "opportunities.next_steps_ce",
    "opportunities.next_step",
    "opportunities.stage_name",
    "opportunities.business_need",
    "opportunities.deal_blocker",
    "opportunities.next_steps_cetech_win"
  ];

  return compareSheetsAndLogChanges(sheet1, sheet2, columnsToTrack);
}

function writeJsonToSheet(jsonData) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const destinationSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = destinationSpreadsheet.getSheetByName("Feed");
  const dataToWrite = [[jsonData.id, jsonData.changeLog, new Date(), "FALSE"]];
  sheet.insertRows(2, dataToWrite.length);
  sheet.getRange(1, 1, dataToWrite.length, dataToWrite[0].length).setValues(dataToWrite);
  sheet.getRange(1, 3, dataToWrite.length, 1).setNumberFormat("yyyy-MM-dd HH:mm:ss");
}



function copySheet(sheetID, tab) {
  // Get the source spreadsheet and sheet.
  const sourceSpreadsheet = SpreadsheetApp.openById(sheetID);
  const sourceSheet = sourceSpreadsheet.getSheetByName('Sheet1');

  // Get the destination spreadsheet and sheet.
  const destSpreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const destinationSpreadsheet = SpreadsheetApp.openById(destSpreadsheetId);
  const destinationSheet = destinationSpreadsheet.getSheetByName(tab);

  compareSheets(sourceSheet, destinationSheet)
  if (typeof processOpportunityChanges === 'function') {
      processOpportunityChanges(sourceSheet, destinationSheet)
  }

  // Get the last row and column of the source sheet.
  const lastRow = sourceSheet.getLastRow();
  const lastColumn = sourceSheet.getLastColumn();

  // Get the data from the source sheet.
  const sourceRange = sourceSheet.getRange(1, 1, lastRow, lastColumn);
  const dataToCopy = sourceRange.getValues();

  // Copy the data to the destination sheet.
  const destinationRange = destinationSheet.getRange(1, 1, lastRow, lastColumn);
  destinationRange.setValues(dataToCopy);
}

function extractRowsByPastDays(sheet, days) {
  // Calculate the date "days" ago.
  const today = new Date();
  const dateToCompare = new Date();
  dateToCompare.setDate(today.getDate() - days);

  // Get the data range.
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  Logger.log(values)

  // Array to store the extracted rows.
  const extractedRows = [];

  // Iterate through the rows and extract the ones matching the date range.
  for (let i = 1; i < values.length; i++) { // Start from 1 to skip the header row
    const rowDate = new Date(values[i][2]); // Assuming the date is in the first column (index 0)
    Logger.log(rowDate)
    // Compare the dates (ignoring time)
    if (rowDate.setHours(0,0,0,0) >= dateToCompare.setHours(0,0,0,0)) {
      extractedRows.push(values[i]);
    }
  }

  // Return the extracted rows.
  return extractedRows;
}

function updateSheet() {
  const userEmail = Session.getActiveUser().getEmail();
  copySheet(getLatestSheetId("title contains 'Opportunities " + userEmail + "'"), "Opportunities")
  copySheet(getLatestSheetId("title contains 'Activities " + userEmail + "'"), "Activities")
  return true
}


function getLatestSheetId(title) {
  // Search for files shared with you that contain "Opportunities + Activities" in the name
  //title = "title contains 'Opportunities @mawi'"
  const files = DriveApp.searchFiles(title)
  // Convert the FileIterator to an array
  const filesArray = [];
  while (files.hasNext()) {
    filesArray.push(files.next());
  }

  // Sort the array by last modified date in descending order.
  filesArray.sort(function(a, b) {
    return b.getLastUpdated() - a.getLastUpdated();
  });

  // Get the ID of the first file (the latest one).
  if (filesArray.length > 0) {
    const file = filesArray[0];
    const fileId = file.getId();
    Logger.log('The ID of the latest sheet is: ' + fileId);
    return fileId;
  } else {
    Logger.log('No sheets found with the name: ' + title);
    return null;
  }
}

function getActivities(date) {
  if (!date)
    date = 7
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("Activities");
  Logger.log(sheet)
  const activities = extractRowsByPastDays(sheet, date)
  Logger.log(activities)
  if (activities.length > 0)
    return (generate("Generate a summary of the activities from the past two weeks: " + activities))
  return "No activities found."
}

function processOpportunities() {
  // Get the active spreadsheet and sheet.
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId); // Replace with your actual spreadsheet ID
  const sheet = ss.getSheetByName('Opportunities'); // Replace 'Custom' with your actual sheet name

  // Get the data range (assuming data starts from row 2).
  const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  const data = dataRange.getValues();

  // Get the index of the opportunity_id column in the Custom sheet.
  // index = getOpportunityIdColumnIndex(sheet) // Unused variable
  // If the column name is not found, return an error.

  // Iterate through each row in the data.
  data.forEach((row, index) => {
    const opportunityId = row[0]
    Logger.log(opportunityId)
    generateCustomFields(opportunityId);
    getActivitySummary(opportunityId)
    getNextSteps(opportunityId)
    Utilities.sleep(6000)
  });
}

function getOpportunityIdColumnIndex(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; // Get the first row (header row)
  for (let i = 0; i < headerRow.length; i++) {
    if (headerRow[i] === "opportunities.opportunity_id" || headerRow[i].toLowerCase() === "opportunities.opportunity_id") { // Case-insensitive comparison
      return i; // Return the *zero-based* index
    }
  }
  return -1; // Return -1 if the header is not found
}

function getOverview(activities,feed) {
  const overview = generate("Provide a overview of this Google Workspace opportunity that is easy to follow, using plaintext formatting and newlines: " + activities + feed)
  return overview
}

function generateCustomFields(opportunity_id) {
  if (!opportunity_id) {
    opportunity_id = "0064M00000csvBHQAY";
  }

  // Create a JSON object to store the opportunity details.
  const opportunityDetails = {
    description: getValueByOpportunityId(opportunity_id, "opportunities.opportunity_description"),
    name: getValueByOpportunityId(opportunity_id, "opportunities.opportunity_name"),
    account: getValueByOpportunityId(opportunity_id, "opportunities.account_name"),
    need: getValueByOpportunityId(opportunity_id, "opportunities.business_need"),
    qualification: getValueByOpportunityId(opportunity_id, "opportunities.opportunity_qualification_notes"),
    blockers: getValueByOpportunityId(opportunity_id, "opportunities.deal_blocker")
  };

  // Generate the summary using the JSON object.
  const summary = generate("Generate an short summary overview in three sentences maximum, on this Google Workspace business opportunity, using natural language and no asterixs: " + JSON.stringify(opportunityDetails))
  Logger.log(summary);

  // Get the active spreadsheet and sheets.
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const CustomSheet = ss.getSheetByName('Custom'); 
  const CustomData = CustomSheet.getDataRange().getValues();

  // Get the index of the opportunity_id and the summary column in the Custom sheet.
  const CustomOpportunityIdIndex = CustomData[0].indexOf('opportunities.opportunity_id'); 
  const summaryColumnIndex = CustomData[0].indexOf('opportunity.summary'); 
  // If the column names are not found, return an error.
  if (CustomOpportunityIdIndex === -1 || summaryColumnIndex === -1) {
    Logger.log('Column not found'); 
    return;
  }
  
  // Find the corresponding row in the Custom sheet.
  for (let j = 1; j < CustomData.length; j++) {
    if (CustomData[j][CustomOpportunityIdIndex] == opportunity_id) {
      // Write the summary to the cell in the Custom sheet.
      CustomSheet.getRange(j + 1, summaryColumnIndex + 1).setValue(summary); 
      return;
    }
  }
}

function setValueByOpportunityId(opportunityId, columnName, newValue) {
  // Get the active spreadsheet and sheet.
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("Opportunities");

  // Get the data from the sheet (for finding column index).  We only need the header row.
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Get the index of the opportunity_id and the specified column.
  const opportunityIdIndex = headerRow.indexOf('opportunities.opportunity_id');
  const columnIndex = headerRow.indexOf(columnName);

  // If the column names are not found, return an error.
  if (opportunityIdIndex === -1 || columnIndex === -1) {
    return 'Column not found';
  }

  // Get the entire data range *after* finding the indices. This is more efficient.
  const data = sheet.getDataRange().getValues();

  // Find the row that matches the opportunityId.
  for (let i = 1; i < data.length; i++) {
    if (data[i][opportunityIdIndex] == opportunityId) {
      // Set the value in the sheet directly.  This is more efficient than writing the whole data range back.
      sheet.getRange(i + 1, columnIndex + 1).setValue(newValue); // i+1 because data is 0-indexed, sheet is 1-indexed. columnIndex+1 for same reason.
      return "Value updated successfully";
    }
  }

  // If no match is found, return an error.
  return 'Opportunity ID not found';
}

function getOpportunityIdsByCondition(columnName, condition) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName("Opportunities");
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues();
  const columnIndex = headerRow.indexOf(columnName);

  if (columnIndex === -1) {
    return 'Column not found';
  }

  const data = sheet.getDataRange().getValues();
  const opportunityIdIndex = headerRow.indexOf('opportunities.opportunity_id');
    if (opportunityIdIndex === -1) {
    return 'Opportunity ID column not found';
  }
  const matchingOpportunityIds = []

  for (let i = 1; i < data.length; i++) {
    const cellValue = data[i][columnIndex];
    // Evaluate the condition.  This is the most flexible approach.
    if (eval(cellValue + condition)) { // Using eval is risky, see warning below
      matchingOpportunityIds.push(data[i][opportunityIdIndex]);
    }
  }

  return matchingOpportunityIds;
}


function getValueByOpportunityId(opportunityId, columnName) {
  // Get the active spreadsheet and sheet.
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId)
  const sheet = ss.getSheetByName("Opportunities");
  Logger.log(sheet)

  // Get the data from the sheet.
  const data = sheet.getDataRange().getValues();

  // Get the index of the opportunity_id and the specified column.
  const opportunityIdIndex = data[0].indexOf('opportunities.opportunity_id')
  Logger.log(opportunityIdIndex)
  const columnIndex = data[0].indexOf(columnName);

  // If the column names are not found, return an error.
  if (opportunityIdIndex === -1 || columnIndex === -1) {
    return 'Column not found'; 
  }

  // Find the row that matches the opportunityId.
  for (let i = 1; i < data.length; i++) {
    if (data[i][opportunityIdIndex] == opportunityId) {
      return data[i][columnIndex]; 
    }
  }

  // If no match is found, return an error.
  return 'Opportunity ID not found'; 
}

function getActivitySummary(opportunity_id) {
  // Assuming your activity data is in a sheet named "Activities"
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || '1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE';
  const ss = SpreadsheetApp.openById(spreadsheetId)
  const sheet = ss.getSheetByName("Activities");
  Logger.log(sheet)
  if (!opportunity_id) {
  opportunity_id = "0064M00000csgZdQAI";
}
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove the header row

  const opportunityIdIndex = headers.indexOf("opportunities.opportunity_id");
  const subjectIndex = headers.indexOf("activities.subject");
  const commentsIndex = headers.indexOf("activities.comments");
  const completedIndex = headers.indexOf("activities.completed_date");

  const activityDetails = {};

  for (const row of data) {
    const currentOpportunityId = row[opportunityIdIndex].trim();

    if (currentOpportunityId === opportunity_id) {
      const subject = row[subjectIndex];
      const comments = row[commentsIndex];
      const completed = row[completedIndex];

      if (!activityDetails[opportunity_id]) {
        activityDetails[opportunity_id] = {
          subjects: [],
          comments: [],
          completed: []
        };
      }

      activityDetails[opportunity_id].subjects.push(subject);
      activityDetails[opportunity_id].comments.push(comments);
      activityDetails[opportunity_id].comments.push(completed);
    }
  }
  Logger.log(activityDetails)
  const nextStepsSummary = generate("These logs shows activities related to an ongoing Google Workspace business opportunity with a given id, summarise the activities so far with no intro tex, in natural language and without asterixes: " + JSON.stringify(activityDetails))
  const CustomSheet = ss.getSheetByName('Custom'); 
  const CustomData = CustomSheet.getDataRange().getValues();

  // Get the index of the opportunity_id and the summary column in the Custom sheet.
  const CustomOpportunityIdIndex = CustomData[0].indexOf('opportunities.opportunity_id'); 
  const summaryColumnIndex = CustomData[0].indexOf('activity.summary'); 

  // If the column names are not found, return an error.
  if (CustomOpportunityIdIndex === -1 || summaryColumnIndex === -1) {
    Logger.log('Column not found'); 
    return;
  }
  
  // Find the corresponding row in the Custom sheet.
  for (let j = 1; j < CustomData.length; j++) {
    if (CustomData[j][CustomOpportunityIdIndex] == opportunity_id) {
      // Write the summary to the cell in the Custom sheet.
      CustomSheet.getRange(j + 1, summaryColumnIndex + 1).setValue(nextStepsSummary); 
      return;
    }
  } 


  return activityDetails;
}

function getNextSteps(next_steps, next_steps_ce , summary) {

  const nextSteps = generate("I will provide you with the next steps for a Google Workspace opportunity from the business side: " + next_steps + " and the technical side: + " + next_steps_ce + " and a summary of the deal itself: " + summary + ". Summarise these next steps, and dont generate anything unrelated to the requested summary such as an intro text, use plaintext formatting with newlines:")
  Logger.log(nextSteps)
  return nextSteps
}

function jsonObjectify(jsonString) {
  // Find the start and end positions of the valid JSON
  const startIndex = jsonString.indexOf('{');
  const endIndex = jsonString.lastIndexOf('}') + 1;

  // Extract the valid JSON string
  const validJsonString = jsonString.substring(startIndex, endIndex);
  Logger.log(validJsonString)
  // Parse the JSON string
  try {
    const jsonObject = JSON.parse(validJsonString);
    return jsonObject;
  } catch (error) {
    console.error('Error parsing JSON, returning original string:', error);
    return null;
  }
}
