/**
 * Downloads all messages from a Google Chat space starting from a specific date
 * and saves them to a new Google Spreadsheet.
 */
function exportChatMessagesToSheet() {
  
  // --- CONFIGURATION ---
  // Replace with your actual Space ID from the Google Chat URL.
  const SPACE_ID = 'spaces/AAQAHuUTW3s'; 
  
  // Set the date from which you want to start fetching messages.
  // Format: YYYY-MM-DD
  const START_DATE = '2025-04-14'; 
  // ---------------------

  // Validate configuration
  if (SPACE_ID === 'spaces/AAAAAAAAAAA' || START_DATE === 'YYYY-MM-DD') {
    Logger.log('ERROR: Please update the SPACE_ID and START_DATE variables in the script before running.');
    return;
  }

  Logger.log(`Starting export for space: ${SPACE_ID} from date: ${START_DATE}`);

  const allMessages = [];
  let pageToken = null;

  // Format the start date into RFC3339 format required by the API.
  // This sets the time to the beginning of the day in UTC.
  const filterDate = new Date(START_DATE).toISOString();
  
  try {
    // Loop through all pages of messages.
    do {
      const response = Chat.Spaces.Messages.list(SPACE_ID, {
        pageSize: 1000, // Maximum allowed page size for efficiency
        pageToken: pageToken,
        filter: `createTime > "${filterDate}"`, // Filter messages by creation time
        orderBy: "createTime asc" // Fetches oldest messages first
      });

      if (response.messages && response.messages.length > 0) {
        allMessages.push(...response.messages);
        Logger.log(`Fetched ${response.messages.length} messages... Total so far: ${allMessages.length}`);
      }
      
      pageToken = response.nextPageToken;
    } while (pageToken);

    if (allMessages.length === 0) {
      Logger.log('No messages found after the specified start date. Script finished.');
      return;
    }

    Logger.log(`Total messages fetched: ${allMessages.length}. Now creating Spreadsheet.`);
    
    // Prepare data for the spreadsheet, starting with headers.
    const data = [['Timestamp', 'Author', 'Message']];
    
    allMessages.forEach(message => {
      const timestamp = message.createTime;
      const author = message.sender.displayName;
      // Handle cases where a message might not have text (e.g., just an attachment or card).
      const text = message.text || message.formattedText || '[No Text Content]'; 
      data.push([timestamp, author, text]);
    });

    // Create a new spreadsheet with a descriptive name.
    const fileName = `Chat Export - ${SPACE_ID.replace('/', '_')} - ${new Date().toISOString()}`;
    const spreadsheet = SpreadsheetApp.create(fileName);
    const sheet = spreadsheet.getSheets()[0];
    
    // Write all the data to the sheet in one go for performance.
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    // Auto-resize columns for better readability.
    sheet.autoResizeColumns(1, 3);
    
    const spreadsheetUrl = spreadsheet.getUrl();
    Logger.log(`✅ Success! Export complete.`);
    Logger.log(`Find your new spreadsheet here: ${spreadsheetUrl}`);

  } catch (e) {
    Logger.log(`❌ An Error Occurred: ${e.toString()}`);
    Logger.log(`Stack Trace: ${e.stack}`);
  }
}