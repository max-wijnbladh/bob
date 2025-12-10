/**
 * Sets the service account email in the script properties.
 *
 * @param {string} email The email address of the service account.
 */
function setServiceAccountEmail(email) {
  PropertiesService.getScriptProperties().setProperty('SERVICE_ACCOUNT_EMAIL', email);
  console.log('Service account email has been set.');
}
