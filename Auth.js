function getToken_() {
  const accountEmail = 'bob-sa@mawi-bob.iam.gserviceaccount.com';
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
