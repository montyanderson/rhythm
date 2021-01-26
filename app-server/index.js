const crypto = require('crypto');
const axios = require('axios');

async function pushJob() {
	const id = crypto.randomBytes(32).toString('base64');

	await axios.post('http://factory-server/push', {
		id,
		params: {
			a: Math.floor(Math.random() * 100),
			b: Math.floor(Math.random() * 100)
		}
	});
}

(async () => {
	while(true) {
		await pushJob();

		await new Promise(r => setTimeout(r, 2500));
	}

})();

console.log('app-server is running');
