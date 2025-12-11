// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Responds to HTTP GET requests by serving the 'index.html' file.
 * This is the entry point for the web app.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

/**
 * Generates a summary of meetings, tasks, and activities for a specified number of days.
 *
 * @param {number} days The number of past days to generate the summary for.
 * @returns {string} The generated summary text.
 */
function generateSummary(days) {
  // Get meetings for the specified number of days.
  const meetings = getMeetings(days);
  const myWeek = generate("Summarize the following meetings from my upcoming week in natural language, using plaintext formatting and newlines: " + meetings);

  // Get recently updated tasks.
  const tasks = getRecentlyUpdatedTasks(days);
  const myPrompt = `Here is a list of my tasks that have been updated in the past ${days} days, with their status (ongoing or completed). Please summarize them: ${tasks}`;
  const myTasks = generate(myPrompt);

  // Generate a comprehensive summary.
  const documentTitle = String(new Date());
  const textToInsert = myWeek;
  const text = generateSnippets(`I am Max Wijnbladh, a customer engineer for Google Workspace. I want you to summarize my activities from the past ${days} days in a first-person format, as if written by myself. The summary should be in the past tense and focus on customer-related activities. Here are my meetings (including a short summary and outcomes from the notes, if available): ${myWeek}, my recent tasks (ongoing and completed): ${myTasks}, and other specific activities I have started and completed: ${getActivities(days)}`); 
  
  Logger.log(text);
  return text; // Return the final generated summary.
}

/**
 * Checks if a specific person (Mawi) attended a meeting.
 *
 * @param {Array<object>} attendees An array of attendee objects from a Google Calendar event.
 * @returns {boolean} True if Mawi attended the meeting, false otherwise.
 */
function didMawiAttend(attendees) {
  for (const attendee of attendees) {
    if (attendee.email === "mawi@google.com") {
      const response = attendee.responseStatus.toLowerCase();
      if (response === "accepted" || response === "yes") {
        return true;
      } else if (response === "declined" || response === "no") {
        return false;
      } else {
        return false; // Assumes non-responses mean non-attendance.
      }
    }
  }
  return false; // Mawi was not found in the attendee list.
}

/**
 * Retrieves a list of meetings from the user's calendar for a specified number of days.
 *
 * @param {number} days The number of past days to retrieve meetings from.
 * @returns {Array<string>} A list of meetings with their details.
 */
function getMeetings(days) {
  const calendarId = Session.getActiveUser().getEmail();
  const ldap = calendarId.split('@')[0];
  days = days || 7; // Default to 7 days if not provided.

  const toDate = (new Date()).toISOString();
  const fromDate = (new Date(new Date().getTime() - (days * 24 * 60 * 60 * 1000))).toISOString();

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

  if (events.length > 0) {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.summary && !event.summary.includes("Holiday") && !event.summary.includes("OOO") && event.attendees) {
        if (didMawiAttend(event.attendees)) {
          if (event.attachments && event.attachments.find(attachment => attachment.title.includes('Notes by Gemini'))) {
            const match = (event.attachments.find(attachment => attachment.title.includes('Notes by Gemini')).fileUrl).match(/\/d\/([^/]+)\//);
            let docId = match[1];
            docId = makeCopy(docId);
            let notes = getDocText(docId);
            let summarisedNotes = generate("Summarize these meeting notes in a few sentences: " + notes);
            meetings.push(`${event.summary}: ${event.description} Meeting Notes: ${summarisedNotes}`);
          } else {
            meetings.push(`${event.summary}: ${event.description}`);
          }
        }
      }
    }
  } else {
    Logger.log('No upcoming events found.');
  }
  return meetings;
}

/**
 * Retrieves a list of tasks that have been updated within a specified number of days.
 *
 * @param {number} days The number of past days to check for updated tasks.
 * @returns {string} A JSON string representing the list of recent tasks.
 */
function getRecentlyUpdatedTasks(days) {
  const taskLists = Tasks.Tasklists.list().getItems();
  const recentTasks = [];
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  taskLists.forEach(taskList => {
    const tasks = Tasks.Tasks.list(taskList.getId()).getItems();
    tasks.forEach(task => {
      const updatedDate = new Date(task.getUpdated());
      if (updatedDate >= daysAgo) {
        recentTasks.push({
          title: task.title,
          updated: updatedDate,
          completed: task.getCompleted(),
        });
      }
    });
  });

  return JSON.stringify(recentTasks);
}
