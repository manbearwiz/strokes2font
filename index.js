const path = require("path");
const fs = require("fs");
const Inkscape = require("inkscape");
const replaceStream = require("replacestream");
const async = require("async");
const svgtofont = require("svgtofont");
const SVGOTransform = require("./svgoTransform");
const { program } = require("commander");

const strokeToPath = () =>
  new Inkscape([
    "--actions=select-all;selection-ungroup;select-all;object-stroke-to-path;",
    "--export-type=svg",
  ]);

const fillBetweenPaths = () =>
  new Inkscape([
    "--actions=select-all;path-break-apart;select-all;path-fill-between-paths;",
    "--export-type=svg",
  ]);

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
const source = path.resolve(options.source);
const destination = path.resolve(options.destination);
const temp = path.resolve("./dist/temp");

fs.mkdirSync(temp, { recursive: true });

const queue = async.queue((fileName, callback) => {
  const filePath = path.join(source, fileName);
  const outPath = path.join(temp, fileName);
  console.log(filePath);

  const outputStream = fs.createWriteStream(outPath);
  const stream = fs
    .createReadStream(filePath, { encoding: "utf8" })
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
}, options.concurrency);

fs.readdirSync(source)
  .filter((file) => file.endsWith(".svg"))
  .forEach((file) => queue.push(file));

queue.drain(() => {
  console.log("All files processed successfully");

  svgtofont({
    src: temp,
    dist: destination,
    emptyDist: true,
    outSVGReact: false,
    useNameAsUnicode: true,
    fontName: "ids",
    css: true,
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
    },
  }).then(() => {
    console.log("Done!");
  });
});
