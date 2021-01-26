const axios = require('axios');

async function work(id, params) {
	await new Promise(r => setTimeout(r, 1000));

	return {
		c: params.a * params.b
	};
}

const factoryServer = 'http://factory-server';

async function get() {
	const {data} = await axios.post(`${factoryServer}/job`);

	return data;
}

async function poll(id) {
	await axios.post(`${factoryServer}/poll`, {
		id
	});
}

async function resolve(id, value) {
	await axios.post(`${factoryServer}/resolve`, {
		id,
		value
	});
}

async function reject(id, error) {
	await axios.post(`${factoryServer}/reject`, {
		id,
		error
	});
}


async function doWork() {
	await new Promise(r => setTimeout(r, 500));

	while(true) {
		let job;

		try {
			job = await get();
		} catch(err) {
			console.log('couldn\'t get jobs from server');
			await new Promise(r => setTimeout(r, 5000));

			continue;
		}

		console.log(`get() -> ${job}`);

		const promise = work(job.id, job.params);

		const interval = setInterval(async function() {
			await poll(job.id);
		}, 1000);

		let result, error;

		try {
			result = await promise;
		} catch(_error) {
			error = _error;
		}

		clearInterval(interval);

		if(error) {
			await reject(job.id, error);
		} else {
			await resolve(job.id, result);
		}
	}
}

doWork();
doWork();

console.log('factory-worker running');
