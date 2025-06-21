// /src/pages/api/v1/sources/[sourceId]/index.js

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_CONNECTION_STRING;
const client = new MongoClient(uri);

const handler = async (req, res) => {
  const start = new Date().getTime(); // Start time of the function
  const { method } = req;
  const { sourceId } = req.query;
  const bearer = req.headers.authorization?.split("Bearer ")[1];
  const payload = req.body;
  const requestingIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    await client.connect();

    const db = client.db('airank');
    const sourcesCollection = db.collection('sources');
    const source = await sourcesCollection.findOne({ _id: sourceId });

    if (method !== 'POST') {
      console.error('Error:', `${method} method unsupported`);
      const loggingObject = {
        type: 'error',
        id: sourceId,
        workspaceId: source.workspaceId,
        payload,
        responseCode: 405,
        responseMessage: `${method} method unsupported`,
        dateTime: new Date(),
        requestingIp,
        invocationTime: new Date().getTime() - start // Total milliseconds
      };
      const loggingCollection = client.db(`workspace_${source.workspaceId}`).collection('logging');
      await loggingCollection.insertOne(loggingObject);
      return res.status(405).json({ error: { msg: `${method} method unsupported` } });
    }

    if (!source || source.bearerToken !== bearer) {
      console.error('Error:', 'Bearer token does not match supplied sourceId');
      const loggingObject = {
        type: 'error',
        id: sourceId,
        workspaceId: source.workspaceId,
        payload,
        responseCode: 403,
        responseMessage: 'Bearer token does not match supplied sourceId',
        dateTime: new Date(),
        requestingIp,
        invocationTime: new Date().getTime() - start // Total milliseconds
      };
      const loggingCollection = client.db(`workspace_${source.workspaceId}`).collection('logging');
      await loggingCollection.insertOne(loggingObject);
      return res.status(403).json({ error: { msg: 'Bearer token does not match supplied sourceId' } });
    }

    if (!source.whitelistedIp.includes(requestingIp)) {
      console.error('Error:', 'This source does not allow use of that ip address');
      const loggingObject = {
        type: 'error',
        id: sourceId,
        workspaceId: source.workspaceId,
        payload,
        responseCode: 403,
        responseMessage: 'This source does not allow use of that ip address',
        dateTime: new Date(),
        requestingIp,
        invocationTime: new Date().getTime() - start // Total milliseconds
      };
      const loggingCollection = client.db(`workspace_${source.workspaceId}`).collection('logging');
      await loggingCollection.insertOne(loggingObject);
      return res.status(403).json({ error: { msg: 'This source does not allow use of that ip address' } });
    }

    const workspacedb = client.db(`workspace_${source.workspaceId}`);
    const workspaceSourceName = source.datalakeCollection;

    if (Array.isArray(payload)) {
      const matchingField = source.matchingField;
      const operations = payload.map(doc => ({
        replaceOne: {
          filter: matchingField ? { [matchingField]: doc[matchingField] } : {},
          replacement: doc,
          upsert: true
        }
      }));
      await workspacedb.collection(workspaceSourceName).bulkWrite(operations);
    } else {
      const matchingField = source.matchingField;
      const filter = matchingField ? { [matchingField]: payload[matchingField] } : {};
      await workspacedb.collection(workspaceSourceName).replaceOne(filter, payload, { upsert: true });
    }

    // Logging object
    const loggingObject = {
      type: 'source',
      id: sourceId,
      workspaceId: source.workspaceId,
      payload,
      responseCode: 200,
      responseMessage: 'Success',
      dateTime: new Date(),
      requestingIp,
      invocationTime: new Date().getTime() - start // Total milliseconds
    };

    // Write to logging table
    const loggingCollection = workspacedb.collection('logging');
    await loggingCollection.insertOne(loggingObject);

    res.status(200).json({ success: { msg: `Payload received` } });
  } catch (error) {
    console.error('Error:', error);
    const loggingObject = {
      type: 'error',
      id: sourceId,
      workspaceId: source.workspaceId,
      payload,
      responseCode: 500,
      responseMessage: 'Internal server error',
      dateTime: new Date(),
      requestingIp,
      invocationTime: new Date().getTime() - start // Total milliseconds
    };
    const loggingCollection = client.db('airank').collection('logging');
    await loggingCollection.insertOne(loggingObject);
    res.status(500).json({ errors: { error: { msg: 'Internal server error' } } });
  } finally {
    await client.close();
  }
};

export default handler;
