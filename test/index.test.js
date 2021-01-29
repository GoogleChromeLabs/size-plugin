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
import fs from 'fs-extra';
import { compile } from './_helpers';
import SizePlugin from '../src';

function withSizePlugin (config) {
	config.plugins.push(new SizePlugin());
}

async function clearDist () {
	await fs.remove(path.resolve(__dirname, 'fixtures/basic/dist'));
	await fs.remove(path.resolve(__dirname, 'fixtures/splits/dist'));
	await fs.remove(path.resolve(process.cwd(), 'size-plugin.json'));
}

beforeAll(clearDist);
afterAll(clearDist);

const consoleLog = jest.spyOn(console, 'log');
beforeEach(() => {
	consoleLog.mockReset();
});

afterAll(() => {
	consoleLog.mockRestore();
});

describe('size-plugin', () => {
	it('should display the size of a single bundle file', async () => {
		const info = await compile('fixtures/basic/index.js', withSizePlugin);
		expect(info.assets).toHaveLength(1);

		expect(consoleLog).toHaveBeenCalled();

		expect(consoleLog.mock.calls[0][0]).toMatchSnapshot();
	});

	it('should display the size of a multiple output files', async () => {
		const info = await compile('fixtures/splits/index.js', withSizePlugin);
		expect(info.assets).toHaveLength(3);

		expect(consoleLog).toHaveBeenCalled();

		expect(consoleLog.mock.calls[0][0]).toMatchSnapshot();
	});

	it('should show size deltas for subsequent builds', async () => {
		const info = await compile('fixtures/splits/index-alt.js', withSizePlugin);
		expect(info.assets).toHaveLength(3);

		expect(consoleLog).toHaveBeenCalled();

		expect(consoleLog.mock.calls[0][0]).toMatchSnapshot();
	});

	it('should respect output.filename / output.chunkFilename', async () => {
		await clearDist();

		const info = await compile('fixtures/splits/index.js', config => {
			withSizePlugin(config);
			config.output.filename = 'js-[name].[contenthash].js';
			delete config.output.chunkFilename;
		});
		expect(info.assets).toHaveLength(3);

		expect(consoleLog).toHaveBeenCalled();

		expect(consoleLog.mock.calls[0][0]).toMatch(/js-2\.\*{20}\.js/);

		expect(consoleLog.mock.calls[0][0]).toMatchSnapshot();
	});
});
