function getToken_() {
  const accountEmail = PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_EMAIL');
  if (!accountEmail) {
    throw new Error('Service account email not set. Please run setServiceAccountEmail(your_email) to set it.');
  }
  const tokenResponse = UrlFetchApp.fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${accountEmail}:generateAccessToken`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({
        'scope': [ 'https://www.googleapis.com/auth/chat.bot' ],
        'lifetime': '3600s'
      })
    });
  const token = JSON.parse(tokenResponse.getContentText());
  return token.accessToken;
}

function setServiceAccountEmail(email) {
  PropertiesService.getScriptProperties().setProperty('SERVICE_ACCOUNT_EMAIL', email);
  console.log('Service account email has been set.');
}
