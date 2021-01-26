const fs = require('fs');
const axios = require('axios');
const AWS = require('aws-sdk');
const execa = require('execa');
const config = require('./config.json');

const s3Config = {
    accessKeyId: config.gateway.accessKey,
    secretAccessKey: config.gateway.secretKey,
    endpoint: 'gateway.tardigradeshare.io',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
};

console.log(s3Config);

const gateway = new AWS.S3(s3Config);

async function work(id, params) {
	try {
		console.log('new work!', params);

		const url = gateway.getSignedUrl('getObject', {
			Bucket: config.gateway.bucket,
			Key: params.filename,
			Expires: 100
		});

		const response = await axios({
			url,
			responseType: 'stream'
		});

		const file = fs.createWriteStream(`${__dirname}/input.mp3`);

		response.data.pipe(file);

		await new Promise(r => file.once("finish", r));

		const proc = execa('spleeter', [
			'separate',
			'-p',
			'spleeter:2stems',
			'-o',
			'output',
			'input.mp3'
		]);

		proc.stdout.pipe(process.stdout);

		await proc;

		await gateway.putObject({
			Bucket: config.gateway.bucket,
			Key: `${params.output}/vocals.wav`,
			Body: fs.createReadStream(`${__dirname}/output/input/vocals.wav`)
		}).promise();

		await gateway.putObject({
			Bucket: config.gateway.bucket,
			Key: `${params.output}/accompaniment.wav`,
			Body: fs.createReadStream(`${__dirname}/output/input/accompaniment.wav`)
		}).promise();
	} catch(err) {
		console.log(err);

		throw err;
	}

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

console.log('factory-worker running');
