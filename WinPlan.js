function extractSlideData() {
  var presentation = SlidesApp.openById("1CuAeV3flsQkXHnHG9UQiuyxkILvnUqxHlf63mvXJPHU")
  var slides = presentation.getSlides();
  var slideData = {}; // Initialize an empty object to store the JSON data

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var shapes = slide.getShapes();

    for (var j = 0; j < shapes.length; j++) {
      var shape = shapes[j];
      Logger.log(shape)
      if (shape.getText()) {
        var textRange = shape.getText();
        Logger.log(textRange.asString())
        var links = textRange.getLinks();

        for (var k = 0; k < links.length; k++) {
          break
          var link = links[k];
          var url = link.getLinkUrl();
          if (url && url.includes("https://vector.lightning.force.com/lightning/r/Opportunity/")) {
            var opportunityId = url.match(/Opportunity\/([a-zA-Z0-9]+)\/view/)[1];

            if (!slideData[opportunityId]) {
              // If the opportunity ID doesn't exist, create a new entry
              slideData[opportunityId] = {
                text: slide.getShapes().map(shape => shape.getText() ? shape.getText().asString() : "").join("\n")
              };
            } else {
              //If the opportunity ID exists, append the text to the existing entry.
              slideData[opportunityId].text += "\n" + slide.getShapes().map(shape => shape.getText() ? shape.getText().asString() : "").join("\n");
            }

          }
        }
      }
    }
  }

  Logger.log(JSON.stringify(slideData, null, 2)); // Log the JSON data
  return JSON.stringify(slideData); // return the json data.
}