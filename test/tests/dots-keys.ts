import { N9Log } from '@neo9/n9-node-log';
import test, { Assertions } from 'ava';
import * as mongodb from 'mongodb';

import { MongoClient, MongoUtils } from '../../src';
import { BaseMongoObject } from '../../src/models';

class SampleType extends BaseMongoObject {
	public 'a.key.with.dots': number;
}

global.log = new N9Log('tests').module('dots-keys');

test.before(async () => {
	await MongoUtils.connect('mongodb://localhost:27017/test-n9-mongo-client');
});

test.after(async () => {
	global.log.info(`DROP DB after tests OK`);
	await (global.db as mongodb.Db).dropDatabase();
	await MongoUtils.disconnect();
});

test('[DOTS-KEYS] Insert one with dots and find it', async (t: Assertions) => {
	const mongoClient = new MongoClient('test-' + Date.now(), SampleType, SampleType);
	const size = await mongoClient.count();

	t.true(size === 0, 'collection should be empty');

	const intValue = 41;
	const aKeyWithDots: keyof SampleType = 'a.key.with.dots';
	const newEntity: SampleType = {
		[aKeyWithDots]: intValue,
	};
	await mongoClient.insertOne(newEntity, 'userId1');

	const sizeWithElementIn = await mongoClient.count();
	const query = { [MongoUtils.escapeSpecialCharacters(aKeyWithDots)]: intValue };
	const foundObject = await mongoClient.findOne(query);
	t.truthy(foundObject, 'found by query');
	t.is(sizeWithElementIn, 1, 'nb element in collection');

	t.is(foundObject['a.key.with.dots'], intValue, 'key is converted back to commons characters on read');
	t.is(typeof foundObject._id, 'string', 'ID is a string and not ObjectID');
	t.is(foundObject._id.constructor, String, 'ID is a string and not ObjectID');

	const foundObjectById = await mongoClient.findOneById(foundObject._id);
	t.truthy(foundObjectById, 'found by ID');
	t.is(foundObjectById['a.key.with.dots'], intValue, 'key is converted back to commons characters on read');

	const foundObjectByKey = await mongoClient.findOneByKey(intValue, aKeyWithDots);
	t.truthy(foundObjectByKey, 'found by key');
	t.is(foundObjectByKey['a.key.with.dots'], intValue, 'key is converted back to commons characters on read');

	const foundAll = await (await mongoClient.find({})).toArray();
	t.truthy(foundAll, 'found by key');
	t.is(foundAll.length, 1, 'found by key');
	t.is(foundAll[0]['a.key.with.dots'], intValue, 'key is converted back to commons characters on read');

	await mongoClient.dropCollection();
});

test('[DOTS-KEYS] Insert&update and check historic', async (t: Assertions) => {
	const mongoClient = new MongoClient('test-' + Date.now(), SampleType, SampleType, {
		keepHistoric: true,
	});

	const intValue = 41;
	const aKeyWithDots: keyof SampleType = 'a.key.with.dots';
	const newEntity: SampleType = {
		[aKeyWithDots]: intValue,
	};
	const insertedValue = await mongoClient.insertOne(newEntity, 'userId1');
	const updatedValue = await mongoClient.findOneAndUpdateByKey(intValue, {
		$set: {
			[MongoUtils.escapeSpecialCharacters(aKeyWithDots)]: 42,
		},
	}, 'userId', aKeyWithDots);

	t.is(insertedValue[aKeyWithDots], 41, 'inserted key === ' + intValue);
	t.is(updatedValue[aKeyWithDots], 42, 'updated value is 42');

	const historicValue = await mongoClient.findOneHistoricByUserIdMostRecent(insertedValue._id, 'userId');

	t.deepEqual(JSON.parse(JSON.stringify(historicValue.snapshot)), JSON.parse(JSON.stringify(insertedValue)), 'snapshot is equal to inserted value');
});

test('[DOTS-KEYS] Insert many with dots and find it', async (t: Assertions) => {
	const mongoClient = new MongoClient('test-' + Date.now(), SampleType, SampleType);
	const size = await mongoClient.count();

	t.true(size === 0, 'collection should be empty');

	const intValue = 41;
	const aKeyWithDots: keyof SampleType = 'a.key.with.dots';
	const newEntity: SampleType = {
		[aKeyWithDots]: intValue,
	};
	await mongoClient.insertMany([newEntity, newEntity], 'userId1');

	const sizeWithElementIn = await mongoClient.count();
	t.is(sizeWithElementIn, 2, 'nb element in collection');

	const query = { [MongoUtils.escapeSpecialCharacters(aKeyWithDots)]: intValue };
	const foundObject = await mongoClient.findOne(query);
	t.truthy(foundObject, 'found by query');

	t.is(foundObject['a.key.with.dots'], intValue, 'key is converted back to commons characters on read');
});
