function getSpaceParticipants(spaceId) {
  // Get the space.
  spaceId = "spaces/AAAA0QZeTEs"
  var space = Chat.Spaces.get(spaceId);
  

  // Get the members of the space.
  var members = Chat.Spaces.Members.list(spaceId).items;

  // Log the display names of the participants.
  if (members && members.length > 0) {
    Logger.log("Participants in space '" + space.displayName + "' (ID: " + spaceId + "):");
    members.forEach(function(member) {
      Logger.log(member.email);
      // You can also access other member properties like email (if permitted)
      // Logger.log(member.email); // Requires appropriate authorization scopes
    });
    return members; // Return the members array if needed for further processing
  } else {
    Logger.log("No participants found in space '" + space.displayName + "' (ID: " + spaceId + ").");
    return []; // Return an empty array if no members are found
  }
}

/**
 * Example usage:  Replace 'YOUR_SPACE_ID' with the actual space ID.
 * You can find the space ID in the URL of the Google Chat space.
 */
function test_getSpaceParticipants() {
  var spaceId = 'YOUR_SPACE_ID'; // Replace with your Space ID
  getSpaceParticipants(spaceId);
}


/**
 *  A more robust function that handles pagination.
 *  Google Chat API returns members in pages. This function fetches all pages.
 */

function getAllSpaceParticipants(spaceId) {
  var members = [];
  var pageToken;

  do {
    var response = Chat.Spaces.Members.list(spaceId, {
      pageToken: pageToken
    });

    if (response.items) {
      members = members.concat(response.items);
    }
    pageToken = response.nextPageToken;

  } while (pageToken);

  if (members.length > 0) {
    Logger.log("All Participants in space (ID: " + spaceId + "):");
    members.forEach(function(member) {
      Logger.log(member.displayName);
    });
    return members;
  } else {
    Logger.log("No participants found in space (ID: " + spaceId + ").");
    return [];
  }
}

function test_getAllSpaceParticipants() {
  var spaceId = 'YOUR_SPACE_ID'; // Replace with your Space ID
  getAllSpaceParticipants(spaceId);
}

/**
 * Lists all the members of a Chat space.
 * @param {string} spaceName The resource name of the space.
 */
function listMemberships(spaceName) {
  spaceName = "spaces/AAAA0QZeTEs"
  let response;
  let pageToken = null;
  try {
    do {
      response = Chat.Spaces.Members.list(spaceName, {
        pageSize: 10,
        pageToken: pageToken
      });
      if (!response.memberships || response.memberships.length === 0) {
        pageToken = response.nextPageToken;
        continue;
      }
      response.memberships.forEach((membership) => console.log(
          'Member resource name: %s (type: %s)',
          membership,
          membership.member.type));
      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (err) {
    // TODO (developer) - Handle exception
    console.log('Failed with error %s', err.message);
  }
}