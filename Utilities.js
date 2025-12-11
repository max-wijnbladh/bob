/**
 * Makes a copy of a Google Doc file.
 *
 * @param {string} docId The ID of the Google Doc file to copy.
 * @returns {string} The ID of the new copy.
 */
function makeCopy(docId) {
  const file = DriveApp.getFileById(docId);
  const newFile = file.makeCopy('Copy of ' + file.getName());
  return newFile.getId();
}

/**
 * Retrieves the text content of a Google Doc.
 *
 * @param {string} docId The ID of the Google Doc.
 * @returns {string} The text content of the document.
 */
function getDocText(docId) {
  const doc = DocumentApp.openById(docId);
  return doc.getBody().getText();
}
