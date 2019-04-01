const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const EventEmitter = require("events");
const compression = require("compression");
const findCacheDir = require("find-cache-dir");
const api = require("oba-wrapper/node");
const app = express();
const path = require("path");
const https = require("https");
const striptags = require("striptags");

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

app.get("/", (req, res) => {
  https
    .get("https://www.cmd-amsterdam.nl/wp-json/wp/v2/pages/758", response => {
      let data = "";

      response.on("data", buffer => (data += buffer));

      response.on("end", () => {
        const html = JSON.parse(data).content.rendered;

        // Selects all the: [full-width] bs
        const rx1 = /\[.+\]/g;

        // Selects all white spaces
        const rx2 = /(?<=\>)[\t\n\r\s]+(?=\<)/g;

        // Selects all the useful tags
        const rx3 = /\<(p|a|form|button|h[1-6]).+?\1\>|\<img.+?\/?\>|(?<=(div|span).+\>).[^\<\>]+(?=\<\/(div|span))/g;

        const normalHtml = html.replace(rx1, "");
        const minifiedHtml = normalHtml.replace(rx2, "");

        const temp = [];
        let result;

        while ((result = rx3.exec(minifiedHtml)) !== null) {
          temp.push(result[0]);
        }
        console.log(temp);
        res.send(temp.join(""));
      });
    })
    .on("error", err => {
      console.log("Error: " + err.message);
    });
});

// https://www.twilio.com/blog/2017/08/http-requests-in-node-js.html

app.listen(process.env.PORT || 3000);
