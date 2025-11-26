import { assertEquals, assertNotEquals, assertArrayIncludes, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import FriendingConcept from "./FriendingConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

Deno.test("FriendingConcept", async (t) => {
  const [db, client] = await testDb();
  const friending = new FriendingConcept(db);

  // Define some user IDs for testing
  const aliceId: ID = freshID();
  const bobId: ID = freshID();
  const charlieId: ID = freshID();

  // Helper function to check if an array of objects contains a specific friend ID
  const containsFriend = (friends: { friend: ID }[], friendId: ID) =>
    friends.some((f) => f.friend === friendId);

  // Helper function to check if an array of objects contains a specific friendRequest ID
  const containsFriendRequest = (requests: { friendRequest: ID }[], requestId: ID) =>
    requests.some((r) => r.friendRequest === requestId);

  await t.step("requestFriend: Confirms requirements and effects", async (t) => {
    console.log("\n--- Testing requestFriend ---");

    await t.step("should successfully send a friend request", async () => {
      console.log("Action: Alice requests Bob");
      const requestResult = await friending.requestFriend({ requester: aliceId, receiver: bobId });
      console.log("Result:", requestResult);

      assertEquals((requestResult as { error: string }).error, undefined, "request should not return an error");
      const requestId = (requestResult as { request: ID }).request;
      assertNotEquals(requestId, undefined, "should return a request ID");

      // Verify effects: new FriendRequest exists with correct details
      const requestInfo = await friending._getRequestInfo({ friendRequest: requestId });
      console.log("Verifying request info:", requestInfo);
      assertEquals(requestInfo.length, 1, "should find exactly one request");
      assertObjectMatch(requestInfo[0], { requester: aliceId, receiver: bobId });

      // Verify state for Alice (sent pending)
      const aliceSentRequests = await friending._getSentFriendRequests({ user: aliceId });
      console.log("Alice's sent requests:", aliceSentRequests);
      assertEquals(aliceSentRequests.length, 1, "Alice should have 1 sent pending request");
      assertArrayIncludes(aliceSentRequests.map(r => r.friendRequest), [requestId], "Alice's sent request should match the created one");

      // Verify state for Bob (received pending)
      const bobReceivedRequests = await friending._getReceivedFriendRequests({ user: bobId });
      console.log("Bob's received requests:", bobReceivedRequests);
      assertEquals(bobReceivedRequests.length, 1, "Bob should have 1 received pending request");
      assertArrayIncludes(bobReceivedRequests.map(r => r.friendRequest), [requestId], "Bob's received request should match the created one");
    });

    await t.step("should fail to send a friend request to self", async () => {
      console.log("Action: Alice requests Alice");
      const requestResult = await friending.requestFriend({ requester: aliceId, receiver: aliceId });
      console.log("Result:", requestResult);
      assertEquals((requestResult as { error: string }).error, "Cannot send a friend request to yourself.", "should return an error for self-request");
    });

    await t.step("should fail if a pending request already exists (requester to receiver)", async () => {
      // Alice -> Bob request already exists from previous test
      console.log("Action: Alice requests Bob again (pending request exists)");
      const requestResult = await friending.requestFriend({ requester: aliceId, receiver: bobId });
      console.log("Result:", requestResult);
      assertEquals((requestResult as { error: string }).error, "A pending friend request already exists.", "should return an error for duplicate pending request");
    });

    await t.step("should fail if a pending request already exists (receiver to requester)", async () => {
      // Charlie requests Alice
      console.log("Action: Charlie requests Alice");
      await friending.requestFriend({ requester: charlieId, receiver: aliceId });

      console.log("Action: Alice requests Charlie (Charlie -> Alice pending exists)");
      const requestResult = await friending.requestFriend({ requester: aliceId, receiver: charlieId });
      console.log("Result:", requestResult);
      assertEquals((requestResult as { error: string }).error, "A pending friend request already exists.", "should return an error for reverse pending request");

      // Clean up Charlie -> Alice request for subsequent tests
      await friending.removeFriend({ user: charlieId, requester: aliceId });
    });

    await t.step("should fail if users are already friends", async () => {
      // Make Alice and Bob friends
      const aliceBobRequest = await friending.friendRequests.findOne({ requester: aliceId, receiver: bobId });
      if (aliceBobRequest) { // Ensure the previous request exists
        await friending.acceptFriend({ user: bobId, requester: aliceId });
        console.log("Prerequisite: Alice and Bob are now friends.");
      }

      console.log("Action: Alice requests Bob again (already friends)");
      const requestResult = await friending.requestFriend({ requester: aliceId, receiver: bobId });
      console.log("Result:", requestResult);
      assertEquals((requestResult as { error: string }).error, "Users are already friends.", "should return an error if already friends");
    });
  });

  await t.step("acceptFriend: Confirms requirements and effects", async (t) => {
    console.log("\n--- Testing acceptFriend ---");

    // Prerequisite: Alice requests Charlie (they are not friends yet, from previous tests)
    console.log("Prerequisite: Alice requests Charlie");
    const aliceCharlieReq = await friending.requestFriend({ requester: aliceId, receiver: charlieId });
    const aliceCharlieRequestId = (aliceCharlieReq as { request: ID }).request;
    assertNotEquals(aliceCharlieRequestId, undefined, "Prerequisite request should be successful");

    await t.step("should successfully accept a pending friend request", async () => {
      console.log("Action: Charlie accepts Alice's request");
      const acceptResult = await friending.acceptFriend({ user: charlieId, requester: aliceId });
      console.log("Result:", acceptResult);
      assertEquals((acceptResult as { error: string }).error, undefined, "accept should not return an error");

      // Verify effects: request accepted flag is true
      const acceptedRequestDoc = await friending.friendRequests.findOne({ _id: aliceCharlieRequestId });
      console.log("Verifying request document after acceptance:", acceptedRequestDoc);
      assertEquals(acceptedRequestDoc?.accepted, true, "request accepted flag should be true");

      // Verify state: Alice and Charlie are friends
      const aliceFriends = await friending._getFriends({ user: aliceId });
      const charlieFriends = await friending._getFriends({ user: charlieId });
      console.log("Alice's friends:", aliceFriends);
      console.log("Charlie's friends:", charlieFriends);
      assertArrayIncludes(aliceFriends.map(f => f.friend), [charlieId], "Alice should list Charlie as a friend");
      assertArrayIncludes(charlieFriends.map(f => f.friend), [aliceId], "Charlie should list Alice as a friend");

      // Verify state: no more pending requests for Charlie from Alice
      const charlieReceivedRequests = await friending._getReceivedFriendRequests({ user: charlieId });
      console.log("Charlie's received requests after acceptance:", charlieReceivedRequests);
      assertEquals(charlieReceivedRequests.length, 0, "Charlie should have no pending requests from Alice");
    });

    await t.step("should fail to accept a non-existent friend request", async () => {
      console.log("Action: Bob tries to accept a request from Charlie (no such request)");
      const acceptResult = await friending.acceptFriend({ user: bobId, requester: charlieId });
      console.log("Result:", acceptResult);
      assertEquals((acceptResult as { error: string }).error, "No pending friend request found from requester to user.", "should return an error for non-existent request");
    });

    await t.step("should fail to accept an already accepted friend request", async () => {
      // Alice and Charlie are already friends from previous test
      console.log("Action: Charlie tries to accept Alice's request again (already accepted)");
      const acceptResult = await friending.acceptFriend({ user: charlieId, requester: aliceId });
      console.log("Result:", acceptResult);
      assertEquals((acceptResult as { error: string }).error, "No pending friend request found from requester to user.", "should return an error for already accepted request");
    });

    await t.step("should fail if the user is not the receiver of the request", async () => {
      // Prerequisite: Bob requests Charlie
      console.log("Prerequisite: Bob requests Charlie");
      const bobCharlieReq = await friending.requestFriend({ requester: bobId, receiver: charlieId });
      const bobCharlieRequestId = (bobCharlieReq as { request: ID }).request;
      assertNotEquals(bobCharlieRequestId, undefined, "Prerequisite request should be successful");

      console.log("Action: Alice tries to accept Bob's request to Charlie (Alice is not receiver)");
      const acceptResult = await friending.acceptFriend({ user: aliceId, requester: bobId });
      console.log("Result:", acceptResult);
      assertEquals((acceptResult as { error: string }).error, "No pending friend request found from requester to user.", "should return an error if user is not the receiver");

      // Clean up Bob -> Charlie request
      await friending.removeFriend({ user: bobId, requester: charlieId });
    });
  });

  await t.step("removeFriend: Confirms requirements and effects", async (t) => {
    console.log("\n--- Testing removeFriend ---");

    // Prerequisite: Alice and Bob are friends from previous tests. Alice and Charlie are friends.
    // Prerequisite: Create a pending request: Bob requests Charlie
    console.log("Prerequisite: Bob requests Charlie");
    const bobCharlieReq = await friending.requestFriend({ requester: bobId, receiver: charlieId });
    const bobCharlieRequestId = (bobCharlieReq as { request: ID }).request;
    assertNotEquals(bobCharlieRequestId, undefined, "Prerequisite request should be successful");

    await t.step("should successfully remove an accepted friend relationship (by requester)", async () => {
      // Alice and Bob are friends
      console.log("Action: Alice removes Bob (Alice was requester)");
      const removeResult = await friending.removeFriend({ user: aliceId, requester: bobId });
      console.log("Result:", removeResult);
      assertEquals((removeResult as { error: string }).error, undefined, "remove should not return an error");

      // Verify effects: FriendRequest document is removed
      const removedDoc = await friending.friendRequests.findOne({
        $or: [{ requester: aliceId, receiver: bobId }, { requester: bobId, receiver: aliceId }],
      });
      console.log("Verifying document removal:", removedDoc);
      assertEquals(removedDoc, null, "FriendRequest document should be removed");

      // Verify state: Alice and Bob are no longer friends
      const aliceFriends = await friending._getFriends({ user: aliceId });
      const bobFriends = await friending._getFriends({ user: bobId });
      console.log("Alice's friends after removal:", aliceFriends);
      console.log("Bob's friends after removal:", bobFriends);
      assertEquals(containsFriend(aliceFriends, bobId), false, "Alice should no longer list Bob as a friend");
      assertEquals(containsFriend(bobFriends, aliceId), false, "Bob should no longer list Alice as a friend");
    });

    await t.step("should successfully remove an accepted friend relationship (by receiver)", async () => {
      // Alice and Charlie are friends
      console.log("Action: Charlie removes Alice (Charlie was receiver)");
      const removeResult = await friending.removeFriend({ user: charlieId, requester: aliceId });
      console.log("Result:", removeResult);
      assertEquals((removeResult as { error: string }).error, undefined, "remove should not return an error");

      // Verify effects: FriendRequest document is removed
      const removedDoc = await friending.friendRequests.findOne({
        $or: [{ requester: aliceId, receiver: charlieId }, { requester: charlieId, receiver: aliceId }],
      });
      console.log("Verifying document removal:", removedDoc);
      assertEquals(removedDoc, null, "FriendRequest document should be removed");

      // Verify state: Alice and Charlie are no longer friends
      const aliceFriends = await friending._getFriends({ user: aliceId });
      const charlieFriends = await friending._getFriends({ user: charlieId });
      console.log("Alice's friends after removal:", aliceFriends);
      console.log("Charlie's friends after removal:", charlieFriends);
      assertEquals(containsFriend(aliceFriends, charlieId), false, "Alice should no longer list Charlie as a friend");
      assertEquals(containsFriend(charlieFriends, aliceId), false, "Charlie should no longer list Alice as a friend");
    });

    await t.step("should successfully remove a pending friend request", async () => {
      // Bob -> Charlie request is pending
      console.log("Action: Bob removes Charlie (pending request)");
      const removeResult = await friending.removeFriend({ user: bobId, requester: charlieId });
      console.log("Result:", removeResult);
      assertEquals((removeResult as { error: string }).error, undefined, "remove should not return an error");

      // Verify effects: FriendRequest document is removed
      const removedDoc = await friending.friendRequests.findOne({ _id: bobCharlieRequestId });
      console.log("Verifying document removal:", removedDoc);
      assertEquals(removedDoc, null, "FriendRequest document should be removed");

      // Verify state: no pending requests from Bob to Charlie
      const bobSentRequests = await friending._getSentFriendRequests({ user: bobId });
      const charlieReceivedRequests = await friending._getReceivedFriendRequests({ user: charlieId });
      console.log("Bob's sent requests after removal:", bobSentRequests);
      console.log("Charlie's received requests after removal:", charlieReceivedRequests);
      assertEquals(containsFriendRequest(bobSentRequests, bobCharlieRequestId), false, "Bob should not have the sent pending request");
      assertEquals(containsFriendRequest(charlieReceivedRequests, bobCharlieRequestId), false, "Charlie should not have the received pending request");
    });

    await t.step("should fail to remove a non-existent friend relationship or request", async () => {
      console.log("Action: Alice tries to remove Charlie (no relationship exists)");
      const removeResult = await friending.removeFriend({ user: aliceId, requester: charlieId });
      console.log("Result:", removeResult);
      assertEquals((removeResult as { error: string }).error, "No friend request found between specified users.", "should return an error for non-existent relationship");
    });
  });

  await t.step("Principle: Full friending lifecycle trace", async (t) => {
    console.log("\n--- Principle Trace: Full Friending Lifecycle ---");

    // Reinitialize concept state for a clean trace
    await friending.friendRequests.deleteMany({});
    console.log("Cleaned up all previous friend requests for principle trace.");

    // Alice, Bob, Charlie are distinct users.
    // 1. Alice requests Bob
    console.log("\nTrace Step 1: Alice requests Bob");
    const aliceRequestsBob = await friending.requestFriend({ requester: aliceId, receiver: bobId });
    const aliceBobRequestId = (aliceRequestsBob as { request: ID }).request;
    assertNotEquals(aliceBobRequestId, undefined, "Alice's request to Bob should succeed.");
    console.log("Alice's request to Bob successful. Request ID:", aliceBobRequestId);

    // 2. Verify pending state
    console.log("Trace Step 2: Verifying pending state.");
    let aliceSent = await friending._getSentFriendRequests({ user: aliceId });
    let bobReceived = await friending._getReceivedFriendRequests({ user: bobId });
    assertEquals(aliceSent.length, 1, "Alice should have 1 sent request.");
    assertEquals(containsFriendRequest(aliceSent, aliceBobRequestId), true, "Alice's sent request to Bob is present.");
    assertEquals(bobReceived.length, 1, "Bob should have 1 received request.");
    assertEquals(containsFriendRequest(bobReceived, aliceBobRequestId), true, "Bob's received request from Alice is present.");
    let aliceFriends = await friending._getFriends({ user: aliceId });
    let bobFriends = await friending._getFriends({ user: bobId });
    assertEquals(aliceFriends.length, 0, "Alice should have no friends yet.");
    assertEquals(bobFriends.length, 0, "Bob should have no friends yet.");
    console.log("Pending state verified.");

    // 3. Bob accepts Alice's request
    console.log("\nTrace Step 3: Bob accepts Alice's request");
    const bobAcceptsAlice = await friending.acceptFriend({ user: bobId, requester: aliceId });
    assertEquals((bobAcceptsAlice as { error: string }).error, undefined, "Bob should successfully accept Alice's request.");
    console.log("Bob accepted Alice's request.");

    // 4. Verify friendship state
    console.log("Trace Step 4: Verifying friendship state.");
    aliceFriends = await friending._getFriends({ user: aliceId });
    bobFriends = await friending._getFriends({ user: bobId });
    assertEquals(aliceFriends.length, 1, "Alice should have 1 friend.");
    assertEquals(containsFriend(aliceFriends, bobId), true, "Alice should list Bob as a friend.");
    assertEquals(bobFriends.length, 1, "Bob should have 1 friend.");
    assertEquals(containsFriend(bobFriends, aliceId), true, "Bob should list Alice as a friend.");

    aliceSent = await friending._getSentFriendRequests({ user: aliceId });
    bobReceived = await friending._getReceivedFriendRequests({ user: bobId });
    assertEquals(aliceSent.length, 0, "Alice should have no pending sent requests.");
    assertEquals(bobReceived.length, 0, "Bob should have no pending received requests.");
    console.log("Friendship state verified: Alice and Bob are friends.");

    // 5. Alice requests Charlie
    console.log("\nTrace Step 5: Alice requests Charlie");
    const aliceRequestsCharlie = await friending.requestFriend({ requester: aliceId, receiver: charlieId });
    const aliceCharlieRequestId = (aliceRequestsCharlie as { request: ID }).request;
    assertNotEquals(aliceCharlieRequestId, undefined, "Alice's request to Charlie should succeed.");
    console.log("Alice's request to Charlie successful. Request ID:", aliceCharlieRequestId);

    // 6. Charlie accepts Alice's request
    console.log("\nTrace Step 6: Charlie accepts Alice's request");
    const charlieAcceptsAlice = await friending.acceptFriend({ user: charlieId, requester: aliceId });
    assertEquals((charlieAcceptsAlice as { error: string }).error, undefined, "Charlie should successfully accept Alice's request.");
    console.log("Charlie accepted Alice's request.");

    // 7. Verify Alice and Charlie are friends, and Alice and Bob are still friends
    console.log("Trace Step 7: Verifying all friendships.");
    aliceFriends = await friending._getFriends({ user: aliceId });
    let charlieFriends = await friending._getFriends({ user: charlieId });
    bobFriends = await friending._getFriends({ user: bobId });

    assertEquals(aliceFriends.length, 2, "Alice should have 2 friends.");
    assertEquals(containsFriend(aliceFriends, bobId), true, "Alice should still be friends with Bob.");
    assertEquals(containsFriend(aliceFriends, charlieId), true, "Alice should be friends with Charlie.");

    assertEquals(charlieFriends.length, 1, "Charlie should have 1 friend.");
    assertEquals(containsFriend(charlieFriends, aliceId), true, "Charlie should be friends with Alice.");

    assertEquals(bobFriends.length, 1, "Bob should have 1 friend.");
    assertEquals(containsFriend(bobFriends, aliceId), true, "Bob should still be friends with Alice.");
    console.log("All friendships verified.");

    // 8. Bob removes Alice
    console.log("\nTrace Step 8: Bob removes Alice");
    const bobRemovesAlice = await friending.removeFriend({ user: bobId, requester: aliceId });
    assertEquals((bobRemovesAlice as { error: string }).error, undefined, "Bob should successfully remove Alice.");
    console.log("Bob removed Alice.");

    // 9. Verify Alice and Bob are no longer friends, but Alice and Charlie are still friends
    console.log("Trace Step 9: Verifying friendships after removal.");
    aliceFriends = await friending._getFriends({ user: aliceId });
    bobFriends = await friending._getFriends({ user: bobId });
    charlieFriends = await friending._getFriends({ user: charlieId });

    assertEquals(aliceFriends.length, 1, "Alice should now have 1 friend.");
    assertEquals(containsFriend(aliceFriends, bobId), false, "Alice should no longer be friends with Bob.");
    assertEquals(containsFriend(aliceFriends, charlieId), true, "Alice should still be friends with Charlie.");

    assertEquals(bobFriends.length, 0, "Bob should have 0 friends.");
    assertEquals(containsFriend(bobFriends, aliceId), false, "Bob should no longer be friends with Alice.");

    assertEquals(charlieFriends.length, 1, "Charlie should still have 1 friend.");
    assertEquals(containsFriend(charlieFriends, aliceId), true, "Charlie should still be friends with Alice.");
    console.log("Friendships verified after removal.");

    // Alice also removes Charlie
    console.log("\nTrace Step 10: Alice removes Charlie (cleanup)");
    const aliceRemovesCharlie = await friending.removeFriend({ user: aliceId, requester: charlieId });
    assertEquals((aliceRemovesCharlie as { error: string }).error, undefined, "Alice should successfully remove Charlie.");

    aliceFriends = await friending._getFriends({ user: aliceId });
    charlieFriends = await friending._getFriends({ user: charlieId });
    assertEquals(aliceFriends.length, 0, "Alice should have 0 friends.");
    assertEquals(charlieFriends.length, 0, "Charlie should have 0 friends.");
    console.log("All friendships cleaned up.");
  });

  await client.close();
});
