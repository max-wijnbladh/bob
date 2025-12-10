function knowledge() {
    try {
      folderId = "1FrmgR7aQvKhueQt5M2L7fxHwyelNVuU-"
    // Get the folder object using the provided ID.
    const folder = DriveApp.getFolderById(folderId);
    // Get all the files in the folder.
    const files = folder.getFilesByType(MimeType.GOOGLE_DOCS);
    let allText = "";

    // Loop through each Google Doc file.
    while (files.hasNext()) {
      const file = files.next();
      const doc = DocumentApp.openById(file.getId());
      const body = doc.getBody();
      const numElements = body.getNumChildren();

      // Extract text from each element in the document body.
      for (let i = 0; i < numElements; i++) {
        const element = body.getChild(i);
        if (element.getType() === DocumentApp.ElementType.PARAGRAPH ||
            element.getType() === DocumentApp.ElementType.LIST_ITEM ||
            element.getType() === DocumentApp.ElementType.TABLE) {
          allText += element.getText() + "\n\n"; // Add text and some spacing
        }
      }
    }
    //Logger.log(allText)
    return allText;
  } catch (error) {
    Logger.log("Error processing folder or documents: " + error);
    return null; // Or handle the error as needed
  }
}
