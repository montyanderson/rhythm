const Koa = require('koa');
const Router = require('@koa/router');
const Redis = require('ioredis');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

const redis = new Redis({
	host: 'redis'
});

const timeout = 5; // seconds
const resultExpire = 86400; // one day

async function push(id, params) {
	console.log('push', {id, params});

	await redis.multi()
		.zadd('jobs', Date.now(), id)
		.set(`params:${id}`, JSON.stringify(params))
		.exec();
}

async function get() {
	//console.log('get');

	return await redis.zrangebyscore('jobs', '-inf', '+inf', 'LIMIT', 0, 100);
}

async function lock(id) {
	//console.log('lock', {id});

	const success = await redis.set(`lock:${id}`, 'true', 'EX', timeout, 'NX') == 'OK';

	//console.log(`lock -> ${success}`);

	return success;
}

async function poll(id) {
	//console.log('poll', {id})

	await redis.set(`lock:${id}`, timeout);
}

async function complete(id, result) {
	console.log('complete', {id, result});

	await redis.multi()
		.zrem('jobs', id)
		.del(`params:${id}`)
		.set(`result:${id}`, JSON.stringify(result), 'EX', resultExpire)
		.exec();
}

async function query() {

}

router.post('/push', async ctx => {
	const {id, params} = ctx.request.body;

	await push(id, params);

	ctx.body = '';
});

router.post('/job', async ctx => {
	const jobs = await get();

	for(const job of jobs) {
		console.log(job);

		if(await lock(job) === true) {
			ctx.body = JSON.stringify({
				id: job,
				params: JSON.parse(await redis.get(`params:${job}`))
			});

			return;
		}
	}

	throw new Error('No jobs!');
});

router.post('/poll', async ctx => {
	const {id} = ctx.request.body;

	await poll(id);

	ctx.body = '';
});

router.post('/resolve', async ctx => {
	const {id, value} = ctx.request.body;

	await complete(id, {
		type: 'resolve',
		value
	});

	ctx.body = '';
});

router.post('/reject', async ctx => {
	const {id, error} = ctx.request.body;

	await complete(id, {
		type: 'reject',
		error
	});

	ctx.body = '';
});

app
	.use(bodyParser())
	.use(router.routes())
	.use(router.allowedMethods());

app.listen(80, '0.0.0.0');

console.log("factory-server has started");
