import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { Collection, Db, MongoClient } from "npm:mongodb";
import {
  assertEquals,
  assertNotEquals,
  assertExists,
  assertFalse,
  assertArrayIncludes,
} from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ChatConcept from "./ChatConcept.ts";
import { assert } from "node:console";

// Define some consistent test user IDs for clarity
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;

Deno.test("Chat Concept", async (t) => {

  let db: Db;
  let client: MongoClient;
  let chatConcept: ChatConcept;

    [db, client] = await testDb();
    chatConcept = new ChatConcept(db);

  // Setup database and concept instance once for all tests in this file
  // The database is automatically dropped before this `Deno.test` block runs by `testDb`
  Deno.test.beforeAll(async () => {

  });

  // Close the database client after all tests in this file are done
  Deno.test.afterAll(async () => {
  });

  await t.step("should successfully start a chat between two distinct users", async () => {
    console.log("\n--- Test: startChat - Successful Chat Creation ---");
    // Ensure clean state for this specific test step
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Action: Alice starts a chat with Bob
    const result = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    console.log("  startChat result:", result);

    assertExists((result as { chat: ID }).chat, "Should return a chat ID on success.");
    const chatId = (result as { chat: ID }).chat;

    // Verify effects: a chat document exists, accessible by both
    const chatDoc = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDoc, "Chat document should exist in the database.");
    assertEquals(chatDoc.user1, userAlice, "Requester should be user1.");
    assertEquals(chatDoc.user2, userBob, "Receiver should be user2.");
    assertEquals(chatDoc.user1Accessible, true, "User1Accessible flag should be true.");
    assertEquals(chatDoc.user2Accessible, true, "User2Accessible flag should be true.");

    // Verify query: chat is retrievable by both users
    const retrievedChat = await chatConcept._getChatBetweenUsers({ userA: userAlice, userB: userBob });
    assertArrayIncludes(retrievedChat as Array<{ chat: ID }>, [{ chat: chatId }], "Chat should be found via query.");
    console.log("  Chat retrieved via _getChatBetweenUsers:", retrievedChat);

  });

  await t.step("should prevent starting a chat with oneself", async () => {
    console.log("\n--- Test: startChat - Prevent Chat with Self ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Action: Alice tries to start a chat with herself
    const result = await chatConcept.startChat({ requester: userAlice, receiver: userAlice });
    console.log("  startChat result (self chat):", result);

    // Verify requires: an error is returned
    assertExists((result as { error: string }).error, "Should return an error.");
    assertEquals((result as { error: string }).error, "Cannot start a chat with yourself", "Error message should match.");

    // Verify effects: no chat is created
    const noChats = await chatConcept.chats.find({
      $or: [{ user1: userAlice }, { user2: userAlice }],
    }).toArray();
    assertEquals(noChats.length, 0, "No chat should be created.");
  });

  await t.step("should prevent starting a chat if one already exists between the users", async () => {
    console.log("\n--- Test: startChat - Prevent Duplicate Chat ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-condition: Create an initial chat
    const initialChatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    assertExists((initialChatResult as { chat: ID }).chat);
    const existingChatId = (initialChatResult as { chat: ID }).chat;
    console.log("  Initial chat created with ID:", existingChatId);

    // Action: Alice tries to start another chat with Bob (same order)
    const resultDuplicate = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    console.log("  startChat result (duplicate, same order):", resultDuplicate);
    assertExists((resultDuplicate as { error: string }).error, "Should return an error for duplicate chat.");
    assertEquals((resultDuplicate as { error: string }).error, "Chat already exists between these users", "Error message should match.");

    // Action: Bob tries to start a chat with Alice (reversed order)
    const resultDuplicateReversed = await chatConcept.startChat({ requester: userBob, receiver: userAlice });
    console.log("  startChat result (duplicate, reversed order):", resultDuplicateReversed);
    assertExists((resultDuplicateReversed as { error: string }).error, "Should return an error for reversed duplicate chat.");
    assertEquals((resultDuplicateReversed as { error: string }).error, "Chat already exists between these users", "Error message should match.");
  });

  await t.step("should successfully send a message in an existing and accessible chat", async () => {
    console.log("\n--- Test: send - Successful Message Sending ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-condition: Create a chat
    const chatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatId = (chatResult as { chat: ID }).chat;
    assertExists(chatId, "Pre-existing chat should be created.");

    const messageContent = "Hello Bob, this is Alice!";
    // Action: Alice sends a message to Bob
    const dmResult = await chatConcept.send({ sender: userAlice, receiver: userBob, message: messageContent });
    console.log("  send result:", dmResult);

    assertExists((dmResult as { dm: ID }).dm, "Should return a DM ID on success.");
    const dmId = (dmResult as { dm: ID }).dm;

    // Verify effects: DM document exists with correct data
    const dmDoc = await chatConcept.dms.findOne({ _id: dmId });
    assertExists(dmDoc, "DM document should exist in the database.");
    assertEquals(dmDoc.chatId, chatId, "DM should be linked to the correct chat.");
    assertEquals(dmDoc.sender, userAlice, "Sender should be Alice.");
    assertEquals(dmDoc.receiver, userBob, "Receiver should be Bob.");
    assertEquals(dmDoc.message, messageContent, "Message content should match.");
    assertExists(dmDoc.time, "DM should have a timestamp.");

    // Verify query: DM is retrievable within the chat
    const dmsInChat = await chatConcept._getDMsInChat({ chat: chatId });
    assertNotEquals((dmsInChat as { error: string }).error, "Expected to retrieve DMs, got an error.");
    assertExists((dmsInChat as Array<{ dm: object }>)[0], "Should find at least one DM.");
    assertEquals(((dmsInChat as Array<{ dm: object }>)[0].dm as any).id, dmId, "Retrieved DM ID should match.");
    console.log("  DMs in chat via _getDMsInChat:", dmsInChat);
  });

  await t.step("should start chat and send a message if no chat exists between sender and receiver", async () => {
    console.log("\n--- Test: send - Prevent Message No Chat ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Action: Alice tries to send a message to Charlie, but no chat exists
    const dmResult = await chatConcept.send({ sender: userAlice, receiver: userCharlie, message: "Hey Charlie!" });
    console.log("  send result (no chat):", dmResult);

    // Verify requires: an error is returned
    assertEquals("dm" in dmResult, true, "should be no error" )
    if("dm" in dmResult){
        const dmDoc = await chatConcept.dms.findOne({ _id: dmResult.dm });
        assertExists(dmDoc, "DM document should exist in the database.");
        assertEquals(dmDoc.sender, userAlice, "Sender should be Alice.");
        assertEquals(dmDoc.receiver, userCharlie, "Receiver should be Bob.");
        assertEquals(dmDoc.message, "Hey Charlie!", "Message content should match.");
        assertExists(dmDoc.time, "DM should have a timestamp.");
    }



  });

  await t.step("should delete a chat for one user (making it inaccessible only for them)", async () => {
    console.log("\n--- Test: deleteChat - Delete for One User ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-condition: Create a chat and send a message
    const chatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatId = (chatResult as { chat: ID }).chat;
    assertExists(chatId);
    await chatConcept.send({ sender: userAlice, receiver: userBob, message: "Initial message before delete." });

    // Action: Alice deletes the chat for herself
    const deleteResult = await chatConcept.deleteChat({ chat: chatId, user: userAlice });
    console.log("  deleteChat result (Alice):", deleteResult);
    assertEquals(deleteResult, {}, "Should return an empty object on successful deletion.");

    // Verify effects: chat accessibility flag for Alice is false, Bob's is true
    const chatDocAfterDelete = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDocAfterDelete);
    if (chatDocAfterDelete.user1 === userAlice) {
      assertFalse(chatDocAfterDelete.user1Accessible, "Alice's accessible flag should be false.");
      assertEquals(chatDocAfterDelete.user2Accessible, true, "Bob's accessible flag should remain true.");
    } else { // Alice is user2
      assertEquals(chatDocAfterDelete.user1Accessible, true, "User1's accessible flag should remain true.");
      assertFalse(chatDocAfterDelete.user2Accessible, "Alice's accessible flag should be false.");
    }
    console.log("  Chat flags after Alice's delete:", chatDocAfterDelete);

    // Verify queries:
    // Alice should no longer see the chat in her accessible list
    const aliceAccessibleChats = await chatConcept._getAccessibleChatsForUser({ user: userAlice });
    assertFalse((aliceAccessibleChats as Array<{ chat: ID }>).some((c) => c.chat === chatId), "Alice should not see the chat.");
    // Bob should still see the chat in his accessible list
    const bobAccessibleChats = await chatConcept._getAccessibleChatsForUser({ user: userBob });
    assertArrayIncludes(bobAccessibleChats as Array<{ chat: ID }>, [{ chat: chatId }], "Bob should still see the chat.");
    // DM history should still be retrievable if at least one user has access
    const dmsForChat = await chatConcept._getDMsInChat({ chat: chatId });
    assertNotEquals((dmsForChat as { error: string }).error, "DMs should still be accessible via query.");
    assertEquals((dmsForChat as Array<{ dm: object }>).length, 1, "DM history count should be 1.");

    // Action: Alice tries to send another message (should fail)
    const dmFailResult = await chatConcept.send({ sender: userAlice, receiver: userBob, message: "Attempt after delete by Alice." });
    assertExists((dmFailResult as { error: string }).error, "Alice should not be able to send messages.");
    assertEquals((dmFailResult as { error: string }).error, "Sender does not have access to this chat", "Error message should indicate no access.");

    // Action: Bob cannot send messages (even though chat is still accessible to him)
    const dmSuccessResult = await chatConcept.send({ sender: userBob, receiver: userAlice, message: "Still here, Alice!" });
    console.log("  Bob sending message after Alice deleted:", dmSuccessResult);
    assertExists((dmSuccessResult as { error: string }).error, "Bob should not still be able to send messages.");

  });

  await t.step("should completely make a chat inaccessible when both users delete it", async () => {
    console.log("\n--- Test: deleteChat - Both Users Delete Chat ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-condition: Create a chat and send a message
    const chatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatId = (chatResult as { chat: ID }).chat;
    assertExists(chatId);
    await chatConcept.send({ sender: userAlice, receiver: userBob, message: "Initial message before delete." });

    // Action: Both users delete the chat
    await chatConcept.deleteChat({ chat: chatId, user: userAlice });
    await chatConcept.deleteChat({ chat: chatId, user: userBob });
    console.log("  Both Alice and Bob have deleted the chat.");

    // Verify effects: both accessibility flags are false
    const chatDocAfterBothDelete = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDocAfterBothDelete);
    assertFalse(chatDocAfterBothDelete.user1Accessible, "User1Accessible flag should be false.");
    assertFalse(chatDocAfterBothDelete.user2Accessible, "User2Accessible flag should be false.");
    console.log("  Chat flags after both users deleted:", chatDocAfterBothDelete);

    // Verify queries:
    // Neither user should see the chat in their accessible list
    const aliceAccessibleChats = await chatConcept._getAccessibleChatsForUser({ user: userAlice });
    assertFalse((aliceAccessibleChats as Array<{ chat: ID }>).some((c) => c.chat === chatId), "Alice should not see the chat.");
    const bobAccessibleChats = await chatConcept._getAccessibleChatsForUser({ user: userBob });
    assertFalse((bobAccessibleChats as Array<{ chat: ID }>).some((c) => c.chat === chatId), "Bob should not see the chat.");
    // DM history should now be inaccessible via query
    const dmsResult = await chatConcept._getDMsInChat({ chat: chatId });
    assertExists((dmsResult as { error: string }).error, "DMs should be inaccessible when chat has no active users.");
    assertEquals((dmsResult as { error: string }).error, "Chat not found or is inaccessible", "Error message for inaccessible DMs should match.");

    // Action: Attempt to send message by either user should fail
    const dmFailAlice = await chatConcept.send({ sender: userAlice, receiver: userBob, message: "Hello again!" });
    assertExists((dmFailAlice as { error: string }).error, "Alice should not be able to send messages.");
    const dmFailBob = await chatConcept.send({ sender: userBob, receiver: userAlice, message: "Are you there?" });
    assertExists((dmFailBob as { error: string }).error, "Bob should not be able to send messages.");
  });

  await t.step("should prevent deleting a chat if user is not a participant", async () => {
    console.log("\n--- Test: deleteChat - Prevent Non-Participant Delete ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-condition: Create a chat between Alice and Bob
    const chatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatId = (chatResult as { chat: ID }).chat;
    assertExists(chatId);

    // Action: Charlie (not a participant) tries to delete the chat
    const deleteResult = await chatConcept.deleteChat({ chat: chatId, user: userCharlie });
    console.log("  deleteChat result (non-participant Charlie):", deleteResult);

    // Verify requires: an error is returned
    assertExists((deleteResult as { error: string }).error, "Should return an error.");
    assertEquals((deleteResult as { error: string }).error, "User is not a part of this chat", "Error message should match.");

    // Verify effects: chat accessibility flags remain unchanged
    const chatDoc = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDoc);
    assertEquals(chatDoc.user1Accessible, true, "User1Accessible flag should still be true.");
    assertEquals(chatDoc.user2Accessible, true, "User2Accessible flag should still be true.");
  });

  await t.step("should prevent deleting a non-existent chat", async () => {
    console.log("\n--- Test: deleteChat - Prevent Delete Non-Existent Chat ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Action: Alice tries to delete a chat that doesn't exist
    const nonExistentChatId = freshID();
    const deleteResult = await chatConcept.deleteChat({ chat: nonExistentChatId, user: userAlice });
    console.log("  deleteChat result (non-existent chat):", deleteResult);

    // Verify requires: an error is returned
    assertExists((deleteResult as { error: string }).error, "Should return an error.");
    assertEquals((deleteResult as { error: string }).error, "Chat not found", "Error message should match.");
  });

  await t.step("should retrieve all chats accessible to a specific user", async () => {
    console.log("\n--- Test: _getAccessibleChatsForUser ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    // Pre-conditions: Create multiple chats and manage accessibility
    const chatABResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatABId = (chatABResult as { chat: ID }).chat;
    const chatACResult = await chatConcept.startChat({ requester: userAlice, receiver: userCharlie });
    const chatACId = (chatACResult as { chat: ID }).chat;
    const chatBCResult = await chatConcept.startChat({ requester: userBob, receiver: userCharlie });
    const chatBCId = (chatBCResult as { chat: ID }).chat;

    // Alice deletes chatAB for herself
    await chatConcept.deleteChat({ chat: chatABId, user: userAlice });
    // Bob deletes chatBC for himself
    await chatConcept.deleteChat({ chat: chatBCId, user: userBob });

    // Query: Get chats for Alice
    const aliceChats = await chatConcept._getAccessibleChatsForUser({ user: userAlice });
    console.log("  Alice's accessible chats:", aliceChats);
    const aliceChatIds = (aliceChats as Array<{ chat: ID }>).map((c) => c.chat);
    assertArrayIncludes(aliceChatIds, [chatACId], "Alice should see chatAC.");
    assertFalse(aliceChatIds.includes(chatABId), "Alice should not see chatAB (deleted by her).");
    assertFalse(aliceChatIds.includes(chatBCId), "Alice should not see chatBC (not part of it).");
    assertEquals(aliceChatIds.length, 1, "Alice should have 1 accessible chat.");

    // Query: Get chats for Bob
    const bobChats = await chatConcept._getAccessibleChatsForUser({ user: userBob });
    console.log("  Bob's accessible chats:", bobChats);
    const bobChatIds = (bobChats as Array<{ chat: ID }>).map((c) => c.chat);
    assertArrayIncludes(bobChatIds, [chatABId], "Bob should see chatAB (Alice deleted, not him).");
    assertFalse(bobChatIds.includes(chatACId), "Bob should not see chatAC (not part of it).");
    assertFalse(bobChatIds.includes(chatBCId), "Bob should not see chatBC (deleted by him).");
    assertEquals(bobChatIds.length, 1, "Bob should have 1 accessible chat.");

    // Query: Get chats for Charlie
    const charlieChats = await chatConcept._getAccessibleChatsForUser({ user: userCharlie });
    console.log("  Charlie's accessible chats:", charlieChats);
    const charlieChatIds = (charlieChats as Array<{ chat: ID }>).map((c) => c.chat);
    assertArrayIncludes(charlieChatIds, [chatACId, chatBCId], "Charlie should see chatAC and chatBC.");
    assertFalse(charlieChatIds.includes(chatABId), "Charlie should not see chatAB (not part of it).");
    assertEquals(charlieChatIds.length, 2, "Charlie should have 2 accessible chats.");
  });

  await t.step("principle: users can start a chat, send messages, and manage chat visibility", async () => {
    console.log("\n--- Trace: Principle Fulfillment ---");
    await chatConcept.chats.deleteMany({});
    await chatConcept.dms.deleteMany({});

    console.log("  Scenario: Alice and Bob communicate, then Alice hides the chat, Bob continues, then both hide.");

    // 1. User A starts a chat with User B.
    console.log("  Step 1: Alice starts a chat with Bob.");
    const chatResult = await chatConcept.startChat({ requester: userAlice, receiver: userBob });
    const chatId = (chatResult as { chat: ID }).chat;
    assertExists(chatId, "Chat should be created successfully.");
    console.log(`    Chat created with ID: ${chatId}`);

    // Verify initial accessibility
    let chatDoc = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDoc);
    assertEquals(chatDoc.user1Accessible, true, "Chat should be accessible to user1 initially.");
    assertEquals(chatDoc.user2Accessible, true, "Chat should be accessible to user2 initially.");
    console.log("    Chat is accessible to both Alice and Bob.");

    // 2. User A sends a message to User B.
    const message1 = "Hey Bob, planning for the weekend?";
    console.log(`  Step 2: Alice sends message to Bob: "${message1}"`);
    const dmResult1 = await chatConcept.send({ sender: userAlice, receiver: userBob, message: message1 });
    assertExists((dmResult1 as { dm: ID }).dm, "First DM should be sent successfully.");
    console.log("    DM 1 sent successfully.");

    // 3. User B sends a message to User A.
    const message2 = "Yeah, thinking of hiking! You in?";
    console.log(`  Step 3: Bob sends message to Alice: "${message2}"`);
    const dmResult2 = await chatConcept.send({ sender: userBob, receiver: userAlice, message: message2 });
    assertExists((dmResult2 as { dm: ID }).dm, "Second DM should be sent successfully.");
    console.log("    DM 2 sent successfully.");

    // Both users can still see the chat and its messages.
    console.log("  Verifying chat and messages accessibility for both users.");
    const initialDMs = await chatConcept._getDMsInChat({ chat: chatId });
    assertNotEquals((initialDMs as { error: string }).error, "DMs should be retrievable at this point.");
    assertEquals((initialDMs as Array<{ dm: object }>).length, 2, "There should be 2 DMs in the chat.");
    console.log("    Current chat history:", (initialDMs as Array<any>).map(d => d.dm.message));

    // Alice "deletes" the chat (makes it inaccessible for herself).
    console.log("  Step 4: Alice deletes the chat for herself.");
    await chatConcept.deleteChat({ chat: chatId, user: userAlice });
    console.log("    Chat status after Alice's deletion:");
    chatDoc = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDoc);
    const aliceIsUser1 = chatDoc.user1 === userAlice;
    if (aliceIsUser1) {
      assertFalse(chatDoc.user1Accessible, "Alice's flag should be false.");
      assertEquals(chatDoc.user2Accessible, true, "Bob's flag should still be true.");
    } else {
      assertEquals(chatDoc.user1Accessible, true, "User1's flag should still be true.");
      assertFalse(chatDoc.user2Accessible, "Alice's flag should be false.");
    }

    // Alice tries to send a message (should fail).
    console.log("  Step 5: Alice tries to send another message (should fail).");
    const message3 = "Cool, I'll join!";
    const dmFailResult = await chatConcept.send({ sender: userAlice, receiver: userBob, message: message3 });
    assertExists((dmFailResult as { error: string }).error, "Alice should not be able to send messages.");
    assertEquals((dmFailResult as { error: string }).error, "Sender does not have access to this chat", "Alice's message attempt failed as expected.");

    // Bob cannot send a message (chat is still accessible to him).
    console.log("  Step 6: Bob sends another message (should succeed).");
    const message4 = "Awesome! Let me know what time works.";
    const dmSuccessResult = await chatConcept.send({ sender: userBob, receiver: userAlice, message: message4 });
    assertExists((dmSuccessResult as { error: ID }).error, "Bob should not still be able to send messages.");
    console.log("    Bob's message correctly failed to send successfully.");

    // Verify DMs are still visible through the chat (as Bob still has access).
    const dmsAfterAliceDelete = await chatConcept._getDMsInChat({ chat: chatId });
    assertNotEquals((dmsAfterAliceDelete as { error: string }).error, "DMs should still be visible.");
    assertEquals((dmsAfterAliceDelete as Array<{ dm: object }>).length, 2, "There should now be 3 DMs.");
    console.log("    Chat history after Alice's deletion (visible via Bob):", (dmsAfterAliceDelete as Array<any>).map(d => d.dm.message));

    // Bob also "deletes" the chat.
    console.log("  Step 7: Bob deletes the chat for himself.");
    await chatConcept.deleteChat({ chat: chatId, user: userBob });
    console.log("    Chat status after Bob's deletion:");
    chatDoc = await chatConcept.chats.findOne({ _id: chatId });
    assertExists(chatDoc);
    assertFalse(chatDoc.user1Accessible, "User1's flag should be false.");
    assertFalse(chatDoc.user2Accessible, "User2's flag should be false.");
    console.log("    Chat is now inaccessible to both users.");

    // Now, neither user can retrieve DMs via _getDMsInChat.
    console.log("  Step 8: Verify DM retrieval fails for both users.");
    const dmsFinal = await chatConcept._getDMsInChat({ chat: chatId });
    assertExists((dmsFinal as { error: string }).error, "DMs should not be retrievable when chat is inaccessible to both.");
    assertEquals((dmsFinal as { error: string }).error, "Chat not found or is inaccessible", "DM retrieval failed as expected.");

    console.log("  Principle trace completed, all behaviors verified.");
    await client.close();
  });
});
