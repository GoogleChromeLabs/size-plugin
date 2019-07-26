import { repo, sha, event, branch, pull_request_number, ci } from 'ci-env';
import axios from 'axios';

const SIZE_STORE_ENDPOINT = process.env.SIZE_STORE_ENDPOINT || 'https://size-plugin-store.now.sh' ;

// TODO: add option to turn off publishing of sizes.

export async function publishDiff(diff,filename) {
	if (process.env.NODE_ENV !=='test' &&  ci && event == 'pull_request') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, diff,filename };
			await axios.post(`${SIZE_STORE_ENDPOINT}/diff`, params);
		}
		catch (error) {
			console.error('error: while publishing diff', error);
		}
	}
}
export async function publishSizes(size,filename) {
	// TODO: read allowed branch from configuration
	if (process.env.NODE_ENV !=='test' &&  ci && event == 'push' && branch==='master') {
		try {
			const params = { ci,repo, branch, sha, pull_request_number, size,filename };
			await axios.post(`${SIZE_STORE_ENDPOINT}/size`, params);
		}
		catch (error) {
			console.error('error: while publishing sizes', error);
		}
	}
}
