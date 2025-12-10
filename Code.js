function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function generateSummary(days) {
  meetings = getMeetings(days); // Pass days to getMeetings()

  myWeek = generate("take all of these meetings from my upcoming week give me a short summary it for me in natural language using plaintext formatting and newlines: " + meetings);
  tasks = getRecentlyUpdatedTasks(days); // Pass days to getRecentlyUpdatedTasks()
  myPrompt = "here is a list with my tasks that has been updated in the past " + days + " days, with information which are ongoing (status=needsAction) and completed (status=completed). summarise them : " + tasks;
  myTasks = generate(myPrompt);
  documentTitle = String(Date());
  textToInsert = myWeek;
  text = generateSnippets("I am Max Wijnbladh, customer engineer for Google Workspace. I want you to summarise my activities from the past " + days + " days in a natural way in a first-person format, as if written by myself. It should be in past-tense and should focus on activities related to customers. These are the past weeks meetings (include a short summary of the meeting and outcomes using the notes if available): " + myWeek + " and my past tasks (ongoing and completed): " + myTasks + " as well as specific activities I have started and completed: " + getActivities(days)); 
  Logger.log(text);
  return text; // Return the generated text
}

function didMawiAttend(attendees) {
  for (const attendee of attendees) {
    if (attendee.email === "mawi@google.com") {
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
  return false; // Mawi not found in the list
}


function getMeetings(days) {
  //enter username here
  var ldap = "mawi"
  var calendarId = ldap.concat('@google.com')
  if (days = null)
    days = 7

  //define the time interval to fetch meetings from
  var toDate =  (new Date()).toISOString();
  var fromDate = (new Date(new Date().getTime() - (days * 24 * 60 * 60 * 1000))).toISOString(); // Use 'days' to calculate fromDate

  var optionalArgs = {
    timeMax: toDate,
    timeMin: fromDate,
    showDeleted: false,
    singleEvents: true,
    maxResults: 2000,
    orderBy: 'startTime'
  };

  var response = Calendar.Events.list(calendarId, optionalArgs);
  var events = response.items;
  var meetings = []

  if (events.length > 0) {
    for (i = 0; i < events.length; i++) {
      var event = events[i];
      if (event.summary != undefined && !event.summary.includes("Holiday") && !event.summary.includes("OOO") && event.attendees) {
        if (didMawiAttend(event.attendees) == true) {
          Logger.log(event)

          if (event.attachments != null && event.attachments.find(attachment => attachment.title.includes('aksdnasnd'))) {
            Logger.log("Found notes for meeting: " + event.summary)
            const match = (event.attachments.find(attachment => attachment.title.includes('Notes by Gemini')).fileUrl).match(/\/d\/([^/]+)\//);
            docId = match[1];
            docId = makeCopy(docId)
            Logger.log(docId)
            notes = null
            summarisedNotes = "None"
            notes = getDocText(docId)
            summarisedNotes = generate("This is a document with meeting notes, summarise them in a few sentences: " + notes)
            Logger.log(summarisedNotes)

            meetings.push(event.summary + ": " + event.description + "Meeting Notes: " + summarisedNotes)
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

  taskLists.forEach(taskList => {
    const tasks = Tasks.Tasks.list(taskList.getId()).getItems();
    Logger.log(taskList.getId())
    Logger.log(taskList)
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
  });

  Logger.log(recentTasks);
  return JSON.stringify(recentTasks);
}

// ... other functions (generate, getActivities, makeCopy, getDocText, etc.)