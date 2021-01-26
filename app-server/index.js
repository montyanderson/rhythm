const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const AWS = require('aws-sdk');
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

async function pushJob() {
	const id = crypto.randomBytes(32).toString('hex');
    const filename = `${id}.mp3`;

    const uploadParams = {
        Bucket: config.gateway.bucket,
        Key: filename,
        Body: fs.createReadStream('track.mp3')
    };

    console.log('uploading');

    await gateway.upload(uploadParams).promise();

    console.log('uploaded');

	await axios.post('http://factory-server/push', {
		id,
		params: {
            filename,
            output: id
		}
	});
}

(async () => {
	await pushJob();
})();

console.log('app-server is running');
