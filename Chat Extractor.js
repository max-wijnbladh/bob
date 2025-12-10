/**
 * Downloads all messages from a specified Google Chat space created after a given
 * date and saves them into a new Google Spreadsheet.
 *
 * This script handles pagination to retrieve all messages and formats them into a
 * structured sheet with Timestamp, Author, and Message content.
 */
function exportChatMessagesToSheet() {
  
  // --- CONFIGURATION ---
  // The ID of the Google Chat space to export messages from.
  // You can find this in the URL of the Google Chat space (e.g., spaces/YourSpaceID).
  const SPACE_ID = 'spaces/AAQAHuUTW3s'; 
  
  // The start date for fetching messages (inclusive).
  // The script will retrieve all messages created on or after this date.
  // Format: YYYY-MM-DD
  const START_DATE = '2025-04-14'; 
  // ---------------------

  // Basic validation to ensure the user has updated the placeholder configuration.
  if (SPACE_ID === 'spaces/AAAAAAAAAAA' || START_DATE === 'YYYY-MM-DD') {
    Logger.log('ERROR: Please update the SPACE_ID and START_DATE variables in the script before running.');
    return;
  }

  Logger.log(`Starting export for space: ${SPACE_ID} from date: ${START_DATE}`);

  const allMessages = [];
  let pageToken = null;

  // Format the start date into RFC3339 format (e.g., "2025-04-14T00:00:00Z").
  // This is the required format for the Chat API's filter parameter.
  const filterDate = new Date(START_DATE).toISOString();
  
  try {
    // Loop through all pages of messages using a do-while loop.
    // This ensures that we fetch at least one page and continue as long as a 'nextPageToken' is returned.
    do {
      const response = Chat.Spaces.Messages.list(SPACE_ID, {
        pageSize: 1000, // Use the maximum allowed page size to minimize API calls.
        pageToken: pageToken, // The token for the next page of results.
        filter: `createTime > "${filterDate}"`, // The API filter to get messages created after the specified date.
        orderBy: "createTime asc" // Fetches the oldest messages first to process them in chronological order.
      });

      if (response.messages && response.messages.length > 0) {
        // Add the fetched messages to our main array.
        allMessages.push(...response.messages);
        Logger.log(`Fetched ${response.messages.length} messages... Total so far: ${allMessages.length}`);
      }
      
      // Get the token for the next page. If it's null, the loop will terminate.
      pageToken = response.nextPageToken;
    } while (pageToken);

    if (allMessages.length === 0) {
      Logger.log('No messages found after the specified start date. Script finished.');
      return;
    }

    Logger.log(`Total messages fetched: ${allMessages.length}. Now creating Spreadsheet.`);
    
    // Prepare the data for the spreadsheet. Start with a header row.
    const data = [['Timestamp', 'Author', 'Message']];
    
    // Iterate over each fetched message and format it into a row.
    allMessages.forEach(message => {
      const timestamp = message.createTime;
      const author = message.sender.displayName;
      // A message might not contain text (e.g., if it only has an attachment or a card).
      // This line safely handles such cases by providing a fallback string.
      const text = message.text || message.formattedText || '[No Text Content]'; 
      data.push([timestamp, author, text]);
    });

    // Create a new spreadsheet with a unique, descriptive name.
    const fileName = `Chat Export - ${SPACE_ID.replace('/', '_')} - ${new Date().toISOString()}`;
    const spreadsheet = SpreadsheetApp.create(fileName);
    const sheet = spreadsheet.getSheets()[0];
    
    // Write all the data to the sheet in a single API call for better performance.
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
    
    // Auto-resize the columns to ensure the content is easily readable.
    sheet.autoResizeColumns(1, 3);
    
    const spreadsheetUrl = spreadsheet.getUrl();
    Logger.log(`✅ Success! Export complete.`);
    Logger.log(`Find your new spreadsheet here: ${spreadsheetUrl}`);

  } catch (e) {
    // Catch and log any errors that occur during the API calls or spreadsheet manipulation.
    Logger.log(`❌ An Error Occurred: ${e.toString()}`);
    Logger.log(`Stack Trace: ${e.stack}`);
  }
}
