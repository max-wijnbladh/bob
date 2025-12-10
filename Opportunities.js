function getSuggestion(summary,nextsteps,activities) {

  prompt = "We have an ongoing Google Workspace business deal with a company. I will provide you with some details of the deal and next steps and activities, and I want you to provide me with a suggestion on how we can approach the deal to win the customer using that info: " + summary + nextsteps + activities
  suggestion = generate(prompt)

  return suggestion
  
}

function createDriveFolder(folderName) {
  Logger.log("Naming folder: " + folderName)
  try {
    // Create the folder.
    const folder = DriveApp.createFolder(folderName);

    // Get and return the folder ID.
    return "https://drive.google.com/scary/drive/u/0/folders/" + folder.getId();
  } catch (error) {
    Logger.log("Error creating folder: " + error);
    return ""; // Or you could throw the error if you want the script to stop.
  }
}

function newOpportunity(opportunityName) {
  spaceName = createSpace(opportunityName)
  //folder = createDriveFolder(opportunityName)
  //postMessageWithUserCredentials(folder, spaceName)
}

function setupOpportunity() {
  account_names = ["Test"]
  account_names.forEach(newOpportunity)
}