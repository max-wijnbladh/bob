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
 * Creates a description for an Engagement Request (ER) by summarizing the provided details.
 * 
 * @param {string} er_details The details of the engagement request.
 * @returns {string} The generated summary of the ER details.
 */
function createDescription(er_details) {
    // Create a prompt to be sent to the generative AI model.
    const prompt = `Here is a request from a sales specialist for Google Workspace on an opportunity they want support with from a customer engineer. Summarise all these details provided in natural language without any intro text, just the details: ${er_details}`;
    
    // Call the generative AI model to get the summary.
    const er_overview = generate(prompt);
    
    // Return the generated summary.
    return er_overview;
}
