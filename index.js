const express = require("express");
const bodyParser = require("body-parser");
const compression = require("compression");
const findCacheDir = require("find-cache-dir");
const app = express();
const path = require("path");
const https = require("https");

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
        // console.log(logic(data));
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
  let html = JSON.parse(data).content.rendered;
  const path = JSON.parse(data).slug;

  // Selects all the: [full-width] bs
  const rx1 = /\[.+\]/g;
  // Selects all white spaces
  const rx2 = /(?<=\>)[\t\n\r\s]+(?=\<)/g;
  // Selects all the useful tags
  const rx3 = /\<(p|a|form|button|h[1-6]).+?\1\>|\<img.+?\/?\>|(?<=(div|span).+\>).[^\<\>]+(?=\<\/(div|span))/g;

  const normalHtml = html.replace(rx1, "");

  const minifiedHtml = normalHtml.replace(rx2, "");

  html = removeEmpty(html);
  html = curlyBracket(html);
  html = standalones(html);
  html = makeLabels(html);
  html = makeUlLi(html);
  html = removeBr(html);
  html = lazyload(html);
  html = removeBrackets(html);
  html = breakTag(html);
  html = removeDiv(html);
  html = createSection(html);
  html = sectionStructure(html);
  html = createHeadings(html);
  html = formLabel(html);
  html = emptyValue(html);

  return [html, path];
}

