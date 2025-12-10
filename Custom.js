/**
 * Makes a copy of a Google Sheet file, names it according to the customer,
 * and returns the URL of the new copy.
 *
 * @param {string} sourceSpreadsheetId The ID of the Google Sheet file to copy.
 * @param {string} customerName The name of the customer, used to create the new file name.
 * @returns {string|null} The URL of the new spreadsheet, or null on failure.
 */
function copySpreadsheetAndGetUrl(sourceSpreadsheetId = "1lw_pwSzhbmAibI3_2AF3GPejRsAi5dgfwS5e6BGKoNQ", customerName) {
  Logger.log(`Attempting to copy spreadsheet with ID: ${sourceSpreadsheetId} for customer: ${customerName}`);

  if (!sourceSpreadsheetId || !customerName) {
    Logger.log("ERROR: Both sourceSpreadsheetId and customerName are required.");
    return null;
  }

  try {
    // Get the source file and create a new file name.
    const sourceFile = DriveApp.getFileById(sourceSpreadsheetId);
    const newFileName = `${customerName} Google Workspace MEP`;
    
    // Make a copy and get its URL.
    const newSpreadsheetCopy = sourceFile.makeCopy(newFileName);
    const newUrl = newSpreadsheetCopy.getUrl();
    
    Logger.log(`Successfully created a copy named "${newFileName}". URL: ${newUrl}`);
    return newUrl;

  } catch (e) {
    Logger.log(`ERROR in copySpreadsheetAndGetUrl: ${e.message}`);
    return null;
  }
}

/**
 * An example test function to show how to use the copySpreadsheetAndGetUrl function.
 */
function testCopySheetWithCustomerName() {
  const TEMPLATE_SHEET_ID = "YOUR_TEMPLATE_SPREADSHEET_ID_HERE"; 
  const sampleCustomerName = "Acme Corporation";

  const newSheetUrl = copySpreadsheetAndGetUrl(TEMPLATE_SHEET_ID, sampleCustomerName);

  if (newSheetUrl) {
    console.log(`✅ Success! The new sheet was created at: ${newSheetUrl}`);
  } else {
    console.error("❌ Failure. The sheet could not be copied. Check the logs for details.");
  }
}

/**
 * Gets the font family name from the first text found in a Google Document.
 *
 * @param {string} docId The ID of the Google Document.
 * @return {string | null} The font family name as a string, or null/error message.
 */
