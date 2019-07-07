const { repo, sha, event, branch, pull_request_number, ci } = require('ci-env');
const axios = require('axios');
const url = 'https://size-plugin-store.now.sh/sizes';
async function publishSizes(diff) {
	console.log({repo, sha, event, branch, pull_request_number, ci })
	if (ci && event == 'pull_request') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, diff };
			await axios.post(url, params);
			console.log("yay, pushed the diff!!")
		}
		catch (error) {
			console.error('error: while publishing sizes', error);
		}
	}
}
module.exports = publishSizes;
