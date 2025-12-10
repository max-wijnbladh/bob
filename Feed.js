// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Creates and posts a card to a Google Chat space with opportunity updates.
 *
 * @param {string} account_name The name of the account.
 * @param {string} summary A summary of the opportunity update.
 * @param {string} opportunity_details Additional details about the opportunity.
 * @param {string} spaceName The name of the chat space to post to.
 * @param {string} icon An icon URL for the card header.
 * @param {string} date The date of the update.
 * @param {string} vector_url A URL for the 'Vector' button.
 * @param {string} execSummary A URL for the 'Executive Summary' button.
 */
function createFeedCard2(account_name = "", summary = "", opportunity_details = "", spaceName = "spaces/AAAA_x3ZYqw", icon = "", date = new Date().toLocaleDateString(), vector_url = "google.com", execSummary = "docs.google.com"){
  Utilities.sleep(3000);
  const token = getToken_();

  const message = {
    cardsV2: [{
      card: {
        header: {
          title: account_name,
          subtitle: opportunity_details,
          imageUrl: icon,
          imageType: "CIRCLE"
        },
        sections: [
          {
            collapsible: true,
            uncollapsibleWidgetsCount: 3,
            header: "Opportunity Update",
            widgets: [
              { textParagraph: { text: summary } },
              { divider: {} }
            ]
          },
          {
            widgets: [{
              buttonList: {
                buttons: [
                  {
                    text: "Vector",
                    icon: { knownIcon: "OPEN_IN_NEW" },
                    onClick: { openLink: { url: vector_url } }
                  },
                  {
                    text: "Executive Summary",
                    icon: { knownIcon: "DESCRIPTION" },
                    onClick: { openLink: { url: execSummary } }
                  }
                ]
              }
            }]
          }
        ]
      }
    }]
  };

  Chat.Spaces.Messages.create(message, spaceName, {}, { Authorization: `Bearer ${token}` });
}

/**
 * Creates a map from a 2D array, using a specified column as the key.
 *
 * @param {Array<Array<any>>} array The 2D array to convert.
 * @param {number} keyIndex The index of the column to use as the key.
 * @return {Map<any, any>} A map with keys from the specified column.
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
 * Compares two Google Sheets and logs the changes for tracked columns.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet1 The first sheet to compare.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet2 The second sheet to compare.
 */
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

  const changes = compareSheetsAndLogChanges(sheet1, sheet2, columnsToTrack);

  for (const id in changes) {
    const changeLog = generate(`Summarize the following changes in one sentence, without referencing the id: ${JSON.stringify(changes[id], null, 2)}`);
    changes[id].id = id;
    changes[id].changeLog = changeLog;
    changes[id].date = new Date();
    writeJsonToSheet(changes[id]);
  }
}

/**
 * A test function to log the character codes of a column name.
 */
function testColumnName() {
  const columnNameFromSheet = "opportunities.next_step";
  Logger.log(`Column name: ${columnNameFromSheet}, Character codes: ${getColumnCodes(columnNameFromSheet)}`);
}

/**
 * Gets the character codes of a string.
 *
 * @param {string} str The string to get the character codes from.
 * @return {string} A string of character codes.
 */
function getColumnCodes(str) {
  let codes = "";
  for (let i = 0; i < str.length; i++) {
    codes += `${str.charCodeAt(i)} `;
  }
  return codes;
}

/**
 * A simplified function to compare columns in a sheet with a list of tracked columns.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet1 The first sheet (unused).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet2 The sheet with the header row to check.
 * @param {Array<string>} columnsToTrack A list of column names to track.
 */
function compareSheetsAndLogChangesSimplified(sheet1, sheet2, columnsToTrack) {
  const header2 = sheet2.getDataRange().getValues()[0];
  for (const columnName of header2) {
    Logger.log(`Column: ${columnName}, Included: ${columnsToTrack.includes(columnName)}`);
  }
}
