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
 * Generates content using the Gemini 2.0 Flash model.
 *
 * @param {string} prompt The prompt to send to the model.
 * @returns {string | null} The generated text, or null if an error occurred.
 */
function generate(prompt) {
  const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const token = getToken_();

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiEndpoint, options);
    if (response.getResponseCode() !== 200) {
      console.error(`API request failed: ${response.getContentText()}`);
      return null;
    }

    const responseData = JSON.parse(response.getContentText());
    return responseData.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating content:", error.message);
    return null;
  }
}

/**
 * Generates content using a specified Gemini model.
 *
 * @param {string} prompt The prompt to send to the model.
 * @param {string} model The name of the Gemini model to use.
 * @returns {string | null} The generated text, or null if an error occurred.
 */
function gemini(prompt, model) {
  const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const token = getToken_();

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + token },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(apiEndpoint, options);
    if (response.getResponseCode() !== 200) {
      console.error(`API request failed: ${response.getContentText()}`);
      return null;
    }

    const responseData = JSON.parse(response.getContentText());
    return responseData.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error generating content:", error.message);
    return null;
  }
}
