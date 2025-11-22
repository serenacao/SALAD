---
timestamp: 'Sat Nov 22 2025 15:45:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_154555.c20b1d6e.md]]'
content_id: 224c0c7c1a84c41a6943cdf35396d4dc1994a34b1618239feec98d3a172668d4
---

# response:

Okay, here are the tests for the `Friending` concept, covering the specified actions and principle.

These tests assume you have a `test_utils.ts` or similar setup that provides `setupDb()` and `teardownDb()` functions to manage a clean database instance for each test run. The `setupDb()` function should return a `Db` instance and `teardownDb()` should clean it up.

```typescript
// file: src/concepts/Friending/FriendingConcept.test.ts
import {
  assert,
  assertEquals,
  assertFalse,
  assertNotEquals,
  assertRejects,
  assertStrictEquals,
  assertThrows,
  fail,
} from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Collection, Db, MongoClient } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is part of database utils
import FriendingConcept from "./FriendingConcept.ts";

// --- Mocking/Testing Setup ---
// In a real project, you'd likely have a shared test utility.
// For this example, we'll simulate a fresh database for each test.
let client: MongoClient;
let db: Db;

// Helper to get a clean database for each test
async function setupTestDb(): Promise<Db> {
  const mongoUri = Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017";
  client = new MongoClient(mongoUri);
  await client.connect();
  const testDbName = `test-db-friending-${freshID()}`; // Unique DB for each run
  db = client.db(testDbName);
  return db;
}

// Helper to clean up the database after each test
async function teardownTestDb(): Promise<void> {
  if (db) {
    await db.dropDatabase();
  }
  if (client) {
    await client.close();
  }
}

// --- Test Data ---
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;

Deno.test("FriendingConcept", async (t) => {
  let concept: FriendingConcept;

  t.beforeEach(async () => {
    db = await setupTestDb();
    concept = new FriendingConcept(db);
  });

  t.afterEach(async () => {
    await teardownTestDb();
  });

  await t.step("requestFriend should create a pending friend request", async () => {
    const result = await concept.requestFriend({
      requester: userAlice,
      receiver: userBob,
    });
    assert("request" in result, "Expected request ID in result");

    const requests = await concept.friendRequests.find({
      requester: userAlice,
      receiver: userBob,
    }).toArray();
    assertEquals(requests.length, 1);
    assertEquals(requests[0].accepted, false);
    assertEquals(requests[0]._id, result.request);
  });

  await t.step("requestFriend should prevent sending request to self", async () => {
    const result = await concept.requestFriend({
      requester: userAlice,
      receiver: userAlice,
    });
    assert("error" in result, "Expected an error");
    assertEquals(result.error, "Cannot send a friend request to yourself.");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0); // No request should be created
  });

  await t.step("requestFriend should prevent duplicate pending requests", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    const result = await concept.requestFriend({
      requester: userAlice,
      receiver: userBob,
    });
    assert("error" in result, "Expected an error for duplicate request");
    assertEquals(result.error, "A pending friend request already exists.");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 1); // Only one request should exist
  });

  await t.step("requestFriend should prevent request if inverse pending request exists", async () => {
    await concept.requestFriend({ requester: userBob, receiver: userAlice }); // Bob requests Alice
    const result = await concept.requestFriend({
      requester: userAlice,
      receiver: userBob,
    }); // Alice tries to request Bob
    assert("error" in result, "Expected an error for inverse pending request");
    assertEquals(result.error, "A pending friend request already exists.");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 1); // Only one request should exist
  });

  await t.step("requestFriend should prevent requesting already existing friends", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    await concept.acceptFriend({ user: userBob, requester: userAlice });

    const result = await concept.requestFriend({
      requester: userAlice,
      receiver: userBob,
    });
    assert("error" in result, "Expected an error for existing friendship");
    assertEquals(result.error, "Users are already friends.");

    const requests = await concept.friendRequests.find({ accepted: true }).toArray();
    assertEquals(requests.length, 1);
  });

  await t.step("acceptFriend should mark a pending request as accepted", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    const acceptResult = await concept.acceptFriend({
      user: userBob,
      requester: userAlice,
    });
    assertEquals(acceptResult, {}, "Expected empty success result");

    const requests = await concept.friendRequests.find({
      requester: userAlice,
      receiver: userBob,
    }).toArray();
    assertEquals(requests.length, 1);
    assertEquals(requests[0].accepted, true);
  });

  await t.step("acceptFriend should fail if no pending request exists", async () => {
    const acceptResult = await concept.acceptFriend({
      user: userBob,
      requester: userAlice,
    });
    assert("error" in acceptResult, "Expected an error");
    assertEquals(
      acceptResult.error,
      "No pending friend request found from requester to user.",
    );

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0);
  });

  await t.step("acceptFriend should fail if user is not the receiver", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    const acceptResult = await concept.acceptFriend({
      user: userAlice, // Alice tries to accept her own request
      requester: userBob, // Bob didn't request Alice
    });
    assert("error" in acceptResult, "Expected an error");
    assertEquals(
      acceptResult.error,
      "No pending friend request found from requester to user.",
    );

    const requests = await concept.friendRequests.find({ accepted: false }).toArray();
    assertEquals(requests.length, 1); // Request should still be pending
  });

  await t.step("removeFriend should remove an accepted friend relationship", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    await concept.acceptFriend({ user: userBob, requester: userAlice });

    const removeResult = await concept.removeFriend({
      user: userAlice,
      requester: userBob,
    });
    assertEquals(removeResult, {}, "Expected empty success result");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0);
  });

  await t.step("removeFriend should remove a pending friend request", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    const removeResult = await concept.removeFriend({
      user: userAlice,
      requester: userBob,
    });
    assertEquals(removeResult, {}, "Expected empty success result");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0);
  });

  await t.step("removeFriend should work if roles are swapped (user is receiver of request)", async () => {
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    await concept.acceptFriend({ user: userBob, requester: userAlice });

    // Bob (receiver) removes Alice (requester)
    const removeResult = await concept.removeFriend({
      user: userBob,
      requester: userAlice,
    });
    assertEquals(removeResult, {}, "Expected empty success result");

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0);
  });

  await t.step("removeFriend should fail if no request exists", async () => {
    const removeResult = await concept.removeFriend({
      user: userAlice,
      requester: userBob,
    });
    assert("error" in removeResult, "Expected an error");
    assertEquals(
      removeResult.error,
      "No friend request found between specified users.",
    );

    const requests = await concept.friendRequests.find({}).toArray();
    assertEquals(requests.length, 0);
  });

  await t.step("_getFriends should return accepted friends for a user", async () => {
    // Alice requests Bob (accepted)
    await concept.requestFriend({ requester: userAlice, receiver: userBob });
    await concept.acceptFriend({ user: userBob, requester: userAlice });

    // Charlie requests Alice (accepted)
    await concept.requestFriend({ requester: userCharlie, receiver: userAlice });
    await concept.acceptFriend({ user: userAlice, requester: userCharlie });

    // Alice requests David (pending)
    await concept.requestFriend({ requester: userAlice, receiver: userDavid });

    const friendsOfAlice = await concept._getFriends({ user: userAlice });
    assertEquals(friendsOfAlice.length, 1, "Expected one result object");
    assertEquals(friendsOfAlice[0].friends.length, 2, "Expected 2 friends for Alice");
    assert(friendsOfAlice[0].friends.includes(userBob), "Alice should be friends with Bob");
    assert(
      friendsOfAlice[0].friends.includes(userCharlie),
      "Alice should be friends with Charlie",
    );
    assertFalse(
      friendsOfAlice[0].friends.includes(userDavid),
      "Alice should NOT be friends with David (pending)",
    );

    const friendsOfBob = await concept._getFriends({ user: userBob });
    assertEquals(friendsOfBob[0].friends.length, 1);
    assertEquals(friendsOfBob[0].friends[0], userAlice);

    const friendsOfDavid = await concept._getFriends({ user: userDavid });
    assertEquals(friendsOfDavid[0].friends.length, 0); // No accepted friends for David
  });

  await t.step("_getFriends should return an empty array if no friends", async () => {
    const friendsOfAlice = await concept._getFriends({ user: userAlice });
    assertEquals(friendsOfAlice.length, 1);
    assertEquals(friendsOfAlice[0].friends.length, 0);
  });

  // --- Principle Test ---
  // "when a user friend requests another user and it is accepted,
  // then the users can issue challenges to each other;
  // when a user unfriends another user, they can’t issue challenges"
  // (This implies behavior with other concepts, but we can test the friend status changes)
  await t.step("Principle: Friendship lifecycle", async () => {
    // 1. Initial state: No friendship
    let aliceFriends = await concept._getFriends({ user: userAlice });
    assertEquals(aliceFriends[0].friends.length, 0);

    let bobFriends = await concept._getFriends({ user: userBob });
    assertEquals(bobFriends[0].friends.length, 0);

    // 2. Alice requests Bob
    const requestResult = await concept.requestFriend({
      requester: userAlice,
      receiver: userBob,
    });
    assert("request" in requestResult);

    // Still not friends
    aliceFriends = await concept._getFriends({ user: userAlice });
    assertEquals(aliceFriends[0].friends.length, 0);

    bobFriends = await concept._getFriends({ user: userBob });
    assertEquals(bobFriends[0].friends.length, 0);

    // 3. Bob accepts Alice's request
    const acceptResult = await concept.acceptFriend({
      user: userBob,
      requester: userAlice,
    });
    assertEquals(acceptResult, {});

    // Now they are friends
    aliceFriends = await concept._getFriends({ user: userAlice });
    assertEquals(aliceFriends[0].friends.length, 1);
    assert(aliceFriends[0].friends.includes(userBob));

    bobFriends = await concept._getFriends({ user: userBob });
    assertEquals(bobFriends[0].friends.length, 1);
    assert(bobFriends[0].friends.includes(userAlice));

    // 4. Alice unfriends Bob
    const removeResult = await concept.removeFriend({
      user: userAlice,
      requester: userBob,
    });
    assertEquals(removeResult, {});

    // They are no longer friends
    aliceFriends = await concept._getFriends({ user: userAlice });
    assertEquals(aliceFriends[0].friends.length, 0);

    bobFriends = await concept._getFriends({ user: userBob });
    assertEquals(bobFriends[0].friends.length, 0);
  });
});
```
