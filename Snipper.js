function generateSnippets(days = 7) {
  const meetings = getMyMeetings(days); // Pass days to getMeetings()

  const myWeek = generate("take all of these meetings from my upcoming week give me a short summary it for me in natural language using plaintext formatting and newlines: " + meetings);
  Logger.log("My meetings: " + JSON.stringify(meetings))
  const tasks = getRecentlyUpdatedTasks(days); // Pass days to getRecentlyUpdatedTasks()
  const myPrompt = "here is a list with my tasks that has been updated in the past " + days + " days, with information which are ongoing (status=needsAction) and completed (status=completed). summarise them : " + tasks;
  const myTasks = generate(myPrompt);
  const textToInsert = myWeek;
  const text = generate("I am " + Session.getActiveUser().getEmail() + ", customer engineer for Google Workspace. I want you to summarise my activities from the past " + days + " days in a natural way in a first-person format, as if written by myself. It should be in past-tense and should focus on activities related to customers. These are the past weeks meetings (include a short summary of the meeting and outcomes using the notes if available): " + myWeek + " and my past tasks (ongoing and completed): " + myTasks + " as well as specific activities I have started and completed: " + getActivities(days));
  Logger.log(text);
  if (typeof appendWeeklyDigest === 'function') {
      appendWeeklyDigest(text)
  }
  return text; // Return the generated text
}

function didMawiAttend(attendees) {
  const userEmail = Session.getActiveUser().getEmail();
  for (const attendee of attendees) {
    if (attendee.email === userEmail) {
      const response = attendee.responseStatus.toLowerCase();

      // Google Calendar Specific Responses
      if (response === "accepted" || response === "yes") {
        // "needsAction" is included for those who haven't responded yet but were invited
        return true;
      } else if (response === "declined" || response === "no") {
        return false;
      } else {
        // Handle other responses (e.g., "tentative", "maybe") as needed 
        return false; // or some other logic based on your requirements
      }
    }
  }
  return false; // User not found in the list
}


function getMyMeetings(days) {
   //enter username here
   const calendarId = "primary";

   // Corrected the assignment operator to a comparison operator
   if (days == null) {
     days = 7;
   }

   //define the time interval to fetch meetings from
   const toDate = (new Date()).toISOString();
   const fromDate = (new Date(new Date().getTime() - (days * 24 * 60 * 60 * 1000))).toISOString(); // Use 'days' to calculate fromDate
   Logger.log("Fetching meetings from: " + fromDate + " to " + toDate);

   const optionalArgs = {
     timeMax: toDate,
     timeMin: fromDate,
     showDeleted: false,
     singleEvents: true,
     maxResults: 2000,
     orderBy: 'startTime'
   };

   const response = Calendar.Events.list(calendarId, optionalArgs);
   const events = response.items;
   const meetings = [];

   if (events && events.length > 0) {
     for (let i = 0; i < events.length; i++) {
       const event = events[i];
       if (event.summary && !event.summary.includes("Holiday") && !event.summary.includes("OOO") && event.attendees) {
         if (didMawiAttend(event.attendees)) {
           const title = event.summary;
           const startTime = event.start.dateTime || event.start.date;
           const endTime = event.end.dateTime || event.end.date;

           // --- START: New logic to fetch notes from Gmail ---

           const meetingDate = new Date(startTime);
           // Formats the date to match the email subject, e.g., "Aug 13, 2025"
           const formattedDate = Utilities.formatDate(meetingDate, Session.getScriptTimeZone(), "MMM d, yyyy");

           // Construct the search query to find the notes email
           const searchQuery = `subject:("Notes: \\"${title}\\" ${formattedDate}") in:inbox`;
           Logger.log(`Searching for email with query: ${searchQuery}`);

           const threads = GmailApp.search(searchQuery, 0, 1);
           let notes = "No summary email was found."; // Default text if no notes are found

           if (threads.length > 0) {
             const message = threads[0].getMessages()[0]; // Get the first message of the first thread
             notes = message.getPlainBody(); // Extract the plain text body of the email
             Logger.log(`Found notes for meeting: "${title}"`);
           } else {
             Logger.log(`No notes email found for meeting: "${title}"`);
           }
           // --- END: New logic ---

           // Add event details to the meetings array, including the notes.
           meetings.push({
             title: title,
             startTime: startTime,
             endTime: endTime,
             description: event.description,
             attendees: event.attendees.map(a => a.email).join(', '), // Cleaner attendee list
             notes: notes // Add the extracted notes or default text
           });
         }
       }
     }
   }

   Logger.log("Final meetings object with notes: " + JSON.stringify(meetings));
   return JSON.stringify(meetings);
 }

