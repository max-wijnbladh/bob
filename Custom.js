/**
 * Gets the font family name from the first text found in a Google Document.
 *
 * @param {string} docId The ID of the Google Document.
 * @return {string | null} The font family name as a string, or null/error message.
 */


/**
 * Makes a copy of a Google Sheet file, names it according to the customer,
 * and returns the URL of the new spreadsheet.
 *
 * @param {string} sourceSpreadsheetId The ID of the Google Sheet file to copy.
 * @param {string} customerName The name of the customer, used to create the new file name.
 * @returns {string|null} The URL of the new spreadsheet, or null on failure.
 */
function copySpreadsheetAndGetUrl(sourceSpreadsheetId = "1lw_pwSzhbmAibI3_2AF3GPejRsAi5dgfwS5e6BGKoNQ", customerName) {
  Logger.log(`Attempting to copy spreadsheet with ID: ${sourceSpreadsheetId} for customer: ${customerName}`);

  if (!sourceSpreadsheetId) {
    Logger.log("ERROR: sourceSpreadsheetId is required.");
    return null;
  }
  if (!customerName) {
    Logger.log("ERROR: customerName is required to name the new file.");
    return null;
  }

  try {
    // 1. Get the source file (your template) from Google Drive.
    const sourceFile = DriveApp.getFileById(sourceSpreadsheetId);

    // 2. Create the new file name using the customer name.
    const newFileName = `${customerName} Google Workspace MEP`;
    
    // 3. Make a copy of the file with the new, specific name.
    const newSpreadsheetCopy = sourceFile.makeCopy(newFileName);
    
    // 4. Get the URL of the newly created file.
    const newUrl = newSpreadsheetCopy.getUrl();
    
    Logger.log(`Successfully created a copy named "${newFileName}".`);
    Logger.log(`New spreadsheet URL: ${newUrl}`);
    
    // 5. Return the URL.
    return newUrl;

  } catch (e) {
    Logger.log(`ERROR in copySpreadsheetAndGetUrl: ${e.message}`);
    Logger.log(`Failed to copy file with ID: ${sourceSpreadsheetId}. Please ensure the ID is correct and you have permission to access it.`);
    return null;
  }
}

/**
 * An example test function to show how to use the updated function.
 */
function testCopySheetWithCustomerName() {
  // <<< !!! REPLACE WITH THE ID OF YOUR TEMPLATE SHEET !!! >>>
  const TEMPLATE_SHEET_ID = "YOUR_TEMPLATE_SPREADSHEET_ID_HERE"; 
  
  // Define the customer name for this run.
  const sampleCustomerName = "Acme Corporation";

  // Call the main function with the template ID and the customer name.
  const newSheetUrl = copySpreadsheetAndGetUrl(TEMPLATE_SHEET_ID, sampleCustomerName);

  if (newSheetUrl) {
    console.log(`✅ Success! The new sheet was created at: ${newSheetUrl}`);
    // The new file in your Drive will be named "Acme Corporation Google Workspace MEP"
  } else {
    console.error("❌ Failure. The sheet could not be copied. Check the logs for details.");
  }
}

function getFontNameFromGoogleDoc(documentId) {


  try {
    const doc = DocumentApp.openById(documentId || "1HHsDJURtc3CssiTvBHKZHLieJVpkpPJZ0b-MBjmErs0");
    const body = doc.getBody();
    const paragraphs = body.getParagraphs();

    if (paragraphs.length > 0) {
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const paragraphText = paragraph.getText();

        if (paragraphText.trim() !== "") {
          // Get attributes of the paragraph. This might reflect the dominant style
          // or the style of the first run of text.
          const attributes = paragraph.getAttributes();
          const fontFamily = attributes[DocumentApp.Attribute.FONT_FAMILY];

          if (fontFamily) {
            Logger.log(`Font family of the first text in paragraph ${i + 1} (starts with: "${paragraphText.substring(0, 30)}...") is: '${fontFamily}' (Type: ${typeof fontFamily})`);
            return String(fontFamily); // Ensure it's a string
          }
        }
      }
      Logger.log("No text with font information found in the document.");
      return "No text with font information found.";
    } else {
      Logger.log("The document body is empty or has no paragraphs.");
      return "Document is empty.";
    }
  } catch (e) {
    Logger.log(`Error accessing document or reading font: ${e.message}. Stack: ${e.stack}`);
    return `Error: ${e.message}`;
  }
}

