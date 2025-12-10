/**
 * Extracts content from ALL visible sheets in a Google Sheet URL and converts
 * it into a structured JSON string. The output is an object where each key
 * is a sheet (tab) name.
 *
 * @param {string} url The full URL of the Google Sheet.
 * @returns {string|null} A JSON string of all sheets' content, or null on error.
 */
function getContentFromSheetUrl(url) {
  if (!url || typeof url !== 'string') {
    Logger.log("getContentFromSheetUrl: URL is missing or invalid.");
    return null;
  }

  try {
    // Extract the Sheet ID from the URL
    const sheetIdMatch = url.match(/\/d\/(.+?)\//);
    if (!sheetIdMatch || !sheetIdMatch[1]) {
      throw new Error("Could not extract a valid Sheet ID from the URL.");
    }
    const sheetId = sheetIdMatch[1];
    
    Logger.log(`getContentFromSheetUrl: Extracted Sheet ID: ${sheetId}`);
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const allSheets = spreadsheet.getSheets().filter(s => !s.isSheetHidden()); // Get ALL visible sheets
    
    if (allSheets.length === 0) {
      throw new Error("No visible sheets found in the linked spreadsheet.");
    }

    const allSheetsData = {}; // This object will hold data from all sheets

    // Loop through each sheet in the spreadsheet
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      const data = sheet.getDataRange().getValues();

      if (data.length < 2) {
        Logger.log(`getContentFromSheetUrl: Sheet "${sheetName}" has no data rows, skipping.`);
        continue; // Skip to the next sheet
      }

      const header = data.shift(); // Get header row and remove it from data
      const jsonDataForSheet = data.map(row => {
        const rowObject = {};
        header.forEach((colName, index) => {
          rowObject[colName] = row[index];
        });
        return rowObject;
      });
      
      // Add this sheet's data to our main object, using the sheet name as the key
      allSheetsData[sheetName] = jsonDataForSheet;
      Logger.log(`getContentFromSheetUrl: Successfully processed ${jsonDataForSheet.length} rows from sheet "${sheetName}".`);
    }

    return JSON.stringify(allSheetsData, null, 2); // Return a single JSON string of the entire object

  } catch (e) {
    Logger.log(`ERROR in getContentFromSheetUrl: ${e.message}`);
    return null;
  }
}

/**
 * Generates and creates a "Technical Win Strategy" document.
 * V2: Now uses a linked Google Sheet as the primary context for the AI.
 *
 * @param {string} opportunityId The unique ID of the opportunity.
 * @param {string} opportunityName The name of the opportunity.
 * @param {string} opportunityDescription A description of the opportunity.
 * @param {string} customerSheetUrl The URL to the collaborative Google Sheet.
 * @returns {string|null} The URL of the created document, or null on failure.
 */
function generateAndCreateTechWinDoc(opportunityId, opportunityName, opportunityDescription, customerSheetUrl) {
  Logger.log(`--- Starting generateAndCreateTechWinDoc for: "${opportunityName}" ---`);
  Logger.log(`--- Using customer context sheet: ${customerSheetUrl} ---`);

  try {
    // --- 1. Get Context from the Linked Google Sheet ---
    const customerContext = getContentFromSheetUrl(customerSheetUrl);
    if (!customerContext) {
      Logger.log("WARN: Could not get content from the provided customer sheet URL. Proceeding with basic info only.");
    }

    // --- 2. Gather other basic data ---
    const opportunityInfo = {
      id: opportunityId,
      name: opportunityName,
      description: opportunityDescription
    };

    // --- 3. Build the Prompt for the AI ---
    const finalPrompt = `
      Act as a solutions consultant. Your task is to generate the content for a technical win strategy document.
      
      The opportunity details are: 
      ${JSON.stringify(opportunityInfo)}

      The MOST IMPORTANT information is the customer's direct input, which is provided here as JSON data from their collaborative Google Sheet. Use this as the primary source of truth for technical details, current/future state, challenges, etc.:
      ${customerContext || "No customer sheet data provided."}

      Your entire response MUST be a single, valid JSON object and nothing else. Do not use markdown like \`\`\`json.
      
      The JSON object must have these exact keys: "executiveSummary", "solutionMapping", "architectureSummary".

      Follow these instructions for each key, using the customer sheet data as your main reference:
      1. "executiveSummary": Write a concise Executive Summary (2-3 sentences).
      2. "solutionMapping": Create a JSON array of objects, each with a 'challenge' and 'solution' key, based on the customer's stated challenges. The challenge should be related to their existing products or services, and the solutions should be how Google Workspace can solve those challenges.
      3. "architectureSummary": Create a JSON array of objects, each with a 'category', 'current', 'proposed', and 'risks' key. Populate this from the customer's input on their current/future state. Future state should be using Google Workspace products and partners
      4. "launchAndChangeManagement": Create a single JSON object with keys for 'Recommended CCE Services', 'Partner', and 'Deployment Requirements', based on the customer's project goals.
    `;
    Logger.log("Final prompt created for Gemini.");

    // --- 4. Call your gemini(prompt) function directly ---
    const rawJsonResponse = gemini(finalPrompt, "gemini-2.0-flash");
    if (!rawJsonResponse) throw new Error("The AI (gemini function) returned an empty response.");
    Logger.log("Raw JSON response received from AI.");

    // --- 5. Clean, parse, and create the document ---
    const cleanedJson = cleanJSONString(rawJsonResponse);
    const techWinData = JSON.parse(cleanedJson);
    Logger.log("Successfully parsed AI response into an object.");
    
    const documentUrl = writeTechWinDocument(techWinData, opportunityName);
    if (!documentUrl) throw new Error("Failed to write the Google Document.");

    Logger.log(`--- Successfully created Tech Win Strategy doc: ${documentUrl} ---`);
    Logger.log(documentUrl)
    return documentUrl;

  } catch (e) {
    Logger.log(`!!!!! CRITICAL ERROR in generateAndCreateTechWinDoc: ${e.message} !!!!!`);
    Logger.log(`Stack: ${e.stack}`);
    return null;
  }
}

