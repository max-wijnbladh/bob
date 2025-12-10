function postHygienePost(spaceName, vector_url, icon, account_name){
token = getToken_()
Logger.log(spaceName)



message =
{
  "cardsV2": [
    {
      "card": {
        "header": {
          "title": "Vector Hygiene",
          "subtitle": account_name,
          "imageUrl": icon
        },
        "sections": [
          { // Section 1: Collapsible paragraph
            "header": "What is the business need?",
            "collapsible": true, // Paragraph is collapsible
            "uncollapsibleWidgetsCount": 1, // All widgets are collapsible in this section
            "widgets": [
              {
                "textParagraph": {
                  "text": 'The "Business Need" field in Salesforce is blank for this opportunity, please review.',
                  "maxLines": 5
                }
              }
            ]
          },
          { // Section 2: Always visible button
            "widgets": [ // No header for this section, if you don't need one
              {
                "buttonList": {
                  "buttons": [
                    {
                      "text": "Vector",
                      "icon": {
                        "knownIcon": "OPEN_IN_NEW"
                      },
                      "onClick": {
                        "openLink": {
                          "url": vector_url
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  ]
}


  parameters = {}
  Logger.log(message)
  Logger.log(spaceName)
  Chat.Spaces.Messages.create(message, spaceName, parameters, { 'Authorization': 'Bearer ' + token })
  return true
}