/**
 * Test function to demonstrate getFontNameFromGoogleDoc.
 */
function testGetFontName() {
  // ❗ Replace "YOUR_DOCUMENT_ID_HERE" with the actual ID of your Google Doc.
  // You can get the ID from the document's URL:
  // For example, if URL is https://docs.google.com/document/d/1abcDeFgHiJkLmNoPqRsTuVwXyZ_12345AbCdEfGhIjK/edit
  // The ID is "1abcDeFgHiJkLmNoPqRsTuVwXyZ_12345AbCdEfGhIjK"
  const documentId = "YOUR_DOCUMENT_ID_HERE"; 
  
  const fontName = getFontNameFromGoogleDoc(documentId);
  Logger.log(`---------------------------------------------------`);
  Logger.log(`Detected font name from Doc ID '${documentId}': ${fontName}`);

  if (fontName && !fontName.toLowerCase().startsWith("error") && !fontName.toLowerCase().startsWith("no")) {
    Logger.log(`You can try using this exact string in your style definitions:`);
    Logger.log(`[DocumentApp.Attribute.FONT_FAMILY]: "${fontName}"`);
    Logger.log(`Example style object snippet:`);
    Logger.log(`const FONT_FAMILY_FROM_DOC = "${fontName}";`);
    Logger.log(`const myStyle = { [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_FROM_DOC, ... };`);
  }
  Logger.log(`---------------------------------------------------`);
  Logger.log(`For comparison, the enum DocumentApp.FontFamily.GOOGLE_SANS typically resolves to Google's standard sans-serif font.`);
  Logger.log(`If you are trying to use "Google Sans", using DocumentApp.FontFamily.GOOGLE_SANS is often the most robust method, as the underlying font it points to can be updated by Google.`);
}

function getActivitySummary(activities) {
  const summary = generate("These logs shows activities related to an ongoing Google Workspace business opportunity, summarise the activities without any intro text, using plain text formatted natural language, newlines where appropiate, and no asterixs: " + JSON.stringify(activities));
  return summary;
}

function getNextSteps(nextStepsInput, nextStepsCeInput) {
  const nextSteps = generate("I will provide you with the next steps for a Google Workspace opportunity from the business side: " + nextStepsInput + " and the technical side: " + nextStepsCeInput + ". Summarise these next steps as one joint next step overview without any intro text, using plain text formatted natural language, newlines where appropiate, and no asterixs:");
  return nextSteps;
}


function generateFields(description, opportunity_name, account, need, qualification, blockers, activities, nextStepsInput, nextStepsCeInput) {

  Logger.log(opportunity_name);
  Logger.log(need);
  Logger.log(description);

  const opportunityDetails = {
    description: description,
    name: opportunity_name,
    account: account,
    need: need,
    qualification: qualification,
    blockers: blockers,
    blockerscompellingeventstatus: nextStepsInput
  };

  // Call the AI function to get the JSON string
  const responseString = getCustomJSON(opportunityDetails, activities, nextStepsInput, nextStepsCeInput);
  Logger.log("Raw Gemini Response String:");
  Logger.log(responseString);

  let resultObject = {}; // Use a more descriptive name

  try {
      // 1. Clean the string to remove markdown markers
      const cleanedString = cleanJSONString(responseString);
      Logger.log("Cleaned Gemini Response String:");
      Logger.log(cleanedString);

      // 2. THIS IS THE FIX: Parse the string into a real JavaScript object
      resultObject = JSON.parse(cleanedString);
      
      // OPTIONAL: You can now proceed with your document creation logic if needed
      // For now, let's comment it out to ensure the main fix works first.
      const expandedResultString = cleanJSONString(generate("return a json object with the same structure, but expand on the strings/text in the fields and make the language more professional. Its supposed to go in a executive summary. For the returned fields, do not use any asterixes, bullet points signs, or any other special characters. only plaintext are regular newlines" + cleanedString, "gemini-2.0-flash")) 
      const expandedResultObject = JSON.parse(expandedResultString);
      //const documentUrl = createOrUpdateOpportunityDocument(expandedResultObject, opportunity_name);

      //if (documentUrl) {
      //    resultObject.googleDocLink = documentUrl; // Add the doc link to the object
      //} else {
      //    resultObject.googleDocLink = "Error creating/updating document.";
      //}
      

  } catch (e) {
      Logger.log(`ERROR parsing Gemini JSON response: ${e}`);
      Logger.log(`Problematic String was: ${responseString}`);
      
      // Return an error object so you can see the failure in your platform
      resultObject = {
          error: "Failed to process AI response.",
          rawResponse: responseString
      };
  }

  // 3. Return the final JavaScript object
  // The platform can now correctly access properties like resultObject.overview
  return resultObject;
}

