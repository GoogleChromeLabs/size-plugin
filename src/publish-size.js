const { repo, sha, event, branch, pull_request_number, ci } = require('ci-env');
const axios = require('axios');
const SIZE_STORE_ENDPOINT = process.env.SIZE_STORE_ENDPOINT || 'https://size-plugin-store.now.sh' ;

// TODO: add option to turn off publishing of sizes.

async function publishDiff(diff) {
	if (process.env.NODE_ENV !=='test' &&  ci && event == 'pull_request') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, diff };
			await axios.post(`${SIZE_STORE_ENDPOINT}/diff`, params);
		}
		catch (error) {
			console.error('error: while publishing diff', error);
		}
	}
}
async function publishSizes(size) {
	// TODO: read allowed branch from configuration
	if (process.env.NODE_ENV !=='test' &&  ci && event == 'push' && branch==='master') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, size };
			await axios.post(`${SIZE_STORE_ENDPOINT}/size`, params);
		}
		catch (error) {
			console.error('error: while publishing sizes', error);
		}
	}
}
module.exports = { publishSizes,publishDiff };