// getRecentlyUpdatedTasks is duplicated here from Code.js.
// It is better to rely on Code.js if it's available in the same project,
// but if this is a standalone file or library, keeping it is fine.
// I'll update it to be consistent with Code.js version (implicit globals fix)
function getRecentlyUpdatedTasks(days) {
  const taskLists = Tasks.Tasklists.list().getItems();
  const recentTasks = [];
  const daysAgo = new Date(); // Current time
  daysAgo.setDate(daysAgo.getDate() - days); // Go back 'days' days

  if (taskLists) {
    taskLists.forEach(taskList => {
        try {
            const tasks = Tasks.Tasks.list(taskList.getId()).getItems();
            Logger.log(taskList.getId())
            Logger.log(taskList)
            if (tasks) {
                tasks.forEach(task => {
                const updatedDate = new Date(task.getUpdated()); // Get update time
                if (updatedDate >= daysAgo) { // Check if updated in past 'days' days
                    Logger.log(task)
                    recentTasks.push({
                    title: task.title,
                    updated: updatedDate,  // Store as Date object for easier comparison later
                    //notes: task.selfLink(),
                    completed: task.getCompleted(), // Get completion time (if any)
                    });
                }
                });
            }
        } catch (e) {
            Logger.log("Error processing task list " + taskList.getId() + ": " + e);
        }
    });
  }

  Logger.log(recentTasks);
  return JSON.stringify(recentTasks);
}

function getActivities(date = 7) {
  const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('ACTIVITIES_SHEET_ID') || "1thd7evH_xQ2yzM9TPO4xzWj_sqnoyKF_OarASQKkUYE";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Activities");
  const activities = extractRowsByPastDays(sheet, date)
  Logger.log(activities)
  if (activities && activities.length > 0) {
    return (generate("Generate a summary of the activities from the past two weeks: " + activities))
  }
  return "No activities found.";
}

function extractRowsByPastDays(sheet, days) {
  // Calculate the date "days" ago.
  const today = new Date();
  const dateToCompare = new Date();
  dateToCompare.setDate(today.getDate() - days);
  dateToCompare.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

  // Get the data range.
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  // Find the index of the "activities.completed_date" column.
  const dateColumnIndex = getColumnIndex(sheet, "activities.completed_date");

  if (dateColumnIndex === -1) {
    Logger.log("Column 'activities.completed_date' not found.");
    return []; // Return empty array if column not found
  }

  // Array to store the extracted rows.
  const extractedRows = [];

  // Iterate through the rows and extract the ones matching the date range.
  for (let i = 1; i < values.length; i++) { // Start from 1 to skip the header row
    const rowDateValue = values[i][dateColumnIndex];

    if (rowDateValue === undefined || rowDateValue === null || rowDateValue === "") {
      Logger.log("Row " + (i + 1) + ", column " + (dateColumnIndex + 1) + " is undefined, null, or empty.");
      continue;
    }

    // Attempt to parse the date string
    const parsedDate = parseDateString(rowDateValue);

    if (parsedDate === null) {
      Logger.log("Row " + (i + 1) + ", column " + (dateColumnIndex + 1) + " could not be parsed as a date: " + rowDateValue);
      continue;
    }

    parsedDate.setHours(0, 0, 0, 0); // Normalize to midnight

    const comparison = parsedDate >= dateToCompare; // Corrected comparison
    if (parsedDate >= dateToCompare) { // Corrected comparison
      Logger.log(comparison);
      Logger.log("Parsed: " + parsedDate);
      Logger.log("Compare: " + dateToCompare);
      extractedRows.push(values[i]);
    }
  }
  Logger.log(extractedRows)
  // Return the extracted rows.
  return extractedRows;
}

function parseDateString(dateString) {
  try {
    return new Date(dateString); // Try the standard Date constructor
  } catch (e) {
    return null; // Return null if parsing fails
  }

}

function getColumnIndex(sheet, columnName) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let i = 0; i < headerRow.length; i++) {
    if (headerRow[i].toLowerCase() === columnName.toLowerCase()) {
      return i; // Return the zero-based index
    }
  }
  return -1; // Return -1 if the header is not found
}
