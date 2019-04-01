const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const EventEmitter = require("events");
const compression = require("compression");
const findCacheDir = require("find-cache-dir");
const api = require("oba-wrapper/node");
const app = express();
const path = require("path");

findCacheDir({ name: "cmd" });

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
// express.use
app.use(express.static(path.join(__dirname, "./static")));
app.use(compression());
app.use((req, res, next) => {
  // todo: set cache header to 1 year
  res.setHeader("Cache-Control", "max-age=" + 365 * 24 * 60 * 60);
  next();
});

//express.set(view engine = ejs)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// app.get("/", datafetch);
app.get("/", (req, res) =>
  res.render("pages/lijstSamenstellen", {
    data: null
  })
);

app.post("/", function(req, res) {
  var search = req.body.search;
  // console.log("Search value ", search);
  var dataGet = datafetch(search);
  dataGet
    .then(function(res2) {
      // console.log("res" + res);
      var data = res2.data;

      return data
        .map(function(item) {
          var titleSplit = item.title.split(" ");
          // console.log(titleSplit);
          titleSplit.includes(search);
          if (titleSplit.includes(search) === true) {
            // console.log(item);
            return item;
          }
        })
        .filter(valueCheck);

      function valueCheck(value) {
        return value !== undefined;
      }
    })
    .then(transformedRes => {
      console.log("62 " + transformedRes);
      res.render("pages/lijstSamenstellen", {
        data: transformedRes
      });
    });
});

app.listen(process.env.PORT || 3000);
