const path = require('path');
const promisify = require('util.promisify');
const globPromise = require('glob');
const minimatch = require('minimatch');
const gzipSize = require('gzip-size');
const chalk = require('chalk');
const prettyBytes = require('pretty-bytes');
const brotliSize = require('brotli-size');
const { publishSizes, publishDiff } = require('size-plugin-store');
const fs = require('fs-extra');
const { noop, toFileMap, toMap, dedupe } = require('./util');

const glob = promisify(globPromise);

brotliSize.file = (path, options) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(path);
    stream.on('error', reject);

    const brotliStream = stream.pipe(brotliSize.stream(options));
    brotliStream.on('error', reject);
    brotliStream.on('brotli-size', resolve);
  });
};
const compression = {
  brotli: brotliSize,
  gzip: gzipSize
};


async function readFromSizeFile(filename) {
  try {
    const oldStats = await fs.readJSON(filename);
    return oldStats.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    return [];
  }
}


/**
 * `SizePluginCore(options)`
 * @param {Object} options
 * @param {string} [options.compression] compression method(gzip/brotli) to use, default: 'gzip'
 * @param {string} [options.pattern] minimatch pattern of files to track
 * @param {string} [options.exclude] minimatch pattern of files NOT to track
 * @param {string} [options.filename] file name to save filesizes to disk
 * @param {boolean} [options.publish] option to publish filesizes to size-plugin-store
 * @param {boolean} [options.writeFile] option to save filesizes to disk
 * @param {boolean} [options.mode] option for production/development mode
 * @param {number} [options.columnWidth] option for add spacing in message
 * @param {function} [options.stripHash] custom function to remove/normalize hashed filenames for comparison
 * @param {(item:Item)=>string?} [options.decorateItem] custom function to decorate items
 * @param {(data:Data)=>string?} [options.decorateAfter] custom function to decorate all output
 * @public
 */

class SizePluginCore {
  constructor(options) {
    const opt = options || {};
    opt.pattern = opt.pattern || '**/*.{mjs,js,jsx,css,html}';
    opt.filename = opt.filename || 'size-plugin.json';
    opt.writeFile = opt.writeFile !== false;
    opt.stripHash = opt.stripHash || noop;
    opt.filepath = path.join(process.cwd(), opt.filename);
    opt.mode = opt.mode || process.env.NODE_ENV;
    opt.compression = opt.compression || 'gzip';
    this.compressionSize = compression[opt.compression];
    this.options = opt;
  }
  filterFiles(files) {
    const isMatched = minimatch.filter(this.options.pattern);
    const isExcluded = this.options.exclude
      ? minimatch.filter(this.options.exclude)
      : () => false;
    return files.filter(file => isMatched(file) && !isExcluded(file));
  }
  async readFromDisk(cwd) {
    const files = await glob(this.options.pattern, {
      cwd,
      ignore: this.options.exclude
    });

    const sizes = await Promise.all(
      this.filterFiles(files).map(file =>
        this.compressionSize.file(path.join(cwd, file)).catch(() => null)
      )
    );
    return toMap(
      files.map(filename => this.options.stripHash(filename)),
      sizes
    );
  }
  async getPreviousSizes(outputPath) {
    const data = await readFromSizeFile(this.options.filepath);
    if (data.length) {
      const [{ files }] = data;
      return toFileMap(files);
    }
    return this.readFromDisk(outputPath);
  }
  async getSizes(assets) {
    const fileNames = this.filterFiles(Object.keys(assets));

    const sizes = await Promise.all(
      fileNames.map(name => this.compressionSize(assets[name].source))
    );
    // map of de-hashed filenames to their final size
    const sizeMap = toMap(
      fileNames.map(filename => this.options.stripHash(filename)),
      sizes
    );
    return sizeMap;
  }
  async getDiff(sizesBefore, sizes) {
    // get a list of unique filenames
    const fileNames = [
      ...Object.keys(sizesBefore),
      ...Object.keys(sizes)
    ].filter(dedupe);
    const files = [];
    for (const filename of fileNames) {
      const size = sizes[filename] || 0;
      const sizeBefore = sizesBefore[filename] || 0;
      const delta = size - sizeBefore;
      files.push({ filename, size, delta });
    }
    return files;
  }
  async printSizes(files) {
    const width = Math.max(...files.map(file => file.filename.length),this.options.columnWidth||0);
    let output = '';
    const items = [];
    for (const file of files) {
      const name = file.filename;
      const size = file.size;
      const delta = file.delta;
      const msg = new Array(width - name.length + 2).join(' ') + name + ' ⏤  ';
      const color =
        size > 100 * 1024
          ? 'red'
          : size > 40 * 1024
          ? 'yellow'
          : size > 20 * 1024
          ? 'cyan'
          : 'green';
      let sizeText = chalk[color](prettyBytes(size));
      let deltaText = '';
      if (delta && Math.abs(delta) > 1) {
        deltaText = (delta > 0 ? '+' : '') + prettyBytes(delta);
        if (delta > 1024) {
          sizeText = chalk.bold(sizeText);
          deltaText = chalk.red(deltaText);
        } else if (delta < -10) {
          deltaText = chalk.green(deltaText);
        }
        sizeText += ` (${deltaText})`;
      }
      let text = msg + sizeText + '\n';
      const item = {
        name,
        size,
        sizeText,
        delta,
        deltaText,
        msg,
        color
      };
      items.push(item);
      if (this.options.decorateItem) {
        text = this.options.decorateItem(text, item) || text;
      }
      output += text;
    }
    if (this.options.decorateAfter) {
      const opts = {
        sizes: items,
        raw: files,
        output
      };
      const text = this.options.decorateAfter(opts);
      if (text) {
        output += '\n' + text.replace(/^\n/g, '');
      }
    }
    return output;
  }
  async uploadSizes(files) {
    const stats = {
      timestamp: Date.now(),
      files: files
    };
    this.options.save && (await this.options.save(stats));
    this.options.publish && (await publishDiff(stats, this.options.filename));
    if (
      this.options.mode === 'production' &&
      stats.files.some(file => file.delta !== 0)
    ) {
      const data = await readFromSizeFile(this.options.filepath);
      data.unshift(stats);
      if (this.options.writeFile) {
        await fs.ensureFile(this.options.filename);
        await fs.writeJSON(this.options.filename, data);
      }
      this.options.publish && (await publishSizes(data, this.options.filename));
    }
  }
  async execute(assets, outputPath) {
    const sizesBefore = await (
      this.options.getPreviousSizes || this.getPreviousSizes
    ).call(this, outputPath);
    const sizes = await (this.options.getSizes || this.getSizes).call(
      this,
      assets
    );
    const files = await (this.options.getDiff || this.getDiff).call(
      this,
      sizesBefore,
      sizes
    );
    const output = await (this.options.printSizes || this.printSizes).call(
      this,
      files
    );
    await (this.options.uploadSizes || this.uploadSizes).call(this, files);
    return output;
  }
}
module.exports = SizePluginCore;


/**
 * @name Item
 * @typedef Item
 * @property {string} name Filename of the item
 * @property {number} sizeBefore Previous size, in kilobytes
 * @property {number} size Current size, in kilobytes
 * @property {string} sizeText Formatted current size
 * @property {number} delta Difference from previous size, in kilobytes
 * @property {string} deltaText Formatted size delta
 * @property {string} msg Full item's default message
 * @property {string} color The item's default CLI color
 * @public
 */

/**
 * @name Data
 * @typedef Data
 * @property {Item[]} sizes List of file size items
 * @property {string} output Current buffered output
 * @public
 */
