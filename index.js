const { join, basename, resolve } = require("path");
const { createReadStream, createWriteStream, readdirSync, mkdirSync } = require("fs");
const Inkscape = require("inkscape");
const replaceStream = require("replacestream");
const async = require("async");
const svgtofont = require("svgtofont");
const path = require("path");
const SVGOTransform = require("./svgoTransform");
const { program } = require("commander");

function strokeToPath() {
  return new Inkscape([
    "--actions=select-all;selection-ungroup;select-all;object-stroke-to-path;",
    "--export-type=svg",
  ]);
}

function fillBetweenPaths() {
  return new Inkscape([
    "--actions=select-all;path-break-apart;select-all;path-fill-between-paths;",
    "--export-type=svg",
  ]);
}

program
  .name("strokes2font")
  .description("Convert a collection of svg strokes into a font")
  .requiredOption("--source <string>", "directory containing the SVG files")
  .option("--destination <string>", "output directory", "./dist/font")
  .option(
    "-c, --concurrency <number>",
    "number of worker functions that should be run in parallel",
    1
  )
  .parse();

const options = program.opts();

const source = resolve(options.source);
const destination = resolve(options.destination);
const concurrency = options.concurrency;
const temp = resolve("./dist/temp");

mkdirSync(temp, { recursive: true});

const queue = async.queue((fileName, callback) => {
  const filePath = join(source, fileName);
  const outPath = join(temp, fileName);

  console.log(filePath);

  const outputStream = createWriteStream(outPath);

  const stream = createReadStream(filePath, { encoding: "utf8" })
    .pipe(
      replaceStream(
        'xmlns="http://www.w3.org/2000/svg"',
        'xmlns="http://www.w3.org/2000/svg" fill="none"'
      )
    )
    .pipe(strokeToPath())
    .pipe(new SVGOTransform())
    .pipe(outputStream);

  stream.on("error", callback);
  outputStream.on("finish", callback);
}, concurrency);

readdirSync(source)
  .filter((file) => file.endsWith(".svg"))
  .forEach((file) => {
    queue.push(file);
  });

queue.drain(() => {
  console.log("All files processed successfully");

  svgtofont({
    src: temp, // svg path
    dist: destination, // output path
    emptyDist: true,
    outSVGReact: false,
    useNameAsUnicode: true,
    fontName: "ids", // font name
    css: true, // Create CSS files.
    svgicons2svgfont: {
      normalize: true,
      fontHeight: 1000,
    },
    website: {
      title: "ids",
      logo: path.resolve(process.cwd(), "svg", "git.svg"),
      meta: {
        description: "Converts SVG fonts to TTF/EOT/WOFF/WOFF2/SVG format.",
        keywords: "svgtofont,TTF,EOT,WOFF,WOFF2,SVG",
      },
      description: ``,
      corners: {
        url: "https://github.com/jaywcjlove/svgtofont",
        width: 62, // default: 60
        height: 62, // default: 60
        bgColor: "#dc3545", // default: '#151513'
      },
      links: [
        {
          title: "GitHub",
          url: "https://github.com/jaywcjlove/svgtofont",
        },
        {
          title: "Feedback",
          url: "https://github.com/jaywcjlove/svgtofont/issues",
        },
        {
          title: "Font Class",
          url: "index.html",
        },
        {
          title: "Unicode",
          url: "unicode.html",
        },
      ],
      footerInfo: `Licensed under MIT. (Yes it's free and <a href="https://github.com/jaywcjlove/svgtofont">open-sourced</a>`,
    },
  }).then(() => {
    console.log("done!");
  });
});
