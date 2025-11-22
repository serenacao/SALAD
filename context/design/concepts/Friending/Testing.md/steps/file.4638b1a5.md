---
timestamp: 'Sat Nov 22 2025 15:54:33 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_155433.71ff71df.md]]'
content_id: 4638b1a5ab0f638ba1e4bdb0535e53b6efa00b5bc2299a95c3e4650a664d4c78
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  // Define test users
  const aliceId = freshID() as ID;
  const bobId = freshID() as ID;
  const charlieId = freshID() as ID;

  console.log(
    "\n--- Friending Concept Test Trace ---",
  );

  await t.step("Action: requestFriend - successful request", async () => {
    console.log(
      "\n- Testing requestFriend: Alice requests Bob (successful case)",
    );

    const result = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: bobId,
    });

    console.log(`  Alice requests Bob: ${JSON.stringify(result)}`);
    assertEquals("request" in result, true, "Should return a request ID");

    const friendRequests = await friendingConcept.friendRequests.find({
      requester: aliceId,
      receiver: bobId,
    }).toArray();
    assertEquals(friendRequests.length, 1, "One pending request should exist");
    assertEquals(friendRequests[0].accepted, false, "Request should not be accepted yet");

    console.log("  Effect confirmed: One pending request from Alice to Bob exists.");
  });

  await t.step("Action: requestFriend - fail: requester and receiver are the same user", async () => {
    console.log(
      "\n- Testing requestFriend: Alice requests herself (failure case)",
    );

    const result = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: aliceId,
    });

    console.log(`  Alice requests Alice: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error for self-request");
    assertEquals(
      (result as { error: string }).error,
      "Cannot send a friend request to yourself.",
      "Error message should indicate self-request.",
    );
    console.log("  Requirement confirmed: Cannot send a friend request to oneself.");
  });

  await t.step("Action: requestFriend - fail: pending request already exists (same direction)", async () => {
    console.log(
      "\n- Testing requestFriend: Alice requests Bob again (failure case: pending request)",
    );

    const result = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: bobId,
    });

    console.log(`  Alice requests Bob again: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error if request already pending");
    assertEquals(
      (result as { error: string }).error,
      "A pending friend request already exists.",
      "Error message should indicate existing pending request.",
    );
    console.log("  Requirement confirmed: Cannot send a duplicate pending friend request.");
  });

  await t.step("Action: requestFriend - fail: pending request already exists (opposite direction)", async () => {
    console.log(
      "\n- Testing requestFriend: Charlie requests Alice, while Alice has pending request to Bob (failure case: pending request exists involving other users)",
    );

    // First, Charlie requests Alice
    await friendingConcept.requestFriend({ requester: charlieId, receiver: aliceId });
    console.log("  Charlie requested Alice (new pending request).");

    // Then, Alice tries to request Charlie (should fail as Charlie requested Alice)
    const result = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: charlieId,
    });

    console.log(`  Alice requests Charlie: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error if request already pending in opposite direction");
    assertEquals(
      (result as { error: string }).error,
      "A pending friend request already exists.",
      "Error message should indicate existing pending request (even if opposite).",
    );
    console.log("  Requirement confirmed: Cannot send a request if a pending request exists in the opposite direction.");
  });

  await t.step("Query: _getFriends - no friends initially", async () => {
    console.log("\n- Testing _getFriends: Alice has no friends yet.");
    const friendsOfAlice = await friendingConcept._getFriends({ user: aliceId });
    console.log(`  Friends of Alice: ${JSON.stringify(friendsOfAlice)}`);
    assertEquals(friendsOfAlice[0].friends.length, 0, "Alice should have no friends yet.");
    console.log("  Effect confirmed: Alice's friends list is empty.");
  });

  await t.step("Action: acceptFriend - successful acceptance", async () => {
    console.log("\n- Testing acceptFriend: Bob accepts Alice's request.");

    const result = await friendingConcept.acceptFriend({ user: bobId, requester: aliceId });

    console.log(`  Bob accepts Alice's request: ${JSON.stringify(result)}`);
    assertEquals("error" in result, false, "Acceptance should be successful");
    assertEquals(Object.keys(result).length, 0, "Should return an empty object for success");

    const acceptedRequest = await friendingConcept.friendRequests.findOne({
      requester: aliceId,
      receiver: bobId,
    });
    assertEquals(acceptedRequest?.accepted, true, "Request should now be accepted");
    console.log("  Effect confirmed: Request from Alice to Bob is now accepted.");
  });

  await t.step("Query: _getFriends - after acceptance", async () => {
    console.log("\n- Testing _getFriends: Alice and Bob are now friends.");
    const friendsOfAlice = await friendingConcept._getFriends({ user: aliceId });
    console.log(`  Friends of Alice: ${JSON.stringify(friendsOfAlice)}`);
    assertEquals(
      friendsOfAlice[0].friends.includes(bobId),
      true,
      "Bob should be in Alice's friends list.",
    );
    assertEquals(friendsOfAlice[0].friends.length, 1, "Alice should have one friend.");

    const friendsOfBob = await friendingConcept._getFriends({ user: bobId });
    console.log(`  Friends of Bob: ${JSON.stringify(friendsOfBob)}`);
    assertEquals(
      friendsOfBob[0].friends.includes(aliceId),
      true,
      "Alice should be in Bob's friends list.",
    );
    assertEquals(friendsOfBob[0].friends.length, 1, "Bob should have one friend.");

    console.log("  Effect confirmed: Alice and Bob now correctly appear in each other's friend lists.");
  });

  await t.step("Action: requestFriend - fail: users are already friends", async () => {
    console.log(
      "\n- Testing requestFriend: Alice requests Bob again (failure case: already friends)",
    );

    const result = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: bobId,
    });

    console.log(`  Alice requests Bob (already friends): ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error if users are already friends");
    assertEquals(
      (result as { error: string }).error,
      "Users are already friends.",
      "Error message should indicate existing friendship.",
    );
    console.log("  Requirement confirmed: Cannot send a request to an existing friend.");
  });

  await t.step("Action: acceptFriend - fail: no pending request", async () => {
    console.log(
      "\n- Testing acceptFriend: Charlie tries to accept a non-existent request from Bob (failure case)",
    );

    const result = await friendingConcept.acceptFriend({
      user: charlieId,
      requester: bobId,
    });

    console.log(`  Charlie accepts Bob: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error for non-existent request");
    assertEquals(
      (result as { error: string }).error,
      "No pending friend request found from requester to user.",
      "Error message should indicate no pending request.",
    );
    console.log("  Requirement confirmed: Cannot accept a non-existent friend request.");
  });

  await t.step("Action: acceptFriend - fail: already accepted request", async () => {
    console.log(
      "\n- Testing acceptFriend: Bob tries to accept Alice's request again (failure case: already accepted)",
    );

    const result = await friendingConcept.acceptFriend({
      user: bobId,
      requester: aliceId,
    });

    console.log(`  Bob accepts Alice again: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error for already accepted request");
    assertEquals(
      (result as { error: string }).error,
      "No pending friend request found from requester to user.", // The query implicitly checks accepted: false
      "Error message should indicate no *pending* request.",
    );
    console.log("  Requirement confirmed: Cannot accept an already accepted request.");
  });

  await t.step("Action: removeFriend - remove pending request", async () => {
    console.log("\n- Testing removeFriend: Alice removes Charlie's pending request.");

    const result = await friendingConcept.removeFriend({
      user: aliceId,
      requester: charlieId,
    });

    console.log(`  Alice removes Charlie's request: ${JSON.stringify(result)}`);
    assertEquals("error" in result, false, "Removal of pending request should be successful");
    assertEquals(Object.keys(result).length, 0, "Should return an empty object for success");

    const remainingRequests = await friendingConcept.friendRequests.find({
      $or: [{ requester: aliceId, receiver: charlieId }, { requester: charlieId, receiver: aliceId }],
    }).toArray();
    assertEquals(remainingRequests.length, 0, "Pending request from Charlie to Alice should be removed.");
    console.log("  Effect confirmed: Pending request between Alice and Charlie is removed.");
  });

  await t.step("Action: removeFriend - remove an accepted friendship", async () => {
    console.log("\n- Testing removeFriend: Alice unfriends Bob.");

    const result = await friendingConcept.removeFriend({
      user: aliceId,
      requester: bobId,
    });

    console.log(`  Alice unfriends Bob: ${JSON.stringify(result)}`);
    assertEquals("error" in result, false, "Removal of accepted friendship should be successful");
    assertEquals(Object.keys(result).length, 0, "Should return an empty object for success");

    const remainingFriendships = await friendingConcept.friendRequests.find({
      $or: [{ requester: aliceId, receiver: bobId }, { requester: bobId, receiver: aliceId }],
    }).toArray();
    assertEquals(remainingFriendships.length, 0, "Friendship between Alice and Bob should be removed.");
    console.log("  Effect confirmed: Friendship between Alice and Bob is removed.");
  });

  await t.step("Query: _getFriends - after removal", async () => {
    console.log("\n- Testing _getFriends: Alice and Bob are no longer friends.");
    const friendsOfAlice = await friendingConcept._getFriends({ user: aliceId });
    console.log(`  Friends of Alice: ${JSON.stringify(friendsOfAlice)}`);
    assertEquals(friendsOfAlice[0].friends.length, 0, "Alice should have no friends after unfriend.");

    const friendsOfBob = await friendingConcept._getFriends({ user: bobId });
    console.log(`  Friends of Bob: ${JSON.stringify(friendsOfBob)}`);
    assertEquals(friendsOfBob[0].friends.length, 0, "Bob should have no friends after unfriend.");
    console.log("  Effect confirmed: Alice and Bob's friend lists are empty.");
  });

  await t.step("Action: removeFriend - fail: no request/friendship exists", async () => {
    console.log(
      "\n- Testing removeFriend: Alice tries to unfriend Charlie (no existing relationship)",
    );

    const result = await friendingConcept.removeFriend({
      user: aliceId,
      requester: charlieId,
    });

    console.log(`  Alice unfriends Charlie: ${JSON.stringify(result)}`);
    assertEquals("error" in result, true, "Should return an error if no relationship exists");
    assertEquals(
      (result as { error: string }).error,
      "No friend request found between specified users.",
      "Error message should indicate no relationship.",
    );
    console.log("  Requirement confirmed: Cannot remove a non-existent friend request or friendship.");
  });

  await t.step("Principle Test: User requests, accepts, then unfriends", async () => {
    console.log(
      "\n--- Principle Test: Alice and Bob's Friendship Lifecycle ---",
    );

    // Initial state: No friendship between Alice and Bob
    let friendsAlice = await friendingConcept._getFriends({ user: aliceId });
    assertEquals(friendsAlice[0].friends.length, 0, "Alice should have no friends initially.");
    console.log(`  Initial: Alice's friends: ${JSON.stringify(friendsAlice[0].friends)}`);

    // 1. Alice friend requests Bob
    const requestResult = await friendingConcept.requestFriend({
      requester: aliceId,
      receiver: bobId,
    });
    assertEquals("request" in requestResult, true, "Alice's request to Bob should succeed.");
    console.log(`  Alice requests Bob: ${JSON.stringify(requestResult)}`);

    // Verify they are not friends yet
    friendsAlice = await friendingConcept._getFriends({ user: aliceId });
    assertEquals(friendsAlice[0].friends.length, 0, "Alice should not be friends with Bob yet (pending).");
    console.log(`  After request: Alice's friends: ${JSON.stringify(friendsAlice[0].friends)}`);

    // 2. Bob accepts Alice's request
    const acceptResult = await friendingConcept.acceptFriend({
      user: bobId,
      requester: aliceId,
    });
    assertEquals("error" in acceptResult, false, "Bob's acceptance of Alice's request should succeed.");
    console.log(`  Bob accepts Alice's request: ${JSON.stringify(acceptResult)}`);

    // Verify they are now friends
    friendsAlice = await friendingConcept._getFriends({ user: aliceId });
    assertEquals(friendsAlice[0].friends.includes(bobId), true, "Alice should now be friends with Bob.");
    assertEquals(friendsAlice[0].friends.length, 1, "Alice should have one friend.");
    let friendsBob = await friendingConcept._getFriends({ user: bobId });
    assertEquals(friendsBob[0].friends.includes(aliceId), true, "Bob should now be friends with Alice.");
    console.log(`  After acceptance: Alice's friends: ${JSON.stringify(friendsAlice[0].friends)}`);
    console.log(`  After acceptance: Bob's friends: ${JSON.stringify(friendsBob[0].friends)}`);

    // "then the users can issue challenges to each other" - (This part would be handled by other concepts synchronized with Friending)
    console.log(
      "  Principle point: Alice and Bob are now friends, enabling mutual interactions (e.g., challenges).",
    );

    // 3. Alice unfriends Bob
    const unfriendResult = await friendingConcept.removeFriend({
      user: aliceId,
      requester: bobId,
    });
    assertEquals("error" in unfriendResult, false, "Alice unfriending Bob should succeed.");
    console.log(`  Alice unfriends Bob: ${JSON.stringify(unfriendResult)}`);

    // Verify they are no longer friends
    friendsAlice = await friendingConcept._getFriends({ user: aliceId });
    assertEquals(friendsAlice[0].friends.length, 0, "Alice should no longer be friends with Bob.");
    friendsBob = await friendingConcept._getFriends({ user: bobId });
    assertEquals(friendsBob[0].friends.length, 0, "Bob should no longer be friends with Alice.");
    console.log(`  After unfriend: Alice's friends: ${JSON.stringify(friendsAlice[0].friends)}`);
    console.log(`  After unfriend: Bob's friends: ${JSON.stringify(friendsBob[0].friends)}`);

    // "when a user unfriends another user, they can’t issue challenges" - (This part would be handled by other concepts)
    console.log(
      "  Principle point: Alice and Bob are no longer friends, disabling mutual interactions.",
    );
    console.log(
      "  Principle fully modeled: The full lifecycle of friendship from request to acceptance to removal is demonstrated.",
    );
  });

  await client.close();
});
```
