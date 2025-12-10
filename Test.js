function postMessageAsBot(message, spaceName) {
  const token = getToken_();
  parent = "spaceName"
  Logger.log(message)
  const postedMessage = Chat.Spaces.Messages.create(
    // The message to create.
    { 'text': message },
    parent,
    {},
    // Authenticate with the service account token.
    { 'Authorization': 'Bearer ' + token }
  );
}
