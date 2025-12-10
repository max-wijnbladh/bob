/**
 * Gets the font family name from the first text found in a Google Document.
 *
 * @param {string} docId The ID of the Google Document.
 * @return {string | null} The font family name as a string, or null/error message.
 */
function getFontNameFromGoogleDoc() {


  try {
    const doc = DocumentApp.openById("1HHsDJURtc3CssiTvBHKZHLieJVpkpPJZ0b-MBjmErs0");
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
      const documentUrl = createOrUpdateOpportunityDocument(expandedResultObject, opportunity_name);

      if (documentUrl) {
          resultObject.googleDocLink = documentUrl; // Add the doc link to the object
      } else {
          resultObject.googleDocLink = "Error creating/updating document.";
      }
      

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
 * Creates or updates a Google Doc with revised formatting, new sections, and extensive logging.
 * V3: Removes horizontal lines, changes headline styles, adds description subtitle and account summary, uses Arial font.
 *
 * @param {object} opportunityData - Structured data including 'description' and 'account_summary'.
 * @param {string} opportunityId - The ID used for the document name.
 * @returns {string | null} - The URL of the doc, or null on error.
 */
function createOrUpdateOpportunityDocument(opportunityData, opportunityId) {
  const SCRIPT_VERSION = "V3_Refined";
  Logger.log(`[${SCRIPT_VERSION}] --- Starting createOrUpdateOpportunityDocument ---`);
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
    Logger.log(`[${SCRIPT_VERSION}] Checking for existing document: '${docName}'`);
    const existingFiles = DriveApp.getFilesByName(docName);
    if (existingFiles.hasNext()) {
      const existingDocFile = existingFiles.next();
      doc = DocumentApp.openById(existingDocFile.getId());
      Logger.log(`[${SCRIPT_VERSION}] Opened existing document. ID: ${doc.getId()}, URL: ${doc.getUrl()}`);
      body = doc.getBody();
      Logger.log(`[${SCRIPT_VERSION}] Clearing body of existing document.`);
      body.clear();
      Logger.log(`[${SCRIPT_VERSION}] Body cleared.`);
    } else {
      Logger.log(`[${SCRIPT_VERSION}] No existing document found. Creating new document: '${docName}'`);
      doc = DocumentApp.create(docName);
      Logger.log(`[${SCRIPT_VERSION}] New document created. ID: ${doc.getId()}, URL: ${doc.getUrl()}`);
      body = doc.getBody();
    }

    // --- Style Definitions with Arial Font ---
    // Note: DocumentApp.FontFamily does not have 'OPEN_SANS'. Using ARIAL.
    const FONT_FAMILY_UNIVERSAL = 'Google Sans'; // Using the string directly

    const THEME_COLOR_BLUE = '#1A73E8';    // Primary theme color for blue headlines
    const TEXT_COLOR_BODY = '#3C4043';     // Dark grey for body text
    const TEXT_COLOR_MAIN_TITLE = '#202124'; // Darker for the main document title

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
      descriptionSubtitle: { // For the 'description' field content
        [DocumentApp.Attribute.FONT_SIZE]: 10,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.ITALIC]: true,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.CENTER,
        [DocumentApp.Attribute.SPACING_AFTER]: 20, // Space after this overview block
      },
      accountSummaryHeader: { // For "Account Summary" headline
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 13, // Slightly smaller than main section headers
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE, // Bold and Blue
        [DocumentApp.Attribute.SPACING_BEFORE]: 0, // Added space before this section in main flow
        [DocumentApp.Attribute.SPACING_AFTER]: 4,
      },
      accountSummaryParagraph: { // For the content of account_summary
        [DocumentApp.Attribute.FONT_SIZE]: 10,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.SPACING_AFTER]: 16, // Space after account summary content
        [DocumentApp.Attribute.LINE_SPACING]: 1.4,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT,
      },
      executiveSummaryHeader: { // Bold and Blue
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 16,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE,
        [DocumentApp.Attribute.SPACING_BEFORE]: 6,
        [DocumentApp.Attribute.SPACING_AFTER]: 8,
      },
      sectionHeader: { // Bold and Blue
        [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.FONT_SIZE]: 14,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: THEME_COLOR_BLUE,
        [DocumentApp.Attribute.SPACING_BEFORE]: 12, // Added more space before general sections
        [DocumentApp.Attribute.SPACING_AFTER]: 6,
      },
      paragraph: {
        [DocumentApp.Attribute.FONT_SIZE]: 11,
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY_UNIVERSAL,
        [DocumentApp.Attribute.FOREGROUND_COLOR]: TEXT_COLOR_BODY,
        [DocumentApp.Attribute.SPACING_AFTER]: 10,
        [DocumentApp.Attribute.LINE_SPACING]: 1.5,
        [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.LEFT, // Changed from JUSTIFY for more natural web-doc feel
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

    Logger.log(`[${SCRIPT_VERSION}] Styles defined. Universal Font: Arial.`);

    // Helper to safely set attributes
    function applyStyle(paragraph, styleName, textContent = "N/A") {
      // (This helper function remains the same as in V2, ensuring it logs and handles errors)
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
        Logger.log(`[${SCRIPT_VERSION}] Applying style '${styleName}' to paragraph with text starting: '${String(textContent).substring(0, 50)}...'`);
        paragraph.setAttributes(styleObject);
        // Logger.log(`[${SCRIPT_VERSION}] Style '${styleName}' applied successfully.`); // Can be verbose
      } catch (e) {
        Logger.log(`[${SCRIPT_VERSION}] CRITICAL ERROR applying style '${styleName}'. Error: ${e.message}. Style Object: ${JSON.stringify(styleObject)}. Paragraph text: '${textContent}'. Stack: ${e.stack}`);
        throw new Error(`Failed to apply style '${styleName}': ${e.message}`);
      }
    }
    
    function appendStyledParagraph(text, styleName) {
        // (This helper function remains the same as in V2)
      const content = String(text || "Content not available.");
    //   Logger.log(`[${SCRIPT_VERSION}] Appending paragraph with style '${styleName}', text: '${content.substring(0,100)}...'`); // Can be verbose
      const para = body.appendParagraph(content);
      applyStyle(para, styleName, content);
      return para;
    }

    // --- Document Title ---
    Logger.log(`[${SCRIPT_VERSION}] Appending document title.`);
    appendStyledParagraph(docName, 'docMainTitle');

    // --- Description Subtitle ---
    const descriptionContent = opportunityData.description;
    if (descriptionContent && String(descriptionContent).trim() !== "") {
      Logger.log(`[${SCRIPT_VERSION}] Appending description subtitle.`);
      appendStyledParagraph(String(descriptionContent), 'descriptionSubtitle');
    } else {
      Logger.log(`[${SCRIPT_VERSION}] No description content provided for subtitle.`);
      // Optionally append a placeholder or nothing
      // appendStyledParagraph("Overview not available.", 'descriptionSubtitle');
    }
    
    // --- Account Summary Section ---
    const accountSummaryContent = opportunityData.account_summary;
    if (accountSummaryContent && String(accountSummaryContent).trim() !== "") {
      Logger.log(`[${SCRIPT_VERSION}] Appending Account Summary section.`);
      appendStyledParagraph("Account Summary", 'accountSummaryHeader');
      appendStyledParagraph(String(accountSummaryContent), 'accountSummaryParagraph');
    } else {
      Logger.log(`[${SCRIPT_VERSION}] No account_summary content provided.`);
    }


    // --- Main Content Sections ---
    // Helper function to append a section (NO HORIZONTAL RULES)
    function appendSection(headerText, contentKey, isBulletedList = false, isExecutiveSummary = false) {
      const rawContent = opportunityData[contentKey];
      
      Logger.log(`[${SCRIPT_VERSION}] --- Section: ${headerText} ---`);
      const headerStyleName = isExecutiveSummary ? 'executiveSummaryHeader' : 'sectionHeader';
      appendStyledParagraph(headerText, headerStyleName);

      if (rawContent !== null && rawContent !== undefined && String(rawContent).trim() !== "") {
        const contentStr = String(rawContent);
        if (isBulletedList) {
          Logger.log(`[${SCRIPT_VERSION}] Appending bulleted list for '${headerText}'`);
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
    appendSection("Proposed Benefits", "benefits", true); // true for bulleted list
    appendSection("Timeline", "timeline");
    appendSection("Blockers and Status", "blockers");
    appendSection("Activity Summary", "activitySummary", true); // true for bulleted list
    appendSection("Next Steps", "nextStepsSummary");

    Logger.log(`[${SCRIPT_VERSION}] Finished appending all sections.`);

    // --- Save and Finalize ---
    Logger.log(`[${SCRIPT_VERSION}] Attempting to save and close document.`);
    doc.saveAndClose();
    const docUrl = doc.getUrl();
    Logger.log(`[${SCRIPT_VERSION}] Document processed and saved successfully! URL: ${docUrl}`);
    return docUrl;

  } catch (error) {
    Logger.log(`[${SCRIPT_VERSION}] !!!!! CRITICAL ERROR in createOrUpdateOpportunityDocument_V3 !!!!!`);
    Logger.log(`[${SCRIPT_VERSION}] Error Message: ${error.message}`);
    Logger.log(`[${SCRIPT_VERSION}] Error Name: ${error.name}`);
    if (error.stack) {
      Logger.log(`[${SCRIPT_VERSION}] Stack Trace: ${error.stack}`);
    }
    if (doc) {
      try {
        Logger.log(`[${SCRIPT_VERSION}] Attempting to save and close document after error...`);
        doc.saveAndClose();
        Logger.log(`[${SCRIPT_VERSION}] Document saved and closed after error. URL may be valid: ${doc.getUrl()}`);
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
    need: "Generate an summary of the business need, on this Google Workspace business opportunity, without any intro text, using plain text formatted natural language, newlines where appropriate, and no asterisks:",
    benefits: "What are the key benefits of Google Workspace for this customer to solve the need:",
    timeline: "Generate a timeline for when the customer is planning to take a decision / implement the project / other key dates",
    blockers: "Generate a short summary of any blockers that might exist with this opportunity and the current status and plan for it",
    activitySummary: "These logs show activities related to an ongoing Google Workspace business opportunity. If there are no activities, just state that in the output. Otherwise, summarise the activities without any intro text, using plain text formatted natural language, newlines where appropriate, and no asterisks. It should be presented as a general timeline of what has been done in the project chronologically, without necessarily giving the date for every single activity but rather an overview",
    nextStepsSummary: "I will provide you with the next steps for a Google Workspace opportunity from the business side: and the technical side: . Summarise these next steps as one joint next step overview without any intro text, using plain text formatted natural language, newlines where appropriate, and no asterisks:",
    aiInsights: "Use the collective information you have about the opportunity as provided, and provide three suggestions on how to progress the opportunity, remove blockers or what to focus on to win the deal. Use plaintext formatting and no asterix or bullet point signs. Leverage the following knowledgebase to provide the suggestions you give (without referring to it explicitly): " + knowledge()
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

function cleanJSONString2(jsonString) {
  let cleanedString = jsonString.replace(/^```json\s*/, '');
  cleanedString = cleanedString.slice(0, -4);
  cleanedString = cleanedString.trim();

  // Remove control characters (ASCII 0-31) except for \n, \r, \t.
  cleanedString = cleanedString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Remove various whitespace characters.
  cleanedString = cleanedString.replace(/[\u200B-\u200F\uFEFF]/g, ''); // Zero-width spaces, BOM, etc.
  cleanedString = cleanedString.replace(/\s+/g, ' '); // Replace multiple spaces with single space.

  // Attempt to fix common formatting issues.
  cleanedString = cleanedString.replace(/(\w+):/g, '"$1":'); // Quote keys.
  cleanedString = cleanedString.replace(/'([^']+)'/g, '"$1"'); // Replace single quotes with double quotes.
  cleanedString = cleanedString.replace(/,\s*}/g, '}'); // Remove trailing commas.
  cleanedString = cleanedString.replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays.

  // Ensure it's wrapped in curly braces if needed.
  if (!cleanedString.startsWith('{')) {
    cleanedString = '{' + cleanedString + '}';
  }

  return cleanedString;
}

function cleanJSONString(jsonString) {
 const cleanedString = jsonString.replace(/^```json\s*/, '').slice(0, -4);
 return cleanedString;
}