// Example usage:
function testSummariseOpportunity() {
  const opportunityId = "0064M00000csvBHQAY";
  const description = "This is a sample description.";
  const name = "Sample Opportunity";
  const account = "Sample Account";
  const need = "Sample Need";
  const qualification = "Sample Qualification";
  const blockers = "Sample Blockers";
  const activities = [
    { opportunity_id: "0064M00000csvBHQAY", subject: "Meeting 1", comments: "Discussed requirements.", completed_date: "2023-10-26" },
    { opportunity_id: "0064M00000csvBHQAY", subject: "Meeting 2", comments: "Reviewed proposal.", completed_date: "2023-11-02" },
    { opportunity_id: "0064M00000csvBHQAY", subject: "Call 1", comments: "Followed up on feedback", completed_date: "2023-11-09"}
  ];
  const nextStepsInput = "Follow up with customer.";
  const nextStepsCeInput = "Prepare technical documentation.";

  const result = generateFields(description, name, account, need, qualification, blockers, activities, nextStepsInput, nextStepsCeInput);
}

function generateStructuredResponse(opportunityDetails, activities, nextStepsInput, nextStepsCeInput, fields) {
  /**
   * Generates a structured response from Gemini based on specified fields.
   *
   * @param {object} opportunityDetails - Details of the Google Workspace opportunity.
   * @param {array} activities - Activities related to the opportunity.
   * @param {string} nextStepsInput - Business side next steps.
   * @param {string} nextStepsCeInput - Technical side next steps.
   * @param {object} fields - An object defining the fields to extract and their prompts.
   * @returns {string} - The JSON response from Gemini.
   */

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

  const combinedPrompt = `Please provide the following outputs in JSON format, and formate the text in the returned fields without any asterix or bullet points signs, just use plain text:\n\n{\n  ${promptParts.join(",\n  ")}\n}`;

  // Call the gemini function with the combined prompt
  const response = gemini(combinedPrompt, "gemini-2.0-flash");
  return response;
}

/**
 * Creates or updates a Google Doc with opportunity data and ensures it resides in a specific folder.
 *
 * @param {object} opportunityData The data object for the opportunity.
 * @param {string} opportunityId The unique ID of the opportunity, used for the document name.
 * @return {string|null} The URL of the created/updated document, or null on failure.
 */
