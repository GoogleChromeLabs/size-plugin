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

import path from 'path';
import fs from 'fs';
import promisify from 'util.promisify';
import globPromise from 'glob';
import minimatch from 'minimatch';
import gzipSize from 'gzip-size';
import chalk from 'chalk';
import prettyBytes from 'pretty-bytes';
import escapeRegExp from 'escape-string-regexp';
import { toMap, dedupe } from './util.mjs';

const glob = promisify(globPromise);

const NAME = 'SizePlugin';

export default class SizePlugin {
	constructor (options) {
		this.options = options || {};
		this.pattern = this.options.pattern || '**/*.{mjs,js,css,html}';
		this.exclude = this.options.exclude;
		this.history = this.options.history;
		this.historyPath = path.resolve(process.cwd(), this.options.filename || 'build-sizes.json');
		this.buildTimestamp = Math.floor(Date.now());
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
		const reg = template.replace(/(^|.+?)(?:\[([a-z]+)(?::(\d))?\]|$)/g, (s, before, type, size) => {
			let out = '';
			if (before) {
				out += `(${escapeRegExp(before)})`;
				replace[count++] = false;
			}
			if (type==='hash' || type==='contenthash' || type==='chunkhash') {
				const len = Math.round(size) || hashLength;
				out += `([0-9a-zA-Z]{${len}})`;
				replace[count++] = true;
			}
			else if (type) {
				out += '(.*?)';
				replace[count++] = false;
			}
			return out;
		});
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
		const outputPath = compiler.options.output.path;
		this.output = compiler.options.output;
		this.sizes = this.getSizes(outputPath);
		// for webpack version > 4
		if (compiler.hooks && compiler.hooks.afterEmit) {
			return compiler.hooks.afterEmit.tapPromise(NAME, compilation =>
				this.outputSizes(compilation.assets).catch(console.error)
			);
		}
		// for webpack version < 3
		return compiler.plugin('after-emit', (compilation, callback) => {
			this.outputSizes(compilation.assets)
				.catch(console.error)
				.then(callback);
		});
	}

	async writeFile (file, data) {
		return new Promise((resolve, reject) => {
			fs.writeFile(file, data, error => {
				if (error) reject(error);
				resolve();
			});
		});
	}

	async readFile (file) {
		return new Promise((resolve, reject) => {
			fs.readFile(file, (error, data) => {
				if (error && error.code !== 'ENOENT') reject(error);
				resolve(data);
			});
		});
	}

	async storeToFile (buildResult) {
		try {
			const fileContents = await this.readFile(this.historyPath);
			let json = {};
			if (fileContents) {
				json = JSON.parse(fileContents);
			}
			json[this.buildTimestamp] = buildResult[this.buildTimestamp];
			await this.writeFile(this.historyPath, JSON.stringify(json));
			console.log(chalk.green(`file got stored at: ${this.historyPath}`));
		}
		catch (e) {
			console.error(chalk.green(`Couldn't store history: ${e}`));
		}
	}

	async outputSizes (assets) {
		// map of filenames to their previous size
		// Fix #7 - fast-async doesn't allow non-promise values.
		const sizesBefore = await Promise.resolve(this.sizes);
		const isMatched = minimatch.filter(this.pattern);
		const isExcluded = this.exclude ? minimatch.filter(this.exclude) : () => false;
		const assetNames = Object.keys(assets).filter(file => isMatched(file) && !isExcluded(file));
		const sizes = await Promise.all(assetNames.map(name => gzipSize(assets[name].source())));
		
		// map of de-hashed filenames to their final size
		this.sizes = toMap(assetNames.map(filename => this.stripHash(filename)), sizes);

		// get a list of unique filenames
		const files = Object.keys(this.sizes).filter(dedupe);

		const width = Math.max(...files.map(file => file.length));
		let output = '';
		
		let jsonOutput = {};
		jsonOutput[this.buildTimestamp] = {};

		for (const name of files) {
			const size = this.sizes[name] || 0;
			const delta = size - (sizesBefore[name] || 0);
			const msg = `${new Array(width - name.length + 2).join(' ')}${name} ⏤  `;
			const color = size > 100 * 1024 ? 'red' : size > 40 * 1024 ? 'yellow' : size > 20 * 1024 ? 'cyan' : 'green';
			
			jsonOutput[this.buildTimestamp][name] = size;

			let sizeText = chalk[color](prettyBytes(size));
			if (delta) {
				let deltaText = (delta > 0 ? '+' : '') + prettyBytes(delta);
				if (delta > 1024) {
					sizeText = chalk.bold(sizeText);
					deltaText = chalk.red(deltaText);
				}
				else if (delta < -10) {
					deltaText = chalk.green(deltaText);
				}
				sizeText += ` (${deltaText})`;
			}
			output += msg + sizeText + '\n';
		}
		if (output) {
			if (this.history){
				this.storeToFile(jsonOutput);
			}
			console.log(output);
		}
	}

	async getSizes (cwd) {
		const files = await glob(this.pattern, { cwd, ignore: this.exclude });

		const sizes = await Promise.all(files.map(
			file => gzipSize.file(path.join(cwd, file)).catch(() => null)
		));

		return toMap(files.map(filename => this.stripHash(filename)), sizes);
	}
}