/**
 * Creates or updates a "Technical Win Strategy" Google Doc with structured data.
 * V7: Refines the table styling logic for more reliable full-width tables.
 *
 * @param {object} techWinData The structured data object generated by the AI.
 * @param {string} opportunityName The name of the opportunity, used for the document title.
 * @returns {string|null} The URL of the created document, or null on error.
 */
function writeTechWinDocument(techWinData, opportunityName) {
  const docName = `Technical Win Strategy - ${opportunityName}`;
  Logger.log(`Starting to write document: "${docName}"`);
  let doc, body;

  try {
    const existingFiles = DriveApp.getFilesByName(docName);
    if (existingFiles.hasNext()) {
      doc = DocumentApp.openById(existingFiles.next().getId());
      body = doc.getBody();
      body.clear();
    } else {
      doc = DocumentApp.create(docName);
      body = doc.getBody();
    }

    // --- Define Styles ---
    const FONT_FAMILY = 'Inter';
    const titleStyle = { [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: 18, [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.SPACING_AFTER]: 12 };
    const h2Style = { [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: 14, [DocumentApp.Attribute.BOLD]: true, [DocumentApp.Attribute.SPACING_BEFORE]: 18, [DocumentApp.Attribute.SPACING_AFTER]: 6 };
    const paragraphStyle = { [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: 11 };
    
    // ===================================================================
    // --- Helper function to apply detailed styles to a table ---
    function styleTable(table, columnWidths = []) {
      if (!table) return;
      
      // --- Style definitions ---
      const headerBgColor = '#F3F3F3'; 
      const borderColor = '#DDDDDD';   
      const borderWidth = 0.5;         
      const cellPadding = 5;
      const TABLE_FONT_SIZE = 10;

      const headerStyle = {
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: TABLE_FONT_SIZE,
        [DocumentApp.Attribute.BACKGROUND_COLOR]: headerBgColor, [DocumentApp.Attribute.BOLD]: true,
        [DocumentApp.Attribute.VERTICAL_ALIGNMENT]: DocumentApp.VerticalAlignment.MIDDLE,
        [DocumentApp.Attribute.PADDING_TOP]: cellPadding, [DocumentApp.Attribute.PADDING_BOTTOM]: cellPadding,
        [DocumentApp.Attribute.PADDING_LEFT]: cellPadding, [DocumentApp.Attribute.PADDING_RIGHT]: cellPadding,
        [DocumentApp.Attribute.BORDER_WIDTH]: borderWidth, [DocumentApp.Attribute.BORDER_COLOR]: borderColor
      };
      const cellStyle = {
        [DocumentApp.Attribute.FONT_FAMILY]: FONT_FAMILY, [DocumentApp.Attribute.FONT_SIZE]: TABLE_FONT_SIZE,
        [DocumentApp.Attribute.BOLD]: false, [DocumentApp.Attribute.VERTICAL_ALIGNMENT]: DocumentApp.VerticalAlignment.TOP,
        [DocumentApp.Attribute.PADDING_TOP]: cellPadding, [DocumentApp.Attribute.PADDING_BOTTOM]: cellPadding,
        [DocumentApp.Attribute.PADDING_LEFT]: cellPadding, [DocumentApp.Attribute.PADDING_RIGHT]: cellPadding,
        [DocumentApp.Attribute.BORDER_WIDTH]: borderWidth, [DocumentApp.Attribute.BORDER_COLOR]: borderColor
      };
      
      // <<< STEP 1: Apply all CELL-LEVEL styles first >>>
      for (let i = 0; i < table.getNumRows(); i++) {
        const row = table.getRow(i);
        for (let j = 0; j < row.getNumCells(); j++) {
          const cell = row.getCell(j);
          if (i === 0) cell.setAttributes(headerStyle);
          else cell.setAttributes(cellStyle);
        }
      }
      
      // <<< STEP 2: Apply TABLE-LEVEL column widths LAST >>>
      if (columnWidths.length > 0 && columnWidths.length === table.getRow(0).getNumCells()) {
        for (let i = 0; i < columnWidths.length; i++) {
          table.setColumnWidth(i, columnWidths[i]);
        }
        Logger.log(`Table widths set to: [${columnWidths.join(', ')}]`);
      }
    }
    // ===================================================================

    // --- Build Document ---
    body.appendParagraph(`Technical Win Strategy: ${opportunityName}`).setAttributes(titleStyle);
    body.appendParagraph("Executive Summary").setAttributes(h2Style);
    body.appendParagraph(techWinData.executiveSummary || "Not available.").setAttributes(paragraphStyle);

    // --- Solution Mapping Table with Fixed Widths ---
    body.appendParagraph("Solution Mapping").setAttributes(h2Style);
    if (techWinData.solutionMapping && Array.isArray(techWinData.solutionMapping)) {
      const tableData = [['Business Challenges', 'Workspace Solution (Differentiated)']];
      techWinData.solutionMapping.forEach(item => tableData.push([item.challenge || 'N/A', item.solution || 'N/A']));
      const table = body.appendTable(tableData);
      styleTable(table, [400, 400]); // Define widths: 1/3 for challenges, 2/3 for solution. Total = 450
    } else {
      body.appendParagraph("Solution mapping data not available.").setAttributes(paragraphStyle);
    }

    // --- Architecture Summary Table with Fixed Widths ---
    body.appendParagraph("Architecture Summary").setAttributes(h2Style);
    if (techWinData.architectureSummary && Array.isArray(techWinData.architectureSummary)) {
      const tableData = [['Category', 'Current', 'Proposed', 'Risks']];
      techWinData.architectureSummary.forEach(item => {
        const current = (item.current || 'N/A').replace(/<br>/g, '\n');
        const proposed = (item.proposed || 'N/A').replace(/<br>/g, '\n');
        const risks = (item.risks || 'N/A').replace(/<br>/g, '\n');
        tableData.push([item.category || 'N/A', current, proposed, risks]);
      });
      const table = body.appendTable(tableData);
      styleTable(table, [200, 200, 200, 200]); // Total = 450
    } else {
      body.appendParagraph("Architecture summary data not available.").setAttributes(paragraphStyle);
    }
    
    // ... (Launch & Change Management section remains the same) ...
    
    doc.saveAndClose();
    return doc.getUrl();

  } catch (e) {
    Logger.log(`ERROR in writeTechWinDocument: ${e.message}\nStack: ${e.stack}`);
    return null;
  }
}
/**
 * Cleans a string to make it safe for JSON.parse().
 */
function cleanJSONString(jsonString) {
  if (typeof jsonString !== 'string') {
    Logger.log(`WARN: cleanJSONString received non-string input. Type: ${typeof jsonString}. Returning empty object.`);
    return "{}";
  }
  let cleanedString = jsonString.trim();
  if (cleanedString.startsWith("```json")) cleanedString = cleanedString.substring(7);
  else if (cleanedString.startsWith("```")) cleanedString = cleanedString.substring(3);
  if (cleanedString.endsWith("```")) cleanedString = cleanedString.substring(0, cleanedString.length - 3);
  cleanedString = cleanedString.trim();
  cleanedString = cleanedString.replace(/[\u0000-\u001F]/g, '');
  return cleanedString;
}