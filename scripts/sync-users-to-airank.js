/**
 * One-time migration script to sync existing users to airank.users
 *
 * This script finds all members in airank.members that don't have a
 * corresponding user in airank.users, looks up the user in outrun.users,
 * and creates the user record in airank.users.
 *
 * Run with: node scripts/sync-users-to-airank.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI;
const mongoParams = process.env.MONGODB_PARAMS;

async function syncUsersToAirank() {
  console.log('Connecting to MongoDB...');

  // Connect to both databases
  const airankUri = `${mongoUri}/airank?${mongoParams}`;
  const outrunUri = `${mongoUri}/outrun?${mongoParams}`;

  const airankDb = mongoose.createConnection(airankUri);
  const outrunDb = mongoose.createConnection(outrunUri);

  await Promise.all([airankDb.asPromise(), outrunDb.asPromise()]);
  console.log('Connected to airank and outrun databases');

  const airankMembers = airankDb.collection('members');
  const airankUsers = airankDb.collection('users');
  const outrunUsers = outrunDb.collection('users');

  // Get all unique userIds from members
  const memberUserIds = await airankMembers.distinct('userId');
  console.log(`Found ${memberUserIds.length} unique userIds in members collection`);

  // Find which users are missing in airank.users
  const existingAirankUsers = await airankUsers.find({ _id: { $in: memberUserIds } }).toArray();
  const existingAirankUserIds = new Set(existingAirankUsers.map(u => u._id));

  const missingUserIds = memberUserIds.filter(id => !existingAirankUserIds.has(id));
  console.log(`Found ${missingUserIds.length} users missing from airank.users`);

  if (missingUserIds.length === 0) {
    console.log('All users are already synced!');
    await Promise.all([airankDb.close(), outrunDb.close()]);
    return;
  }

  // Look up missing users in outrun.users
  const outrunUserDocs = await outrunUsers.find({ _id: { $in: missingUserIds } }).toArray();
  console.log(`Found ${outrunUserDocs.length} users in outrun.users to sync`);

  // Create user records in airank.users
  let synced = 0;
  let notFound = 0;

  for (const userId of missingUserIds) {
    const outrunUser = outrunUserDocs.find(u => u._id === userId);

    if (outrunUser) {
      await airankUsers.insertOne({
        _id: outrunUser._id,
        email: outrunUser.email,
        name: outrunUser.name || null,
        createdAt: outrunUser.createdAt || new Date(),
        updatedAt: new Date()
      });
      console.log(`Synced user: ${outrunUser.email} (${outrunUser._id})`);
      synced++;
    } else {
      console.log(`WARNING: User ${userId} not found in outrun.users`);
      notFound++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total missing users: ${missingUserIds.length}`);
  console.log(`Synced: ${synced}`);
  console.log(`Not found in outrun: ${notFound}`);

  await Promise.all([airankDb.close(), outrunDb.close()]);
  console.log('Done!');
}

syncUsersToAirank().catch(console.error);
