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

export function toMap(names, values) {
	return names.reduce((map, name, i) => {
		map[name] = values[i];
		return map;
	}, {});
}

export function dedupe(item, index, arr) {
	return arr.indexOf(item) === index;
}
export function toFileMap(files){
	return files.reduce((result, file) => {
		if (file.size){ // excluding files with size 0
			result[file.filename] = file.size;
		}
		return result;
	}, {});
}
