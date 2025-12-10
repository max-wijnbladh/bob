function shareWeeklyDigest(spaceName, summary = "test", vector_url = "test", icon = "test", account_name = "test", context = "test", next_steps = "test", tips, execSummary){
token = getToken_()
Logger.log(spaceName)
//spaceName = "spaces/AAAA_x3ZYqw"
console.log("icon:", icon);
console.log("summary:", summary);
//summary = "Everyone was happy"
console.log("vector_url:", vector_url);
console.log("spaceName:", spaceName);
suggestion = tips


message =
{
  "cardsV2": [
    {
      "card": {
        "header": {
          "title": "Monday Recap",
          "subtitle": account_name,
          "imageUrl": icon
        },
        "sections": [
          {
            "header": "AI Summary",
            "collapsible": true,
            "uncollapsibleWidgetsCount": 1,
            "widgets": [
              {
                "textParagraph": {
                  "text": summary,
                  "maxLines": 10
                }
              }
            ]
          },
          {
            "header": "Next steps",
            "collapsible": true,
            "uncollapsibleWidgetsCount": 1,
            "widgets": [
              {
                "textParagraph": {
                  "text": next_steps,
                  "maxLines": 10
                }
              }
            ]
          },
          {
            "header": "Tips from Gemini",
            "collapsible": true,
            "uncollapsibleWidgetsCount": 1,
            "widgets": [
              {
                "textParagraph": {
                  "text": suggestion,
                  "maxLines": 10
                }
              }
            ]
          },
          {
            "widgets": [
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
                    },
                                        {
                      "text": "Executive Summary",
                      "icon": {
                        "knownIcon": "DESCRIPTION"
                      },
                      "onClick": {
                        "openLink": {
                          "url": execSummary
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


function shareDigest(account_name, overview, icon, spaceName, activities, vector_url, next_steps) {

token = getToken_()
Logger.log(spaceName)
if (spaceName == null)
  spaceName = "spaces/AAAA_x3ZYqw"
console.log("account_name:", account_name);
console.log("icon:", icon);
console.log("overview:", overview);
console.log("activities:", activities);
console.log("vector_url:", vector_url);
console.log("spaceName:", spaceName);
Logger.log(next_steps)

prompt = "We have an ongoing Google Workspace business deal with a company. I will provide you with some details of the deal and next steps and activities, and I want you to provide me with a suggestion on how we can approach the deal to win the customer using that info. Dont make the suggestion too long, focus on actionable next steps. Dont include any asterix, it should be formatted and readable as plain text with double newlines, and dont write any intro text just the suggestion:  " + overview + next_steps + activities 
model = "gemini-2.0-flash-thinking-exp-01-21"

suggestion = gemini(prompt, model)

  const message = {
    cardsV2: [{
      cardId: "uniqueCardId", // Required: A unique ID for this card
      card: {
        header: {
          title: "Monthly Opportunity Digest",
          subtitle: account_name, // Added account name to subtitle
          imageUrl: icon,
          imageType: "CIRCLE", //Consider removing.  ImageType is deprecated.
          imageAltText: "Avatar for Monthly Digest", //Add alt text for accessibility
        },
        sections: [
          {
            header: "Overview",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [
              {
                textParagraph: { text: overview, "maxLines": 3 },   //Removed maxLines: 2. It's deprecated, and not needed inside textParagraph
              },
            ],
          },
          {
            header: "Activities",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [
              {
                textParagraph: { text: activities, "maxLines": 3 }, 
              },
            ],
          },
          {
            header: "Next Steps",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [
              {
                textParagraph: { text: next_steps, "maxLines": 3 }, 
              },
            ],
          },
          {
            header: "Gemini Suggestion",
            collapsible: true,
            uncollapsibleWidgetsCount: 1,
            widgets: [
              {
                textParagraph: { text: suggestion, "maxLines": 3 }, 
              },
            ],
          },
        ],
      }
    }]
  };



  parameters = {}
  Logger.log(message)
  Logger.log(spaceName)
  Chat.Spaces.Messages.create(message, spaceName, parameters, { 'Authorization': 'Bearer ' + token })
  return true
}
  

