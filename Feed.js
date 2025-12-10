function createFeedCard2(account_name = "", summary = "", opportunity_details = "", spaceName = "spaces/AAAA_x3ZYqw", icon = "", date = new Date().ToShortDateString(), vector_url = "google.com", execSummary = "docs.google.com"){
Utilities.sleep(3000);
token = getToken_()
Logger.log(spaceName)
console.log("account_name:", account_name);
console.log("icon:", icon);
console.log("summary:", summary);
console.log("date:", date);
console.log("vector_url:", vector_url);
console.log("spaceName:", spaceName);


  const message = {
  "cardsV2": [
    {
      "card": {
        "header": {
          "title": account_name,
          "subtitle": opportunity_details,
          "imageUrl": icon,
          "imageType": "CIRCLE"
        },
        "sections": [
          {
            "collapsible": true,
            "uncollapsibleWidgetsCount": 3,
            "header": "Opportunity Update",
            "widgets": [
                {
                  "textParagraph": {  // Use textParagraph for longer text
                    "text": summary
                  }
                },
                                {
                  "divider": {} // Add the divider here
                }
            ]
          },
          {
              "widgets": [
                  {
                      "buttonList": {
                          "buttons": [
                              {
                                  "text": "Vector",
                                  "icon": {
                                      "knownIcon": "OPEN_IN_NEW"
                                  },
                                  "onClick": {
                                      "openLink": {
                                          "url": vector_url
                                      }
                                  }
                              },
                                                            {
                                  "text": "Executive Summary",
                                  "icon": {
                                      "knownIcon": "DESCRIPTION"
                                  },
                                  "onClick": {
                                      "openLink": {
                                          "url": execSummary
                                      }
                                  }
                              }
                          ]
                      }
                  }
              ]
          }
        ]
      }
    }
  ]
}
  parameters = {}
  Logger.log(message)
  Logger.log(spaceName)
  Chat.Spaces.Messages.create(message, spaceName, parameters, { 'Authorization': 'Bearer ' + token })
}



/**
 * Creates a map from a 2D array, using a specified column as the key.
 *
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



// Example usage:
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

  Logger.log(changes);
  for (const id in changes) {
    Logger.log(`Changes for opportunity ID ${id}:`);
    Logger.log(JSON.stringify(changes[id], null, 2));
    const changeLog = generate(
      "Do a one sentece summary of the changes in the before and after column, without referencing the id" +
        JSON.stringify(changes[id], null, 2)
    );
    changes[id].id = id;
    changes[id].changeLog = changeLog;
    changes[id].date = new Date()
    writeJsonToSheet(changes[id]);
  }
}

function testColumnName() {
  const columnNameFromSheet = "opportunities.next_step"; // Paste the copied value here
  Logger.log(`Column name from sheet: ${columnNameFromSheet}`);
  Logger.log(`Character codes: ${getColumnCodes(columnNameFromSheet)}`);
  Logger.log(`Is equal to "opportunities.next_step": ${columnNameFromSheet === "opportunities.next_step"}`);
}

function getColumnCodes(str) {
  let codes = "";
  for (let i = 0; i < str.length; i++) {
    codes += str.charCodeAt(i) + " ";
  }
  return codes;
}

function compareSheetsAndLogChangesSimplified(sheet1, sheet2, columnsToTrack) {
  const header2 = sheet2.getDataRange().getValues()[0];

  for (let j = 0; j < header2.length; j++) {
    const columnName = header2[j];
    Logger.log(`Column name: ${columnName}`);
    Logger.log(`Includes: ${columnsToTrack.includes(columnName)}`);
  }
}

function testSimplifiedCompare() {
  const ss = SpreadsheetApp.openById("1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE");
  const sheet1 = ss.getSheetByName("Opportunities");
  const sheet2 = ss.getSheetByName(getLatestSheetId());
  const columnsToTrack = [
    "opportunities.forecast_category_name",
    "opportunities.next_steps_ce",
    "opportunities.next_step",
    "opportunities.stage_name",
    "opportunities.business_need",
    "opportunities.deal_blocker",
    "opportunities.next_steps_cetech_win"
  ];
  compareSheetsAndLogChangesSimplified(sheet1, sheet2, columnsToTrack);
}