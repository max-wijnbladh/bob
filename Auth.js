/**
 * Retrieves an OAuth2 access token for the service account.
 *
 * This function authenticates with the Google Cloud IAM API to generate an access
 * token that can be used to authorize requests to other Google Cloud APIs.
 *
 * @returns {string} The access token.
 * @throws {Error} If the service account email is not set in the script properties.
 */
function getToken_() {
  const accountEmail = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_EMAIL');
  if (!accountEmail) {
    throw new Error('Service account email not set. Please run setServiceAccountEmail(your_email) to set it.');
  }

  // Construct the request to the IAM Credentials API to generate an access token.
  const tokenResponse = UrlFetchApp.fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${accountEmail}:generateAccessToken`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        'scope': [ 'https://www.googleapis.com/auth/chat.bot' ], // Define the required OAuth scope for the token.
        'lifetime': '3600s' // Set the token's lifetime to 1 hour.
      })
    });

  // Parse the response and return the access token.
  const token = JSON.parse(tokenResponse.getContentText());
  return token.accessToken;
}

/**
 * Sets the service account email in the script properties.
 *
 * @param {string} email The email address of the service account.
 */
function setServiceAccountEmail(email) {
  PropertiesService.getScriptProperties().setProperty('SERVICE_ACCOUNT_EMAIL', email);
  console.log('Service account email has been set.');
}