function getFontNameFromGoogleDoc(docId = "1HHsDJURtc3CssiTvBHKZHLieJVpkpPJZ0b-MBjmErs0") {
  try {
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();

    if (paragraphs.length > 0) {
      for (const paragraph of paragraphs) {
        if (paragraph.getText().trim() !== "") {
          const attributes = paragraph.getAttributes();
          const fontFamily = attributes[DocumentApp.Attribute.FONT_FAMILY];
          if (fontFamily) {
            return String(fontFamily);
          }
        }
      }
      return "No text with font information found.";
    } else {
      return "Document is empty.";
    }
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

/**
 * Test function to demonstrate getFontNameFromGoogleDoc.
 */
function testGetFontName() {
  const documentId = "YOUR_DOCUMENT_ID_HERE";
  const fontName = getFontNameFromGoogleDoc(documentId);
  Logger.log(`Detected font name from Doc ID '${documentId}': ${fontName}`);
}

/**
 * Summarizes a list of activities using a generative AI model.
 * 
 * @param {Array<object>} activities An array of activity objects.
 * @returns {string} The generated summary.
 */
function getActivitySummary(activities) {
  return generate("Summarize these activity logs for a Google Workspace opportunity. Focus on the key actions and outcomes, using plain language and newlines for clarity. Avoid intro text and special characters: " + JSON.stringify(activities));
}

/**
 * Generates a combined summary of next steps from business and technical perspectives.
 * 
 * @param {string} nextStepsInput The business-side next steps.
 * @param {string} nextStepsCeInput The technical-side next steps.
 * @returns {string} The combined summary of next steps.
 */
function getNextSteps(nextStepsInput, nextStepsCeInput) {
  return generate(`Combine the following business and technical next steps into a single, unified overview. Use plain language and newlines for clarity, and avoid intro text and special characters. Business steps: ${nextStepsInput}. Technical steps: ${nextStepsCeInput}.`);
}

/**
 * Generates a structured JSON object containing various fields related to a sales opportunity.
 * 
 * @param {string} description A description of the opportunity.
 * @param {string} opportunity_name The name of the opportunity.
 * @param {string} account The account associated with the opportunity.
 * @param {string} need The customer's business need.
 * @param {string} qualification The qualification notes for the opportunity.
 * @param {string} blockers Any blockers to the opportunity.
 * @param {Array<object>} activities A list of activities related to the opportunity.
 * @param {string} nextStepsInput The business-side next steps.
 * @param {string} nextStepsCeInput The technical-side next steps.
 * @returns {object} A JSON object containing the generated fields.
 */
function generateFields(description, opportunity_name, account, need, qualification, blockers, activities, nextStepsInput, nextStepsCeInput) {
  const opportunityDetails = { description, name: opportunity_name, account, need, qualification, blockers, blockerscompellingeventstatus: nextStepsInput };
  const responseString = getCustomJSON(opportunityDetails, activities, nextStepsInput, nextStepsCeInput);

  try {
    const cleanedString = cleanJSONString(responseString);
    const resultObject = JSON.parse(cleanedString);
    const expandedResultString = cleanJSONString(generate("Return a JSON object with the same structure, but expand on the text in each field to make it more professional for an executive summary. Do not use any special characters, only plaintext and newlines: " + cleanedString, "gemini-2.0-flash"));
    return JSON.parse(expandedResultString);
  } catch (e) {
    Logger.log(`ERROR parsing Gemini JSON response: ${e}. Problematic String: ${responseString}`);
    return { error: "Failed to process AI response.", rawResponse: responseString };
  }
}

/**
 * Example usage of the generateFields function.
 */
function testSummariseOpportunity() {
  generateFields("Sample description", "Sample Opportunity", "Sample Account", "Sample Need", "Sample Qualification", "Sample Blockers", [], "Follow up with customer.", "Prepare technical documentation.");
}

/**
 * Generates a structured JSON response from a generative AI model based on a set of predefined fields.
 * 
 * @param {object} opportunityDetails Details of the opportunity.
 * @param {Array<object>} activities A list of activities.
 * @param {string} nextStepsInput Business-side next steps.
 * @param {string} nextStepsCeInput Technical-side next steps.
 * @param {object} fields An object defining the fields to be extracted.
 * @returns {string} The JSON response from the AI model.
 */
function generateStructuredResponse(opportunityDetails, activities, nextStepsInput, nextStepsCeInput, fields) {
  const promptParts = Object.entries(fields).map(([fieldName, fieldPrompt]) => {
    let formattedPrompt;
    if (fieldName === "activitySummary") {
      formattedPrompt = `${fieldPrompt} ${JSON.stringify(activities)}`;
    } else if (fieldName === "nextStepsSummary") {
      formattedPrompt = `${fieldPrompt} ${nextStepsInput} and the technical side: ${nextStepsCeInput}.`;
    } else {
      formattedPrompt = `${fieldPrompt} ${JSON.stringify(opportunityDetails)}`;
    }
    return `"${fieldName}": "${formattedPrompt}"`;
  });

  const combinedPrompt = `Please provide the following outputs in JSON format, without any special characters, just plain text:\n\n{\n  ${promptParts.join(",\n  ")}\n}`;

  return gemini(combinedPrompt, "gemini-2.0-flash");
}

/**
 * Creates or updates a Google Doc with opportunity data in a specific folder.
 *
 * @param {object} opportunityData The data for the opportunity.
 * @param {string} opportunityId The ID of the opportunity.
 * @return {string|null} The URL of the document, or null on failure.
 */
function createOrUpdateOpportunityDocument(opportunityData, opportunityId) {
  const TARGET_FOLDER_ID = "1rk6J3h0ywyFYo2NxPZadUpWUX9df_QT3?resourcekey=0--SoCggUlEdE_5qG5gHZKGg";
  const docName = String(opportunityId);

  try {
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    if (!folder) throw new Error(`Target folder not found: ${TARGET_FOLDER_ID}`);

    const existingFiles = folder.getFilesByName(docName);
    const doc = existingFiles.hasNext() ? DocumentApp.openById(existingFiles.next().getId()) : DocumentApp.create(docName);
    const body = doc.getBody();
    body.clear();

    // Move new doc to the correct folder.
    if (!existingFiles.hasNext()) {
        const newDocFile = DriveApp.getFileById(doc.getId());
        folder.addFile(newDocFile);
        DriveApp.getRootFolder().removeFile(newDocFile);
    }

    // --- Style Definitions ---
    const FONT_FAMILY_UNIVERSAL = 'Google Sans';
    const THEME_COLOR_BLUE = '#1A73E8';
    const TEXT_COLOR_BODY = '#3C4043';
    const TEXT_COLOR_MAIN_TITLE = '#202124';

    const styles = {
        docMainTitle: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 18, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_MAIN_TITLE, [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER, [DocumentApp.Attribute.SPACING_AFTER]: 8 },
        descriptionSubtitle: { [DocumentApp.Attribute.FONT_SIZE]: 10, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY, [DocumentApp.Attribute.ITALIC]: true, [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER, [DocumentApp.Attribute.SPACING_AFTER]: 20 },
        accountSummaryHeader: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 13, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE, [DocumentApp.Attribute.SPACING_AFTER]: 4 },
        accountSummaryParagraph: { [DocumentApp.Attribute.FONT_SIZE]: 10, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY, [DocumentApp.Attribute.SPACING_AFTER]: 16, [DocumentApp.Attribute.LINE_SPACING]: 1.4, [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT },
        executiveSummaryHeader: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 16, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE, [DocumentApp.Attribute.SPACING_AFTER]: 8 },
        sectionHeader: { [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.FONT_SIZE]: 14, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE, [DocumentApp.Attribute.SPACING_BEFORE]: 12, [DocumentApp.Attribute.SPACING_AFTER]: 6 },
        paragraph: { [DocumentApp.Attribute.FONT_SIZE]: 11, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY, [DocumentApp.Attribute.SPACING_AFTER]: 10, [DocumentApp.Attribute.LINE_SPACING]: 1.5, [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT },
        bulletItem: { [DocumentApp.Attribute.FONT_SIZE]: 11, [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL, [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY, [DocumentApp.Attribute.SPACING_AFTER]: 5, [DocumentApp.Attribute.LINE_SPACING]: 1.5 }
    };

    // --- Helper Functions ---
    const applyStyle = (p, s, t) => p.setAttributes(styles[s]);
    const appendStyledParagraph = (t, s) => applyStyle(body.appendParagraph(String(t || "Content not available.")), s, t);

    // --- Document Population ---
    appendStyledParagraph(docName, 'docMainTitle');
    if (opportunityData.description) appendStyledParagraph(String(opportunityData.description), 'descriptionSubtitle');
    if (opportunityData.account_summary) {
        appendStyledParagraph("Account Summary", 'accountSummaryHeader');
        appendStyledParagraph(String(opportunityData.account_summary), 'accountSummaryParagraph');
    }

    const appendSection = (headerText, contentKey, isBulletedList = false, isExecutiveSummary = false) => {
        const rawContent = opportunityData[contentKey];
        appendStyledParagraph(headerText, isExecutiveSummary ? 'executiveSummaryHeader' : 'sectionHeader');

        if (rawContent && String(rawContent).trim() !== "") {
            if (isBulletedList) {
                String(rawContent).split('\n').forEach(itemText => {
                    const trimmedItem = itemText.trim();
                    if (trimmedItem) {
                        const cleanItem = trimmedItem.replace(/^-+\s*/, '');
                        const listItem = body.appendListItem(cleanItem);
                        listItem.setGlyphType(DocumentApp.GlyphType.BULLET);
                        applyStyle(listItem, 'bulletItem', cleanItem);
                        listItem.setIndentStart(36);
                        listItem.setIndentFirstLine(36);
                    }
                });
            } else {
                appendStyledParagraph(String(rawContent), 'paragraph');
            }
        } else {
            appendStyledParagraph("Not available.", 'paragraph');
        }
    };

    appendSection("Opportunity Overview", "overview");
    appendSection("Customer Need", "need");
    appendSection("Proposed Benefits", "benefits", true);
    appendSection("Timeline", "timeline");
    appendSection("Blockers and Status", "blockers");
    appendSection("Activity Summary", "activitySummary", true);
    appendSection("Next Steps", "nextStepsSummary");

    doc.saveAndClose();
    return doc.getUrl();

  } catch (error) {
    Logger.log(`CRITICAL ERROR in createOrUpdateOpportunityDocument: ${error.message}`);
    return null;
  }
}

/**
 * Calls a generative AI to create a JSON object with details about a sales opportunity.
 * 
 * @param {object} opportunityDetails Details of the opportunity.
 * @param {Array<object>} activities A list of activities.
 * @param {string} nextStepsInput Business-side next steps.
 * @param {string} nextStepsCeInput Technical-side next steps.
 * @returns {string} The JSON response from the AI model.
 */
function getCustomJSON(opportunityDetails = "", activities = "", nextStepsInput = "", nextStepsCeInput = "") {
  const desiredFields = {
    overview: "Generate a short overview of this Google Workspace business opportunity, max 260 characters. Use plain language, newlines for readability, and no special characters:",
    need: "Summarize the business need for this opportunity. Use plain language and newlines for readability, and no special characters:",
    benefits: "What are the key benefits of Google Workspace for this customer?",
    timeline: "Generate a timeline for when the customer plans to make a decision or implement the project.",
    blockers: "Summarize any blockers for this opportunity and their current status.",
    activitySummary: "Summarize the following activity logs for this opportunity. Present it as a chronological overview. Use plain language and newlines for readability, and no special characters:",
    nextStepsSummary: "Combine the business and technical next steps into a single overview. Use plain language and newlines for readability, and no special characters:",
    aiInsights: "Based on all the information, provide three suggestions to progress the opportunity, remove blockers, or win the deal. Use plain language and no special characters."
  };

  return generateStructuredResponse(opportunityDetails, activities, nextStepsInput, nextStepsCeInput, desiredFields);
}

/**
 * Cleans a JSON string by removing markdown and fixing common formatting issues.
 * 
 * @param {string} jsonString The JSON string to clean.
 * @returns {string} The cleaned JSON string.
 */
function cleanJSONString2(jsonString) {
  let cleanedString = jsonString.replace(/^```json\s*/, '').slice(0, -4).trim();
  cleanedString = cleanedString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  cleanedString = cleanedString.replace(/[\u200B-\u200F\uFEFF]/g, '');
  cleanedString = cleanedString.replace(/\s+/g, ' ');
  cleanedString = cleanedString.replace(/(\w+):/g, '"$1":');
  cleanedString = cleanedString.replace(/'([^']+)'/g, '"$1"');
  cleanedString = cleanedString.replace(/,\s*}/g, '}');
  cleanedString = cleanedString.replace(/,\s*\]/g, ']');
  if (!cleanedString.startsWith('{')) {
    cleanedString = '{' + cleanedString + '}';
  }
  return cleanedString;
}

/**
 * A simpler function to clean a JSON string by removing markdown.
 * 
 * @param {string} jsonString The JSON string to clean.
 * @returns {string} The cleaned JSON string.
 */
function cleanJSONString(jsonString) {
 return jsonString.replace(/^```json\s*/, '').slice(0, -4);
}
