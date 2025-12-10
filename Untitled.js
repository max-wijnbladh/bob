function getMainImage(url) {
  try {
    var response = UrlFetchApp.fetch(url);
    var html = response.getContentText();
    var $ = Cheerio.load(html);

    var postContent = $('div.post-content');
    Logger.log("post content html: " + postContent.html());

    var imageElement = $('div.post-content img:not(.blogger-post-favicon)');
    Logger.log("Image Elements Length: " + imageElement.length);

    if (imageElement.length) {
      var imageUrl = imageElement.first().attr('src');
    } else {
      return null;
    }

    if (imageUrl) {
      imageUrl = imageUrl.replace(/^\/\//, 'https://');
      imageUrl = imageUrl.replace(/(\.png|\.jpg|\.jpeg|\.gif).*$/, '$1');
      return imageUrl;
    } else {
      return null;
    }
  } catch (error) {
    Logger.log('Error fetching or parsing the page: ' + error);
    return null;
  }
}

function testGetMainImage() {
  var blogUrl = 'https://workspaceupdates.googleblog.com/2025/03/updates-for-generating-meeting-backgrounds-with-gemini.html';
  var imageUrl = getMainImage(blogUrl);

  if (imageUrl) {
    Logger.log('Main image URL: ' + imageUrl);
  } else {
    Logger.log('Could not find the main image.');
  }
}

/**
 * Deletes all uncompleted tasks in the user's default task list.
 */
function deleteUncompletedTasks() {
  try {
    // Get the default task list.
    const taskLists = Tasks.Tasklists.list();
    if (!taskLists || !taskLists.items || taskLists.items.length === 0) {
      Logger.log("No task lists found.");
      return;
    }
    const defaultTaskListId = taskLists.items[0].id;

    // Get all tasks in the default task list.
    let tasks;
    let pageToken;
    do {
      tasks = Tasks.Tasks.list(defaultTaskListId, { pageToken: pageToken });
      if (tasks && tasks.items) {
        for (const task of tasks.items) {
          // Check if the task is not completed.
          if (task.status !== "completed") {
            // Delete the task.
            Tasks.Tasks.remove(defaultTaskListId, task.id);
            Logger.log(`Deleted task: ${task.title}`);
          }
        }
      }
      pageToken = tasks.nextPageToken;
    } while (pageToken);

    Logger.log("Deletion of uncompleted tasks completed.");
  } catch (e) {
    Logger.log(`Error: ${e.toString()}`);
  }
}