function removeEmpty(html) {
  const rx = /\<(\w+?)(?:.[^\<]*)?\>(?:[\s\t])*\<\/\1\>/g;
  const bgImageRx = /\<(?:div|span).*?(background-image).*?\>/;

  let tmp = 0;

  const newHtml = html.replace(rx, (...arg) => {
    const fullMatch = arg[0];
    const group = arg[1];
    // console.log(fullMatch)
    if (["iframe", "textarea"].includes(group)) {
      return fullMatch;
    } else if (bgImageRx.test(fullMatch)) {
      return fullMatch;
    } else {
      tmp++;
      return "";
    }
  });

  if (tmp > 0) {
    // console.log("yes");
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
  const rx = /\<(p)\>(.*)(\<br\s*\/\>).*(input|textarea|select).*\<\/?(\1)\>/g;
  const allPsRx = /(\<p\s*(?:.[^\<p])*\>).+?(\<\/p\>)/g;
  const hasInputRx = /\<(input|textarea|select)/;
  const getP = /(?<=\<{1}\/?)p/g;

  let result;

  html = html.replace(allPsRx, (...args) => {
    if (hasInputRx.test(args[0])) {
      return args[0].replace(getP, "label");
    } else {
      return args[0];
    }
    // if (hasInputRx.test)
  });
  // console.log(html)
  return html;
}

function createHeadings(html) {
  const nectarDropcaps = /\<(?:(?:span)\s(?:class="nectar-dropcap")(?:.[^\<\>]*))\>(.[^\<\>]+)*?\<\/(?:span)\>/g;

  return html.replace(nectarDropcaps, (...arg) => `<h2>${arg[1]}</h2>`);
}

function lazyload(html) {
  const allImg = /(\<img\s*)([\w\s-="%:/.]*)(>)/g;
  const allSrc = /(src=")([\w\s:/._-]*)(")/g;
  let result;
  let i = 0;
  // while ((result = allImg.exec(html)) !== null) {
  // console.log(result[0]);

  let tst = html.replace(allImg, (...x) => {
    if (i > 0) {
      const im = x[0].replace(allSrc, (...arg) => {
        return `class="lazy" ${arg[1]}" data-src="${arg[2]}"`;
      });
      // console.log(im);
      return `<picture>${im}</picture>`;
    } else {
      i++;
      return x[0];
    }
  });
  // console.log(tst);

  return tst;
  // }
  // console.log(result);
}

function divCheck(html) {
  const allDivClasses = /(<div\s)([\w\d\s="#:;-]*)(class=")([\w\d\s-_]*)(")/g;

  let result;

  while ((result = allDivClasses.exec(html)) !== null) {
    console.log(result[4]);
  }
}

function standalones(html) {
  const rx = /(<\/div>*|<\/a>*)([\w\d\+]+[\s\w\d\W][^<]*)(<[\/\w\d]*>)/g;

  return html.replace(rx, (...arg) => `<p class="clDiv">${arg[2]}</p>`);
}

function removeBr(html) {
  const rx = /\<br\s*\/\>/g;

  return html.replace(rx, "");
}

function removeBrackets(html) {
  const rx = /(\[)([^\]]*)(\])/g;

  return html.replace(rx, "");
}

function finalCleaner(html) {
  const rx = /\<(div|span).+?\>|\<\/(div|span)\>/g;

  return html.replace(rx, "");
}

function breakTag(html) {
  const rx = /(&nbsp;)/g;
  return html.replace(rx, " ");
}

function curlyBracket(html) {
  const rx = /(})*/g;
  return html.replace(rx, "");
}

function emptyValue(html) {
  const rx = /(<\/[^>]*>)([\w][^<]*)/g;
  const rx2 = /(<\/a>\s*)([\.]|[\w])([^<]*)/g;
  let tst = html.replace(rx, (...x) => {
    // console.log(x[2]);
    return `<p>${x[2]}</p>`;
  });

  let tst2 = tst.replace(rx2, (...x) => {
    // console.log(x[0]);
    return `${x[1]}<p>${x[2]}${x[3]}</p>`;
  });
  // console.log(tst2);
  // console.log(tst);
  return tst2;
}

function createSection(html) {
  // console.log("createSection");
  const rx = /(<div)([\s\w\d="\-:()@:/.;><}]*)(<!--\/container)/g;
  let tst = html.replace(rx, (...x) => {
    return `<section class="beginHeader">${x[1]}${x[2]}</section>${x[3]}`;
  });
  return tst;
}

function formLabel(html) {
  const rx = /(<form)([\w\s\W]*<\/form)/g;
  const rx2 = /(<p>)/g;
  const rx3 = /(<\/p>)/g;

  let tst = html.replace(rx, (...x) => {
    // console.log(x[0]);
    const p = x[0].replace(rx2, (...arg) => {
      // console.log(arg[0]);
      return `<label>`;
    });
    const p2 = p.replace(rx3, (...arg) => {
      // console.log(arg[0]);
      return `</label>`;
    });
    return p2;
  });
  // console.log(tst);
  return tst;
}

function sectionStructure(html) {
  const rx = /(<span)([\w\s"=]*)(nectar-dropcap*)/g;
  const rx2 = /([^±]*$)/g;
  let i = 0;
  let tst = html.replace(rx, (...x) => {
    if (i === 0) {
      i++;
      return `<section class="content ct${i}">${x[0]}`;
    }
    if (i > 0 && i < x.length) {
      i++;
      return `</section><section class="content ct${i}">${x[0]}`;
    }
    if (i === x.length) {
      i++;
      return `</section><section class="content ct${i}">" + ${x[0]}`;
    }
  });
  let tst2 = tst.replace(rx2, (...x) => {
    // console.log("tst2");
    // console.log(x[0]);
    return `${x[0]}</section>`;
  });
  // console.log(tst2);
  return tst2;
}

function removeDiv(html) {
  const rx = /(<div)([^>]*)(>\s*)/g;
  const rx2 = /(<\/div>*)/g;
  const bgDiv = /(<div)([^>]*)([>]*)(style=")([^>]*)(background-image:\surl[^>]*)(")(>)/g;

  html = html.replace(rx2, "");

  let tst = html.replace(rx, (...x) => {
    // console.log(x[0]);
    let check = bgDiv.test(x[0]);
    if (check === true) {
      // console.log(x[0]);
      // console.log(x[0] + "</div>");
      return `${x[0]}</div>}`;
    } else {
      return "";
    }
    // console.log(check);
  });
  // console.log(tst);
  return tst;
  // return html.replace(rx, "");
}

// https:/ /www.twilio.com/blog/2017/08/http-requests-in-node-js.html

app.listen(process.env.PORT || 3000);
