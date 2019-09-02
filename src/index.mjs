/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import escapeRegExp from 'escape-string-regexp';
import core from 'size-plugin-core';

const NAME = 'SizePlugin';

/**
 * `new SizePlugin(options)`
 * @param {Object} options
 * @param {string} [options.compression] compression method(gzip/brotli) to use, default: 'gzip'
 * @param {string} [options.pattern] minimatch pattern of files to track
 * @param {string} [options.exclude] minimatch pattern of files NOT to track
 * @param {string} [options.filename] file name to save filesizes to disk
 * @param {boolean} [options.publish] option to publish filesizes to size-plugin-store
 * @param {boolean} [options.writeFile] option to save filesizes to disk
 * @param {function} [options.stripHash] custom function to remove/normalize hashed filenames for comparison
 * @param {(item:Item)=>string?} [options.decorateItem] custom function to decorate items
 * @param {(data:Data)=>string?} [options.decorateAfter] custom function to decorate all output
 * @public
 */
export default class SizePlugin {
	constructor(options) {
		const pluginOptions=options||{};
		const coreOptions={ ...pluginOptions,stripHash: pluginOptions.stripHash||this.stripHash.bind(this) };
		const { outputSizes, options: _options } = core(coreOptions);
		this.options = _options;
		this.outputSizes = outputSizes;
	}

	reverseTemplate(filename, template) {
		// @todo - find a way to actually obtain values here.
		if (typeof template === 'function') {
			template = template({
				chunk: {
					name: 'main'
				}
			});
		}
		const hashLength = this.output.hashDigestLength;
		const replace = [];
		let count = 0;
		function replacer() {
			let out = '';
			for (let i = 1; i < arguments.length - 2; i++) {
				// eslint-disable-next-line prefer-spread,prefer-rest-params
				let value = arguments[i];
				if (replace[i - 1]) value = value.replace(/./g, '*');
				out += value;
			}
			return out;
		}
		const reg = template.replace(
			/(^|.+?)(?:\[([a-z]+)(?::(\d))?\]|$)/g,
			(s, before, type, size) => {
				let out = '';
				if (before) {
					out += `(${escapeRegExp(before)})`;
					replace[count++] = false;
				}
				if (type === 'hash' || type === 'contenthash' || type === 'chunkhash') {
					const len = Math.round(size) || hashLength;
					out += `([0-9a-zA-Z]{${len}})`;
					replace[count++] = true;
				}
				else if (type) {
					out += '(.*?)';
					replace[count++] = false;
				}
				return out;
			}
		);
		const matcher = new RegExp(`^${reg}$`);
		return matcher.test(filename) && filename.replace(matcher, replacer);
	}

	stripHash(filename) {
		return (
			this.reverseTemplate(filename, this.output.filename) ||
			this.reverseTemplate(filename, this.output.chunkFilename) ||
			filename
		);
	}

	async apply(compiler) {
		this.output = compiler.options.output;
		this.options.mode = compiler.options.mode;
		const outputPath = compiler.options.output.path;

		const afterEmit = (compilation, callback) => {
			const assets = Object.keys(compilation.assets).reduce((agg, key) => {
				agg[key] = {
					source: compilation.assets[key].source()
				};
				return agg;
			}, {});
			// assets => {'a.js':{source:'console.log(1)'}}

			this.outputSizes(assets, outputPath)
				.then(output => {
					if (output) {
						process.nextTick(() => {
							console.log('\n' + output);
						});
					}
				})
				.catch(console.error)
				.then(callback);
		};

		// for webpack version > 4
		if (compiler.hooks && compiler.hooks.emit) {
			compiler.hooks.emit.tapAsync(NAME, afterEmit);
		}
		else {
			// for webpack version < 3
			compiler.plugin('after-emit', afterEmit);
		}
	}
}

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
