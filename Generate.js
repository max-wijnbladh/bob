function generate(prompt) {
  Logger.log("I am running!")
  const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  // 1. Construct Request Body (no image data needed)
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  // 2. Make API Request (with error handling)
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY script property is not set.');
    return null;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true // Suppress default error logging to match curl's 2> /dev/null
  };

  try {
    const response = UrlFetchApp.fetch(apiEndpoint, options);
    if (response.getResponseCode() !== 200) {
      // Handle errors here based on response.getContentText() if needed
      console.error(`API request failed: ${response.getContentText()}`);
      return null; // Indicate failure
    }

    const responseData = JSON.parse(response.getContentText());
    const output = (responseData.candidates[0].content.parts[0].text); // Extract the generated story
    return output
  } catch (error) {
    console.error("Error generating story:", error.message);
    return null; // Indicate failure due to unexpected error
  }
}

function gemini(prompt, model) {
  const apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';

  // 1. Construct Request Body (no image data needed)
  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };

  // 2. Make API Request (with error handling)
  // Using the same key property for simplicity, or a second one if strictly needed.
  // The original code had two different keys. To be safe, I'll use a second property.
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY_2') || PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    console.error('GEMINI_API_KEY (or GEMINI_API_KEY_2) script property is not set.');
    return null;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true // Suppress default error logging to match curl's 2> /dev/null
  };

  try {
    const response = UrlFetchApp.fetch(apiEndpoint, options);
    if (response.getResponseCode() !== 200) {
      // Handle errors here based on response.getContentText() if needed
      console.error(`API request failed: ${response.getContentText()}`);
      return null; // Indicate failure
    }

    const responseData = JSON.parse(response.getContentText());
    const output = (responseData.candidates[0].content.parts[0].text); // Extract the generated story
    return output
  } catch (error) {
    console.error("Error generating story:", error.message);
    return null; // Indicate failure due to unexpected error
  }
}
