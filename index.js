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
  https.get(
    "https://www.cmd-amsterdam.nl/wp-json/wp/v2/pages/8901",
    response => {
      let data = "";

      response.on("data", buffer => (data += buffer));
      response.on("end", () => {
        res.render("pages/index", {
          data: logic(data)[0],
          path: logic(data)[1]
        });
      });
    }
  );
});

app.get("/samenwerken", (req, res) => {
  https.get(
    "https://www.cmd-amsterdam.nl/wp-json/wp/v2/pages/758",
    response => {
      let data = "";

      response.on("data", buffer => (data += buffer));
      response.on("end", () => {
        console.log(logic(data));
        res.render("pages/index", {
          data: logic(data)[0],
          path: logic(data)[1]
        });
      });
    }
  );
});

app.get("/contact", (req, res) => {
  https.get("https://www.cmd-amsterdam.nl/wp-json/wp/v2/pages/62", response => {
    let data = "";
    response.on("data", buffer => (data += buffer));
    response.on("end", () => {
      res.render("pages/index", {
        data: logic(data)[0],
        path: logic(data)[1]
      });
    });
  });
});

function logic(data) {
  const html = JSON.parse(data).content.rendered;
  const path = JSON.parse(data).slug;

  // Selects all the: [full-width] bs
  const rx1 = /\[.+\]/g;
  // Selects all white spaces
  const rx2 = /(?<=\>)[\t\n\r\s]+(?=\<)/g;
  // Selects all the useful tags
  const rx3 = /\<(p|a|form|button|h[1-6]).+?\1\>|\<img.+?\/?\>|(?<=(div|span).+\>).[^\<\>]+(?=\<\/(div|span))/g;

  const normalHtml = html.replace(rx1, "");

  const minifiedHtml = normalHtml.replace(rx2, "");

  let smallerHtml = removeEmpty(minifiedHtml);
  // console.log(smallerHtml);
  return [smallerHtml, path];
}

function removeEmpty(html) {
  const rx = /\<(\w+?).[^\<]*\>(?:[\s\t])*\<\/\1\>/g;

  let tmp = 0;

  const newHtml = html.replace(rx, (...arg) => {
    const fullMatch = arg[0];
    const group = arg[1];

    if (["iframe", "textarea"].includes(group)) {
      return fullMatch;
    } else {
      tmp++;
      return "";
    }
  });

  if (tmp > 0) {
    console.log("yes");
    return removeEmpty(newHtml);
  } else {
    return newHtml;
  }
}

function makeUlLi(html) {
  // Full regex
  const rx = /(?:\<(div)\s*(?:.[^\<])*\>)?[\s\t\n]*(•).+?(?:\<\/(div)|(br\s*\/{0,1}))?\>/g;

  html = html.replace(rx, (...args) => {
    let match = args[0];
    const firstDiv = args[1];
    const bullet = args[2];
    const lastDiv = args[3];
    const br = args[4];

    if (firstDiv !== undefined) {
      match = match.replace(firstDiv, "ul");
    }

    if (bullet !== undefined) {
      match = match.replace(bullet, "<li>");
    }

    if (lastDiv !== undefined) {
      match = match.replace(lastDiv, "li></ul");
    }

    if (br !== undefined) {
      match = match.replace(br, "/li");
    }

    return match;
  });

  return html;
}

function makeLabels(html) {
  // console.log(html)
  // const rx = /\<(p)\>(.*)(\<br\s*\/\>).*(input|textarea|select).*\<\/?(\1)\>/g;
  const allPsRx = /(\<p\s*(?:.[^\<p])*\>).+?(\<\/p\>)/g;
  // const inputTextareaRx = //g
  let result;

  while ((result = allPsRx.exec(html)) !== null) {
    // console.log(result[0], "\n")
  }

  // html = html.replace(rx, (...args) => {
  //   console.log("test")
  //   let match = args[0];
  //   const firstP = args[1];
  //   const content = args[2];
  //   const br = args[3];
  //   const inputType = args[4];
  //   const lastP = args[5];
  //
  //   // console.log(content, inputType)
  // })
}

// https:/ /www.twilio.com/blog/2017/08/http-requests-in-node-js.html

app.listen(process.env.PORT || 3000);