function createOrUpdateOpportunityDocument(opportunityData, opportunityId) {
  const SCRIPT_VERSION = "V4_Folder_Specific";
  
  // --- CONFIGURATION ---
  // <-- CHANGE 1: Specify your target folder's ID here.
  // You can get the ID from the folder's URL in Google Drive.
  // e.g., if URL is "https://drive.google.com/drive/folders/1a2b3c4d5e6f_GHIJK", the ID is "1a2b3c4d5e6f_GHIJK"
  const TARGET_FOLDER_ID = "1rk6J3h0ywyFYo2NxPZadUpWUX9df_QT3?resourcekey=0--SoCggUlEdE_5qG5gHZKGg"; 
  
  Logger.log(`[${SCRIPT_VERSION}] --- Starting createOrUpdateOpportunityDocument ---`);
  Logger.log(`[${SCRIPT_VERSION}] Target Folder ID: '${TARGET_FOLDER_ID}'`);
  Logger.log(`[${SCRIPT_VERSION}] Received Opportunity ID for doc name: '${opportunityId}'`);

  if (!opportunityData || Object.keys(opportunityData).length === 0) {
    Logger.log(`[${SCRIPT_VERSION}] ERROR: opportunityData is null, undefined, or empty. Aborting.`);
    return null;
  }
  Logger.log(`[${SCRIPT_VERSION}] opportunityData received (keys): ${Object.keys(opportunityData).join(', ')}`);

  const docName = `${String(opportunityId)}`;
  Logger.log(`[${SCRIPT_VERSION}] Document name will be: '${docName}'`);

  let doc;
  let body;

  try {
    // <-- CHANGE 2: Get the folder object and validate it exists.
    const folder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    if (!folder) {
      Logger.log(`[${SCRIPT_VERSION}] CRITICAL ERROR: Target folder with ID '${TARGET_FOLDER_ID}' not found or you don't have access. Aborting.`);
      throw new Error(`Target folder not found: ${TARGET_FOLDER_ID}`);
    }
    Logger.log(`[${SCRIPT_VERSION}] Successfully accessed target folder: '${folder.getName()}'`);

    Logger.log(`[${SCRIPT_VERSION}] Checking for existing document named '${docName}' inside folder '${folder.getName()}'`);
    // <-- CHANGE 3: Search for the file *within the specific folder*.
    const existingFiles = folder.getFilesByName(docName);

    if (existingFiles.hasNext()) {
      const existingDocFile = existingFiles.next();
      doc = DocumentApp.openById(existingDocFile.getId());
      Logger.log(`[${SCRIPT_VERSION}] Opened existing document. ID: ${doc.getId()}, URL: ${doc.getUrl()}`);
      body = doc.getBody();
      Logger.log(`[${SCRIPT_VERSION}] Clearing body of existing document.`);
      body.clear();
      Logger.log(`[${SCRIPT_VERSION}] Body cleared.`);
    } else {
      Logger.log(`[${SCRIPT_VERSION}] No existing document found in folder. Creating new document: '${docName}'`);
      // <-- CHANGE 4: Create the new document and immediately move it to the target folder.
      // DocumentApp.create() always creates the doc in the root folder first.
      doc = DocumentApp.create(docName);
      const newDocFile = DriveApp.getFileById(doc.getId());
      
      // Add the file to the target folder and remove it from the root.
      folder.addFile(newDocFile);
      DriveApp.getRootFolder().removeFile(newDocFile);
      
      Logger.log(`[${SCRIPT_VERSION}] New document created and moved to target folder. ID: ${doc.getId()}`);
      body = doc.getBody();
    }

    // --- Style Definitions with Arial Font ---
    // (The rest of your styling and content-appending logic remains unchanged)
    const FONT_FAMILY_UNIVERSAL = 'Google Sans'; 

    const THEME_COLOR_BLUE = '#1A73E8';    
    const TEXT_COLOR_BODY = '#3C4043';     
    const TEXT_COLOR_MAIN_TITLE = '#202124'; 

    const styles = {
      docMainTitle: {
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 18,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_MAIN_TITLE,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER,
        [DocumentApp.Attribute.SPACING_BEFORE]: 0,
        [DocumentApp.Attribute.SPACING_AFTER]: 8,
      },
      descriptionSubtitle: {
        [DocumentApp.Attribute.FONT_SIZE]: 10,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.ITALIC]: true,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER,
        [DocumentApp.Attribute.SPACING_AFTER]: 20,
      },
      accountSummaryHeader: {
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 13,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE,
        [DocumentApp.Attribute.SPACING_BEFORE]: 0,
        [DocumentApp.Attribute.SPACING_AFTER]: 4,
      },
      accountSummaryParagraph: {
        [DocumentApp.Attribute.FONT_SIZE]: 10,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.SPACING_AFTER]: 16,
        [DocumentApp.Attribute.LINE_SPACING]: 1.4,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT,
      },
      executiveSummaryHeader: {
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 16,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE,
        [DocumentApp.Attribute.SPACING_BEFORE]: 6,
        [DocumentApp.Attribute.SPACING_AFTER]: 8,
      },
      sectionHeader: {
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 14,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE,
        [DocumentApp.Attribute.SPACING_BEFORE]: 12,
        [DocumentApp.Attribute.SPACING_AFTER]: 6,
      },
      paragraph: {
        [DocumentApp.Attribute.FONT_SIZE]: 11,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.SPACING_AFTER]: 10,
        [DocumentApp.Attribute.LINE_SPACING]: 1.5,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT,
      },
      bulletItem: {
        [DocumentApp.Attribute.FONT_SIZE]: 11,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.SPACING_AFTER]: 5,
        [DocumentApp.Attribute.LINE_SPACING]: 1.5,
      }
    };
    const BULLET_INDENT_START = 36;
    const BULLET_INDENT_FIRST_LINE = 36;

    Logger.log(`[${SCRIPT_VERSION}] Styles defined.`);
    
    // --- Helper functions (unchanged) ---
    function applyStyle(paragraph, styleName, textContent = "N/A") {
      const styleObject = styles[styleName];
      if (!paragraph) {
        Logger.log(`[${SCRIPT_VERSION}] ERROR: Attempted to apply style '${styleName}' to a null paragraph object. Text was: ${textContent}`);
        return;
      }
      if (!styleObject) {
        Logger.log(`[${SCRIPT_VERSION}] ERROR: Style object '${styleName}' is undefined.`);
        return;
      }
      try {
        paragraph.setAttributes(styleObject);
      } catch (e) {
        Logger.log(`[${SCRIPT_VERSION}] CRITICAL ERROR applying style '${styleName}'. Error: ${e.message}.`);
        throw new Error(`Failed to apply style '${styleName}': ${e.message}`);
      }
    }
    
    function appendStyledParagraph(text, styleName) {
      const content = String(text || "Content not available.");
      const para = body.appendParagraph(content);
      applyStyle(para, styleName, content);
      return para;
    }
    
    // --- Document Population (unchanged) ---
    Logger.log(`[${SCRIPT_VERSION}] Appending document title.`);
    appendStyledParagraph(docName, 'docMainTitle');

    const descriptionContent = opportunityData.description;
    if (descriptionContent && String(descriptionContent).trim() !== "") {
      Logger.log(`[${SCRIPT_VERSION}] Appending description subtitle.`);
      appendStyledParagraph(String(descriptionContent), 'descriptionSubtitle');
    }

    const accountSummaryContent = opportunityData.account_summary;
    if (accountSummaryContent && String(accountSummaryContent).trim() !== "") {
      Logger.log(`[${SCRIPT_VERSION}] Appending Account Summary section.`);
      appendStyledParagraph("Account Summary", 'accountSummaryHeader');
      appendStyledParagraph(String(accountSummaryContent), 'accountSummaryParagraph');
    }

    function appendSection(headerText, contentKey, isBulletedList = false, isExecutiveSummary = false) {
      const rawContent = opportunityData[contentKey];
      Logger.log(`[${SCRIPT_VERSION}] --- Section: ${headerText} ---`);
      const headerStyleName = isExecutiveSummary ? 'executiveSummaryHeader' : 'sectionHeader';
      appendStyledParagraph(headerText, headerStyleName);

      if (rawContent !== null && rawContent !== undefined && String(rawContent).trim() !== "") {
        const contentStr = String(rawContent);
        if (isBulletedList) {
          const items = contentStr.split('\n');
          items.forEach(itemText => {
            const trimmedItem = itemText.trim();
            if (trimmedItem) {
              const cleanItem = trimmedItem.replace(/^-+\s*/, '');
              const listItem = body.appendListItem(cleanItem);
              listItem.setGlyphType(DocumentApp.GlyphType.BULLET);
              applyStyle(listItem, 'bulletItem', cleanItem);
              try {
                listItem.setIndentStart(BULLET_INDENT_START);
                listItem.setIndentFirstLine(BULLET_INDENT_FIRST_LINE);
              } catch(indentError) {
                 Logger.log(`[${SCRIPT_VERSION}] WARN: Could not set indent on list item '${cleanItem}'. Error: ${indentError.message}`);
              }
            }
          });
        } else {
          appendStyledParagraph(contentStr, 'paragraph');
        }
      } else {
        Logger.log(`[${SCRIPT_VERSION}] Content for section '${headerText}' is not available. Appending placeholder.`);
        appendStyledParagraph("Not available.", 'paragraph');
      }
    }
    
    appendSection("Opportunity Overview", "overview");
    appendSection("Customer Need", "need");
    appendSection("Proposed Benefits", "benefits", true); 
    appendSection("Timeline", "timeline");
    appendSection("Blockers and Status", "blockers");
    appendSection("Activity Summary", "activitySummary", true);
    appendSection("Next Steps", "nextStepsSummary");

    Logger.log(`[${SCRIPT_VERSION}] Finished appending all sections.`);

    // --- Save and Finalize (unchanged) ---
    Logger.log(`[${SCRIPT_VERSION}] Attempting to save and close document.`);
    doc.saveAndClose();
    const docUrl = doc.getUrl();
    Logger.log(`[${SCRIPT_VERSION}] Document processed and saved successfully! URL: ${docUrl}`);
    return docUrl;

  } catch (error) {
    Logger.log(`[${SCRIPT_VERSION}] !!!!! CRITICAL ERROR in createOrUpdateOpportunityDocument !!!!!`);
    Logger.log(`[${SCRIPT_VERSION}] Error Message: ${error.message}`);
    Logger.log(`[${SCRIPT_VERSION}] Error Name: ${error.name}`);
    if (error.stack) {
      Logger.log(`[${SCRIPT_VERSION}] Stack Trace: ${error.stack}`);
    }
    if (doc) {
      try {
        doc.saveAndClose();
      } catch (closeError) {
        Logger.log(`[${SCRIPT_VERSION}] Error trying to save/close document after main error: ${closeError.message}`);
      }
    }
    return null;
  } finally {
    Logger.log(`[${SCRIPT_VERSION}] --- Exiting createOrUpdateOpportunityDocument ---`);
  }
}

