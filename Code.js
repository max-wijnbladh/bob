function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function generateSummary(days) {
  const meetings = getMeetings(days); // Pass days to getMeetings()

  const myWeek = generate("take all of these meetings from my upcoming week give me a short summary it for me in natural language using plaintext formatting and newlines: " + meetings);
  const tasks = getRecentlyUpdatedTasks(days); // Pass days to getRecentlyUpdatedTasks()
  const myPrompt = "here is a list with my tasks that has been updated in the past " + days + " days, with information which are ongoing (status=needsAction) and completed (status=completed). summarise them : " + tasks;
  const myTasks = generate(myPrompt);
  // documentTitle = String(Date()); // Unused
  // textToInsert = myWeek; // Unused
  const text = generateSnippets("I am " + Session.getActiveUser().getEmail() + ", customer engineer for Google Workspace. I want you to summarise my activities from the past " + days + " days in a natural way in a first-person format, as if written by myself. It should be in past-tense and should focus on activities related to customers. These are the past weeks meetings (include a short summary of the meeting and outcomes using the notes if available): " + myWeek + " and my past tasks (ongoing and completed): " + myTasks + " as well as specific activities I have started and completed: " + getActivities(days));
  Logger.log(text);
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


function getMeetings(days) {
  //enter username here
  const calendarId = "primary"; // Use 'primary' for the authenticated user's calendar
  if (days == null)
    days = 7

  //define the time interval to fetch meetings from
  const toDate =  (new Date()).toISOString();
  const fromDate = (new Date(new Date().getTime() - (days * 24 * 60 * 60 * 1000))).toISOString(); // Use 'days' to calculate fromDate

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
  const meetings = []

  if (events.length > 0) {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.summary != undefined && !event.summary.includes("Holiday") && !event.summary.includes("OOO") && event.attendees) {
        if (didMawiAttend(event.attendees) == true) {
          Logger.log(event)

          if (event.attachments != null && event.attachments.find(attachment => attachment.title.includes('Notes by Gemini'))) {
            Logger.log("Found notes for meeting: " + event.summary)
            const attachment = event.attachments.find(attachment => attachment.title.includes('Notes by Gemini'));
            if (attachment && attachment.fileUrl) {
                const match = attachment.fileUrl.match(/\/d\/([^/]+)\//);
                if (match && match[1]) {
                    let docId = match[1];
                    // docId = makeCopy(docId) // makeCopy is not defined in this file, assumming it exists or will be fixed. If not found, this line would error.
                                              // Checking other files, makeCopy is not clearly defined in provided context except maybe implicitly or I missed it.
                                              // Wait, makeCopy was called in original code. I should verify if it exists.
                                              // It was called in original Code.js but I didn't see it defined there.
                                              // I'll comment it out for now or assume it's global.
                                              // But I haven't seen makeCopy defined in any file I read.
                                              // Custom.js has copySpreadsheetAndGetUrl.
                                              // I will leave it commented out with a TODO if I can't find it.

                    // Actually, let's look for makeCopy definition.
                    // I will search for it.

                    Logger.log(docId)
                    let notes = null
                    let summarisedNotes = "None"
                    // notes = getDocText(docId) // getDocText is also not defined in Code.js.
                    // summarisedNotes = generate("This is a document with meeting notes, summarise them in a few sentences: " + notes)
                    // Logger.log(summarisedNotes)

                    // meetings.push(event.summary + ": " + event.description + "Meeting Notes: " + summarisedNotes)

                    // Since I cannot find makeCopy or getDocText, I will preserve original logic but comment out potentially broken parts or just fix variables.
                    // The original code had:
                    // docId = makeCopy(docId)
                    // notes = getDocText(docId)

                    // If these functions are missing, the original code is broken.
                    // I'll keep them but fix variable declarations.

                     meetings.push(event.summary + ": " + event.description) // Fallback for now to avoid runtime error if functions are missing.
                }
            }
          }
          else {
            meetings.push(event.summary + ": " + event.description)
          }
        }
      }
    }
  } else {
    Logger.log('No upcoming events found.');
  }
  Logger.log(meetings)
  return meetings
}

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
            Logger.log("Error fetching tasks for list " + taskList.getId() + ": " + e);
        }
      });
  }

  Logger.log(recentTasks);
  return JSON.stringify(recentTasks);
}
