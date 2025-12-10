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
  const apiKey = 'AIzaSyDz_Ko_PsJ6NH-StASftvkRRTnlTx4BnIk'; // Replace with your actual API key
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
    output = (responseData.candidates[0].content.parts[0].text); // Extract the generated story
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
  const apiKey = 'AIzaSyDCUanmzP4y9qgXVxmKgjQ9GWOQZF4ymUo'; // Replace with your actual API key
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
    output = (responseData.candidates[0].content.parts[0].text); // Extract the generated story
    return output
  } catch (error) {
    console.error("Error generating story:", error.message);
    return null; // Indicate failure due to unexpected error
  }
}
