const { repo, sha, event, branch, pull_request_number, ci } = require('ci-env');
const axios = require('axios');
const url = 'https://size-plugin-store.now.sh';
async function publishDiff(diff) {
	if (ci && event == 'pull_request') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, diff };
			await axios.post(`${url}/diff`, params);
		}
		catch (error) {
			console.error('error: while publishing diff', error);
		}
	}
}
async function publishSizes(size) {
	// TODO: read allowed branch from configuration
	if (ci && event == 'push' && branch==='master') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, size };
			await axios.post(`${url}/size`, params);
		}
		catch (error) {
			console.error('error: while publishing sizes', error);
		}
	}
}
module.exports = { publishSizes,publishDiff };