// Example usage:
function getCustomJSON(opportunityDetails = "", activities = "", nextStepsInput = "", nextStepsCeInput = "") {

  const desiredFields = {
    overview: "Generate an short overview, on this Google Workspace business opportunity, without any intro text, using plain text formatted natural language, newlines where appropriate, and no asterisks, and at most 260 characters:",
    need: "Generate an summary of the business need, on this Google Workspace business opportunity, without any intro text, using plain text formatted natural language, newlines where appropriate for readability, and no asterisks:",
    benefits: "What are the key benefits of Google Workspace for this customer to solve the need:",
    timeline: "Generate a timeline for when the customer is planning to take a decision / implement the project / other key dates",
    blockers: "Generate a short summary of any blockers that might exist with this opportunity and the current status and plan for it",
    activitySummary: "These logs show activities related to an ongoing Google Workspace business opportunity. If there are no activities, just state that in the output. Otherwise, summarise the activities without any intro text, newlines where appropriate for readability, using plain text formatted natural language, newlines where appropriate, and no asterisks. It should be presented as a general timeline of what has been done in the project chronologically, newlines where appropriate for readability, without necessarily giving the date for every single activity but rather an overview",
    nextStepsSummary: "I will provide you with the next steps for a Google Workspace opportunity from the business side: and the technical side: . Summarise these next steps as one joint next step overview without any intro text, using plain text formatted natural language, newlines for readability, and no asterisks:",
    aiInsights: "Use the collective information you have about the opportunity as provided, and provide three suggestions on how to progress the opportunity, remove blockers or what to focus on to win the deal. Use plaintext formatting and no asterix or bullet point signs."
  };

  const response = generateStructuredResponse(
    opportunityDetails,
    activities,
    nextStepsInput,
    nextStepsCeInput,
    desiredFields
  );

  return response;
}

function cleanJSONString(jsonString) {
  if (typeof jsonString !== 'string') return "{}";
  const cleanedString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
  return cleanedString.trim();
}
