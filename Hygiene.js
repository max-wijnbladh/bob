// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law of or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Posts a "Vector Hygiene" card to a Google Chat space.
 * This card alerts users to opportunities with a blank "Business Need" field in Salesforce.
 *
 * @param {string} spaceName The name of the chat space to post the card to.
 * @param {string} vector_url The URL for the "Vector" button.
 * @param {string} icon The URL for the icon in the card header.
 * @param {string} account_name The name of the account to display in the card subtitle.
 * @returns {boolean} Returns true after posting the message.
 */
function postHygienePost(spaceName, vector_url, icon, account_name){
  // Get the authorization token.
  const token = getToken_();

  // Define the card message.
  const message = {
    "cardsV2": [
      {
        "card": {
          "header": {
            "title": "Vector Hygiene",
            "subtitle": account_name,
            "imageUrl": icon
          },
          "sections": [
            {
              "header": "What is the business need?",
              "collapsible": true,
              "uncollapsibleWidgetsCount": 1,
              "widgets": [
                {
                  "textParagraph": {
                    "text": 'The "Business Need" field in Salesforce is blank for this opportunity, please review.',
                    "maxLines": 5
                  }
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
  };

  // Post the card to the specified chat space.
  Chat.Spaces.Messages.create(message, spaceName, {}, { 'Authorization': 'Bearer ' + token });

  // Return true to indicate that the message has been posted.
  return true;
}