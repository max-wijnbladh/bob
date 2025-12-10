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
 * Retrieves the domain name for a given company.
 * @param {string} account_name The name of the company.
 * @returns {string} The domain name of the company.
 */
function getDomain(account_name) {
  // Uses a generative AI to find the domain name.
  domain = generate("Return the domain name of the following company, and nothing else: " + account_name)
  return domain
}

/**
 * Retrieves a short summary of a company's business.
 *
 * @param {string} companyName The name of the company to look up.
 * @returns {object} A JSON object containing the company's summary, or an error object on failure.
 */
function getCompanyDetails(companyName) {
  // Note: The companyName is currently hardcoded for demonstration purposes.
  companyName = "Max Burger"
  try {
    const prompt = `Provide the following information about ${companyName} in JSON format, using the specified field names:
    {
      "ai.account.summary": "Short summary about the business",
    }`;

    // Call the Gemini API to get the company summary.
    const responseString = gemini(prompt, "gemini-2.0-flash");
    Logger.log(responseString);

    // Parse the JSON response.
    const companyDetails = JSON.parse(cleanJSONString2(responseString));
    Logger.log(companyDetails);

    // Return the JSON object.
    return companyDetails;
  } catch (e) {
    Logger.log("Error retrieving company details: " + e);
    return { error: "Failed to retrieve company details", details: e.toString() };
  }
}


/**
 * Calls the Gemini API to get information about a specific account and returns a JSON object.
 * @param {string} accountName - The name of the account to look up.
 * @returns {object|null} - A JSON object containing the account information, or null if an error occurs.
 */
function getAccountDetailsFromGemini(accountName) {
  if (!accountName) {
    Logger.log("getAccountDetailsFromGemini: Account name cannot be empty.");
    return null;
  }

  const prompt = `Provide information about the following company: ${accountName}. Structure your response as a JSON object with the following fields: "domain", "summary", "employees", "locations", "products", "hq", "website", "revenue". If a field cannot be determined, set its value to null. domain should be in the form example.com`;

  try {
    const response = generate(prompt)
    if (response) {
      try {
        const jsonResponse = jsonObjectify(response)
        // Basic validation of the expected fields
        const expectedFields = ["domain", "summary", "employees", "locations", "products", "hq", "website", "revenue"];
        for (const field of expectedFields) {
          if (!(field in jsonResponse)) {
            Logger.log(`getAccountDetailsFromGemini: Gemini response is missing the field "${field}". Response was: ${response}`);
            return jsonResponse;
          }
        }
        return jsonResponse;
      } catch (e) {
        Logger.log(`getAccountDetailsFromGemini: Error parsing Gemini response as JSON: ${e}. Response was: ${response}`);
        return null;
      }
    } else {
      Logger.log(`getAccountDetailsFromGemini: Gemini API returned an empty response for account: ${accountName}`);
      return null;
    }
  } catch (error) {
    Logger.log(`getAccountDetailsFromGemini: Error calling Gemini API for account "${accountName}": ${error}`);
    return null;
  }
}

/**
 * Example of how you might use the getAccountDetailsFromGemini function.
 */
function exampleGetAccountDetails() {
  const accountName = "Acme Corp"; // Replace with an actual account name
  const accountInfo = getAccountDetailsFromGemini(accountName);

  if (accountInfo) {
    safeLog_NEW(`Account Info for ${accountName}:`);
    safeLog_NEW(JSON.stringify(accountInfo, null, 2)); // Pretty print the JSON
    return accountInfo
    // You can now access the individual fields like accountInfo.domain, accountInfo.summary, etc.
  } else {
    safeLog_NEW(`Could not retrieve account details for ${accountName}. Check logs for errors.`);
  }
}
