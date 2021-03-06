var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

// Routes

// A GET route for scraping the Mix website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("http://www.mix.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every a within an ArticleCard__details-container, and do the following:
    $(".ArticleCard__details-container").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the title, description, and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a.ArticleCard__title")
        .text();
      result.link = $(this)
        .children("a.ArticleCard__title")
        .attr("href");
      result.summary = $(this)
        .children("a.ArticleCard__description")
        .text()

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Finish the route so it grabs all of the articles
  db.Article.find({})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err)
  })
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Finish the route so it finds one article using the req.params.id,
  // and run the populate method with "note",
  // then responds with the article with the note included
  db.Article.findOne({
    _id: req.params.id
  })
  .populate("note")
  .then(function(dbArticles) {
    res.json(dbArticles);
  })
  .catch(function(err) {
    res.json(err);
  })
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  db.Note.create({
    title: req.body.title,
    body: req.body.body
  })
  .then(function(dbNote) {
    return db.Article.findOneAndUpdate({
      _id: req.params.id
    }, {
      $set: { note: dbNote._id } }, { new: true });
  })
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(err) {
    res.json(err);
  })
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
