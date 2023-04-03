const { Transform } = require("stream");
const { optimize } = require("svgo");

class SVGOTransform extends Transform {
  constructor(options) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    const svgString = chunk.toString();

    const result = optimize(svgString);
    this.push(result.data);
    callback();
  }
}

module.exports = SVGOTransform;
