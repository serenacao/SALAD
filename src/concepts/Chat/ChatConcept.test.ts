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

Deno.test("ChatConcept", async (t) => {
  const [db, client] = await testDb();
  const chatConcept = new ChatConcept(db);

  // No global test users, they will be created per-scenario within each major t.step
  // This ensures a clean slate of user and chat IDs for each action/query/principle test group.

  await t.step("Action: startChat", async (ctx) => {
    // Define users specific to this test step's scenarios
    const userA: ID = freshID(); // Will be used as requester/receiver
    const userB: ID = freshID(); // Will be used as requester/receiver
    const userC: ID = freshID(); // For non-participant/self-chat tests

    // Test case 1: Successful chat creation
    await ctx.step("should successfully create a new chat between two users", async () => {
      console.log(`\n--- Test: startChat successful creation ---`);
      console.log(`Trace: Attempting to start a chat between User ID ${userA} and User ID ${userB}.`);
      console.log(`Action: startChat({ requester: ${userA}, receiver: ${userB} })`);

      const result = await chatConcept.startChat({ requester: userA, receiver: userB });
      // Assert that it's not an error, then access 'chat'
      if ('error' in result) {
        throw new Error(`Expected successful chat creation, but got error: ${result.error}`);
      }
      assertExists(result.chat, "Expected a chat ID to be returned");
      const chatId = result.chat;
      console.log(`Output: Successfully created chat with ID: ${chatId}`);

      // Confirm effects: a new chat document exists in the database
      const chatDoc = await chatConcept.chats.findOne({ _id: chatId });
      assertExists(chatDoc, "Effect confirmation: Expected the chat document to exist in the database");
      assertEquals(chatDoc?.user1, userA, "Effect confirmation: User1 should be the requester");
      assertEquals(chatDoc?.user2, userB, "Effect confirmation: User2 should be the receiver");
      assertEquals(chatDoc?.user1Accessible, true, "Effect confirmation: User1 should initially have access");
      assertEquals(chatDoc?.user2Accessible, true, "Effect confirmation: User2 should initially have access");
      console.log(`Effect confirmed: Chat document ${chatId} exists with correct users and accessibility flags set to true.`);
    });

    // Test case 2: Chat already exists (violates requirement)
    await ctx.step("should return an error if a chat already exists between the users", async () => {
      console.log(`\n--- Test: startChat existing chat ---`);
      // Re-attempting with the same users (userA, userB) from the previous step which created a chat.
      console.log(`Trace: Attempting to start a chat between User ID ${userA} and User ID ${userB} again.`);
      console.log(`Action: startChat({ requester: ${userA}, receiver: ${userB} })`);

      const result = await chatConcept.startChat({ requester: userA, receiver: userB });
      // Assert that it IS an error, then access 'error'
      if (!('error' in result)) {
        throw new Error("Expected an error for existing chat, but got success.");
      }
      assertEquals(result.error, "Chat already exists between these users", "Expected specific error message for existing chat");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because a chat already exists between ${userA} and ${userB}, satisfying the "no chat exists" requirement.`);
    });

    // Test case 3: Chat already exists (reversed order, violates requirement)
    await ctx.step("should return an error if a chat already exists (users reversed)", async () => {
      console.log(`\n--- Test: startChat existing chat (reversed) ---`);
      console.log(`Trace: Attempting to start a chat between User ID ${userB} and User ID ${userA}, which already exists in reverse order.`);
      console.log(`Action: startChat({ requester: ${userB}, receiver: ${userA} })`);

      const result = await chatConcept.startChat({ requester: userB, receiver: userA });
      if (!('error' in result)) {
        throw new Error("Expected an error for existing chat (reversed), but got success.");
      }
      assertEquals(result.error, "Chat already exists between these users", "Expected specific error message for existing chat (reversed)");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because a chat already exists, regardless of user order, satisfying the "no chat exists" requirement.`);
    });

    // Test case 4: Cannot start chat with self
    await ctx.step("should return an error if requester is the same as receiver", async () => {
      console.log(`\n--- Test: startChat with self ---`);
      console.log(`Trace: Attempting to start a chat where requester (${userC}) and receiver (${userC}) are the same.`);
      console.log(`Action: startChat({ requester: ${userC}, receiver: ${userC} })`);

      const result = await chatConcept.startChat({ requester: userC, receiver: userC });
      if (!('error' in result)) {
        throw new Error("Expected an error for self-chat, but got success.");
      }
      assertEquals(result.error, "Cannot start a chat with yourself", "Expected specific error for self-chat");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because requester and receiver are identical, preventing self-chat creation.`);
    });
  });

  await t.step("Action: deleteChat", async (ctx) => {
    // Define users specific to this test step's scenarios
    const userA: ID = freshID();
    const userB: ID = freshID();
    const userC: ID = freshID(); // Non-participant user

    let existingChatId: ID; // This chat ID will be created in setup and used across deleteChat tests

    // Setup for deleteChat tests: Create a chat for userA and userB
    await ctx.step("Setup: Create a fresh chat for deleteChat tests", async () => {
      console.log(`\n--- Setup: Creating a fresh chat for deleteChat tests ---`);
      const chatResult = await chatConcept.startChat({ requester: userA, receiver: userB });
      if ('error' in chatResult) {
        throw new Error(`Setup failed: Could not create chat for deleteChat tests: ${chatResult.error}`);
      }
      existingChatId = chatResult.chat;
      console.log(`Setup: Chat ID ${existingChatId} successfully created between ${userA} and ${userB}.`);
    });

    // Test case 1: User is not part of the chat (violates requirement)
    await ctx.step("should return an error if user is not a part of the chat", async () => {
      console.log(`\n--- Test: deleteChat user not part of chat ---`);
      const nonParticipant = userC;
      console.log(`Trace: Attempting to delete chat ID ${existingChatId} by non-participant User ID ${nonParticipant}.`);
      console.log(`Action: deleteChat({ chat: ${existingChatId}, user: ${nonParticipant} })`);

      const result = await chatConcept.deleteChat({ chat: existingChatId, user: nonParticipant });
      if (!('error' in result)) {
        throw new Error("Expected an error for non-participant deleting chat, but got success.");
      }
      assertEquals(result.error, "User is not a part of this chat", "Expected specific error for non-participant");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because User ID ${nonParticipant} is not a participant in chat ID ${existingChatId}.`);
    });

    // Test case 2: Successfully make chat inaccessible for one user
    await ctx.step("should make the chat inaccessible for the specified user", async () => {
      console.log(`\n--- Test: deleteChat one user ---`);
      console.log(`Trace: User ID ${userA} is attempting to delete chat ID ${existingChatId}.`);
      console.log(`Action: deleteChat({ chat: ${existingChatId}, user: ${userA} })`);

      const result = await chatConcept.deleteChat({ chat: existingChatId, user: userA });
      if ('error' in result) {
        throw new Error(`Expected successful deletion for one user, but got error: ${result.error}`);
      }
      assertEquals(result, {}, "Expected an empty object for successful deletion, indicating no error");
      console.log(`Output: deleteChat for ${userA} on chat ${existingChatId} returned success.`);

      // Confirm effects: userAAccessible flag should be false, chat should still exist
      const chatDoc = await chatConcept.chats.findOne({ _id: existingChatId });
      assertExists(chatDoc, "Effect confirmation: Chat document should still exist after one user deletes.");
      assertFalse(chatDoc?.user1Accessible, `Effect confirmation: User1Accessible should be false for chat ID ${existingChatId}.`);
      assertEquals(chatDoc?.user2Accessible, true, `Effect confirmation: User2Accessible should remain true for chat ID ${existingChatId}.`);
      console.log(`Effect confirmed: Chat ID ${existingChatId} now inaccessible for ${userA}, still accessible for ${userB}.`);
      console.log(`Requirement confirmation: User ${userA} is a part of chat ${existingChatId}, allowing the action.`);
    });

    // Test case 3: Make chat inaccessible for the second user, leading to full deletion
    await ctx.step("should delete the chat from the database if both users make it inaccessible", async () => {
      console.log(`\n--- Test: deleteChat both users ---`);
      console.log(`Trace: User ID ${userB} is now attempting to delete chat ID ${existingChatId}.`);
      console.log(`Action: deleteChat({ chat: ${existingChatId}, user: ${userB} })`);

      const result = await chatConcept.deleteChat({ chat: existingChatId, user: userB });
      if ('error' in result) {
        throw new Error(`Expected successful deletion for second user, but got error: ${result.error}`);
      }
      assertEquals(result, {}, "Expected an empty object for successful deletion, indicating no error");
      console.log(`Output: deleteChat for ${userB} on chat ${existingChatId} returned success.`);

      // Confirm effects: chat document should no longer exist
      const chatDoc = await chatConcept.chats.findOne({ _id: existingChatId });
      assertEquals(chatDoc, null, "Effect confirmation: Chat document should be deleted from the database.");
      console.log(`Effect confirmed: Chat ID ${existingChatId} deleted from database as both ${userA} and ${userB} marked it inaccessible.`);
    });

    // Test case 4: Delete non-existent chat
    await ctx.step("should return an error if chat does not exist", async () => {
      console.log(`\n--- Test: deleteChat non-existent chat ---`);
      const nonExistentChat = freshID(); // Ensure this is a new, truly non-existent chat
      console.log(`Trace: Attempting to delete a non-existent chat ID ${nonExistentChat} by User ID ${userA}.`);
      console.log(`Action: deleteChat({ chat: ${nonExistentChat}, user: ${userA} })`);

      const result = await chatConcept.deleteChat({ chat: nonExistentChat, user: userA });
      if (!('error' in result)) {
        throw new Error("Expected an error for non-existent chat, but got success.");
      }
      assertEquals(result.error, "Chat not found", "Expected specific error for non-existent chat");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because chat ID ${nonExistentChat} does not exist, satisfying the implicit requirement for the chat to exist.`);
    });
  });

  await t.step("Action: send", async (ctx) => {
    // Define users specific to this test step's scenarios
    const userA: ID = freshID();
    const userB: ID = freshID();
    const userC: ID = freshID(); // For inaccessible receiver test
    const userX: ID = freshID(); // For implicit chat creation test
    const userY: ID = freshID(); // For implicit chat creation test

    let sendChatId: ID; // Chat for successful send and sender inaccessible tests
    let chatForInaccessibleTest: ID; // Chat where receiver is inaccessible

    // Setup for send tests: Create chats
    await ctx.step("Setup: Create fresh chats for send tests", async () => {
      console.log(`\n--- Setup: Creating fresh chats for send tests ---`);
      // Chat between userA and userB (initially fully accessible)
      const chatResult = await chatConcept.startChat({ requester: userA, receiver: userB });
      if ('error' in chatResult) {
        throw new Error(`Setup failed: Could not create chat for send tests (userA-userB): ${chatResult.error}`);
      }
      sendChatId = chatResult.chat;
      console.log(`Setup: Chat ID ${sendChatId} created between ${userA} and ${userB} for send tests.`);

      // Create another chat, then make userC inaccessible for a specific test case
      const chatA_C_res = await chatConcept.startChat({ requester: userA, receiver: userC });
      if ('error' in chatA_C_res) {
        throw new Error(`Setup failed: Could not create chat for send tests (userA-userC): ${chatA_C_res.error}`);
      }
      chatForInaccessibleTest = chatA_C_res.chat;
      const deleteResult = await chatConcept.deleteChat({ chat: chatForInaccessibleTest, user: userC });
      if ('error' in deleteResult) {
        throw new Error(`Setup failed: Could not make chat inaccessible for userC: ${deleteResult.error}`);
      }
      console.log(`Setup: Chat ID ${chatForInaccessibleTest} created between ${userA} and ${userC}, then made inaccessible for ${userC}.`);
    });

    // Test case 1: Successful DM creation
    await ctx.step("should successfully send a DM and return its ID", async () => {
      console.log(`\n--- Test: send successful DM ---`);
      const message = "Hello there!";
      console.log(`Trace: User ID ${userA} sends a message to User ID ${userB} in chat ID ${sendChatId}.`);
      console.log(`Action: send({ sender: ${userA}, receiver: ${userB}, message: "${message}" })`);

      const result = await chatConcept.send({ sender: userA, receiver: userB, message: message });
      if ('error' in result) {
        throw new Error(`Expected successful DM send, but got error: ${result.error}`);
      }
      assertExists(result.dm, "Expected a DM ID to be returned upon successful send");
      const dmId = result.dm;
      console.log(`Output: Sent DM with ID: ${dmId}`);

      // Confirm effects: a new DM document exists
      const dmDoc = await chatConcept.dms.findOne({ _id: dmId });
      assertExists(dmDoc, "Effect confirmation: Expected the DM document to exist in the database.");
      assertEquals(dmDoc?.chatId, sendChatId, "Effect confirmation: DM should be linked to the correct chat.");
      assertEquals(dmDoc?.sender, userA, "Effect confirmation: DM sender should be userA.");
      assertEquals(dmDoc?.receiver, userB, "Effect confirmation: DM receiver should be userB.");
      assertEquals(dmDoc?.message, message, "Effect confirmation: DM message should match.");
      assertExists(dmDoc?.time, "Effect confirmation: DM should have a timestamp.");
      console.log(`Effect confirmed: DM document ${dmId} exists with correct chat, sender, receiver, and message.`);
      console.log(`Requirement confirmation: A chat exists between ${userA} and ${userB} (chat ID ${sendChatId}), and is accessible by both, allowing the send action.`);
    });

    // Test case 2: Receiver does not have access (violates requirement)
    await ctx.step("should return an error if receiver does not have access to the chat", async () => {
      console.log(`\n--- Test: send receiver inaccessible chat ---`);
      const message = "You shouldn't see this!";
      console.log(`Trace: User ID ${userA} attempts to send a message to User ID ${userC} in chat ID ${chatForInaccessibleTest}, where ${userC} has made it inaccessible.`);
      console.log(`Action: send({ sender: ${userA}, receiver: ${userC}, message: "${message}" })`);

      const result = await chatConcept.send({ sender: userA, receiver: userC, message: message });
      if (!('error' in result)) {
        throw new Error("Expected an error for inaccessible receiver, but got success.");
      }
      assertEquals(result.error, "Receiver does not have access to this chat", "Expected specific error for inaccessible receiver");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because receiver (${userC}) does not have access to chat ID ${chatForInaccessibleTest}.`);
    });

    // Test case 3: Sender does not have access (violates requirement)
    await ctx.step("should return an error if sender does not have access to the chat", async () => {
      console.log(`\n--- Test: send sender inaccessible chat ---`);
      // Make `sendChatId` inaccessible for userA (sender)
      const deleteResult = await chatConcept.deleteChat({ chat: sendChatId, user: userA });
      if ('error' in deleteResult) {
        throw new Error(`Setup failed: Could not make chat inaccessible for userA: ${deleteResult.error}`);
      }
      console.log(`Setup: Made chat ID ${sendChatId} inaccessible for ${userA}.`);

      const message = "Sender inaccessible message.";
      console.log(`Trace: User ID ${userA} (now inaccessible) attempts to send a message to User ID ${userB} in chat ID ${sendChatId}.`);
      console.log(`Action: send({ sender: ${userA}, receiver: ${userB}, message: "${message}" })`);

      const result = await chatConcept.send({ sender: userA, receiver: userB, message: message });
      if (!('error' in result)) {
        throw new Error("Expected an error for inaccessible sender, but got success.");
      }
      assertEquals(result.error, "Sender does not have access to this chat", "Expected specific error for inaccessible sender");
      console.log(`Output: ${result.error}`);
      console.log(`Requirement confirmation: Operation failed because sender (${userA}) does not have access to chat ID ${sendChatId}.`);

      // Clean up for next tests: make userB inaccessible too, which should delete the chat
      const deleteResult2 = await chatConcept.deleteChat({ chat: sendChatId, user: userB });
      if ('error' in deleteResult2) {
        throw new Error(`Cleanup failed: Could not make chat inaccessible for userB: ${deleteResult2.error}`);
      }
    });

    // Test case 4: No chat exists *and* `send` implicitly creates one (current implementation behavior)
    await ctx.step("should implicitly create a chat if one does not exist, then send the DM", async () => {
      console.log(`\n--- Test: send implicit chat creation ---`);
      // New users for this isolated test
      console.log(`Trace: User ID ${userX} attempts to send a message to User ID ${userY}, where no prior chat exists.`);
      console.log(`Action: send({ sender: ${userX}, receiver: ${userY}, message: "This chat was just created!" })`);

      // Verify no chat exists initially
      const initialChat = await chatConcept.chats.findOne({ $or: [{ user1: userX, user2: userY }, { user1: userY, user2: userX }] });
      assertEquals(initialChat, null, `Pre-condition: No chat should exist between ${userX} and ${userY} before this send action.`);

      const message = "This chat was just created!";
      const result = await chatConcept.send({ sender: userX, receiver: userY, message: message });
      if ('error' in result) {
        throw new Error(`Expected successful DM send after implicit chat creation, but got error: ${result.error}`);
      }
      assertExists(result.dm, "Expected a DM ID to be returned, implying chat creation and DM send");
      const dmId = result.dm;
      console.log(`Output: Sent DM with ID: ${dmId} after implicit chat creation.`);

      // Confirm effects: a new chat document should now exist
      const chatDoc = await chatConcept.chats.findOne({ $or: [{ user1: userX, user2: userY }, { user1: userY, user2: userX }] });
      assertExists(chatDoc, "Effect confirmation: Expected a new chat document to have been created.");
      assertEquals(chatDoc?.user1Accessible, true, "Effect confirmation: New chat should be accessible to user1.");
      assertEquals(chatDoc?.user2Accessible, true, "Effect confirmation: New chat should be accessible to user2.");
      console.log(`Effect confirmed: New chat ID ${chatDoc?._id} created for ${userX} and ${userY}.`);

      // Confirm DM exists and is linked
      const dmDoc = await chatConcept.dms.findOne({ _id: dmId });
      assertExists(dmDoc, "Effect confirmation: Expected the DM document to exist.");
      assertEquals(dmDoc?.chatId, chatDoc?._id, "Effect confirmation: DM should be linked to the newly created chat.");
      assertEquals(dmDoc?.sender, userX, "Effect confirmation: DM sender should be userX.");
      assertEquals(dmDoc?.receiver, userY, "Effect confirmation: DM receiver should be userY.");
      assertEquals(dmDoc?.message, message, "Effect confirmation: DM message should match.");
      console.log(`Effect confirmed: DM ${dmId} exists and is linked to the new chat.`);
      console.log(`Note on Requirement: The "requires a chat exists" is interpreted leniently here, where ` +
                  `the 'send' action also ensures this requirement by creating a chat if one doesn't exist, ` +
                  `then proceeding with the send. If a strict interpretation is intended, 'send' should return an error if no chat exists.`);
    });
  });

  // Test queries (_getChatBetweenUsers, _getDMsInChat, _getAccessibleChatsForUser)
  await t.step("Query Tests", async (ctx) => {
    // Define users specific to this test step's scenarios
    const queryUser1: ID = freshID();
    const queryUser2: ID = freshID();
    const queryUser3: ID = freshID(); // For partially inaccessible chat
    const queryUser4: ID = freshID(); // For a user with no chats (never participating in a chat)

    let chat1_2_id: ID; // Fully accessible chat
    let chat1_3_id: ID; // Partially inaccessible chat

    await ctx.step("Setup for Queries: Create multiple chats and DMs", async () => {
      console.log(`\n--- Setup for Queries ---`);

      // Chat between queryUser1 and queryUser2 (fully accessible)
      const chat1_2_res = await chatConcept.startChat({ requester: queryUser1, receiver: queryUser2 });
      if ('error' in chat1_2_res) {
        throw new Error(`Setup failed: Failed to create chat 1-2: ${chat1_2_res.error}`);
      }
      chat1_2_id = chat1_2_res.chat;
      console.log(`Setup: Chat ID ${chat1_2_id} created between ${queryUser1} and ${queryUser2}.`);

      const dm1 = await chatConcept.send({ sender: queryUser1, receiver: queryUser2, message: "Hi User2!" });
      const dm2 = await chatConcept.send({ sender: queryUser2, receiver: queryUser1, message: "Hello User1!" });
      const dm3 = await chatConcept.send({ sender: queryUser1, receiver: queryUser2, message: "How are you?" });
      if ('error' in dm1 || 'error' in dm2 || 'error' in dm3) {
        throw new Error("Setup failed: Could not send DMs for query setup.");
      }
      console.log(`Setup: 3 DMs sent in chat ID ${chat1_2_id}.`);

      // Chat between queryUser1 and queryUser3 (partially accessible: queryUser1 has access, queryUser3 doesn't)
      const chat1_3_res = await chatConcept.startChat({ requester: queryUser1, receiver: queryUser3 });
      if ('error' in chat1_3_res) {
        throw new Error(`Setup failed: Failed to create chat 1-3: ${chat1_3_res.error}`);
      }
      chat1_3_id = chat1_3_res.chat;
      console.log(`Setup: Chat ID ${chat1_3_id} created between ${queryUser1} and ${queryUser3}.`);

      const dm4 = await chatConcept.send({ sender: queryUser1, receiver: queryUser3, message: "Hi User3!" });
      if ('error' in dm4) {
        throw new Error("Setup failed: Could not send DM for partially accessible chat setup.");
      }
      console.log(`Setup: 1 DM sent in chat ID ${chat1_3_id}.`);

      const deleteResult = await chatConcept.deleteChat({ chat: chat1_3_id, user: queryUser3 });
      if ('error' in deleteResult) {
        throw new Error(`Setup failed: Could not make chat1_3 inaccessible for queryUser3: ${deleteResult.error}`);
      }
      console.log(`Setup: Chat ID ${chat1_3_id} made inaccessible for ${queryUser3}.`);
    });

    await ctx.step("Query: _getChatBetweenUsers", async (subCtx) => {
      await subCtx.step("should return the chat ID if an active chat exists between users", async () => {
        console.log(`\n--- Test: _getChatBetweenUsers active chat ---`);
        console.log(`Trace: Querying for chat between User ID ${queryUser1} and User ID ${queryUser2}.`);
        console.log(`Query: _getChatBetweenUsers({ userA: ${queryUser1}, userB: ${queryUser2} })`);

        const result = await chatConcept._getChatBetweenUsers({ userA: queryUser1, userB: queryUser2 });
        if ('error' in result) {
          throw new Error(`Expected success, but got an error: ${result.error}`);
        }
        assertEquals(result.length, 1, "Expected one chat to be found");
        assertEquals(result[0].chat, chat1_2_id, "Expected to find chat1_2_id");
        console.log(`Output: Found chat ID ${chat1_2_id}.`);
        console.log(`Effect confirmed: Correctly returned the active chat ID between ${queryUser1} and ${queryUser2}.`);
      });

      await subCtx.step("should return an empty array if no chat exists between users", async () => {
        console.log(`\n--- Test: _getChatBetweenUsers no chat ---`);
        const nonExistentUser = freshID(); // A new user ID for this specific sub-test
        console.log(`Trace: Querying for chat between User ID ${queryUser1} and a non-existent User ID ${nonExistentUser}.`);
        console.log(`Query: _getChatBetweenUsers({ userA: ${queryUser1}, userB: ${nonExistentUser} })`);

        const result = await chatConcept._getChatBetweenUsers({ userA: queryUser1, userB: nonExistentUser });
        if ('error' in result) {
          throw new Error(`Expected success (empty array), but got an error: ${result.error}`);
        }
        assertEquals(result, [], "Expected an empty array for no existing chat");
        console.log(`Output: []`);
        console.log(`Effect confirmed: Correctly returned an empty array as no chat exists between ${queryUser1} and ${nonExistentUser}.`);
      });

      await subCtx.step("should return an empty array if chat exists but is not accessible by both", async () => {
        console.log(`\n--- Test: _getChatBetweenUsers inaccessible by both ---`);
        // chat1_3 is inaccessible for queryUser3
        console.log(`Trace: Querying for chat between User ID ${queryUser1} and User ID ${queryUser3}, where ${queryUser3} has made it inaccessible.`);
        console.log(`Query: _getChatBetweenUsers({ userA: ${queryUser1}, userB: ${queryUser3} })`);

        const result = await chatConcept._getChatBetweenUsers({ userA: queryUser1, userB: queryUser3 });
        if ('error' in result) {
          throw new Error(`Expected success (empty array), but got an error: ${result.error}`);
        }
        assertEquals(result, [], "Expected an empty array as chat is not accessible by both");
        console.log(`Output: []`);
        console.log(`Effect confirmed: Chat ID ${chat1_3_id} not returned as it's not accessible by both ${queryUser1} and ${queryUser3}, adhering to the 'accessible by both' condition for this query.`);
      });
    });

    await ctx.step("Query: _getDMsInChat", async (subCtx) => {
      await subCtx.step("should return all DMs in an accessible chat", async () => {
        console.log(`\n--- Test: _getDMsInChat accessible chat ---`);
        console.log(`Trace: Querying for DMs in chat ID ${chat1_2_id}.`);
        console.log(`Query: _getDMsInChat({ chat: ${chat1_2_id} })`);

        const result = await chatConcept._getDMsInChat({ chat: chat1_2_id });
        if ('error' in result) {
          throw new Error(`Expected success, but got an error: ${result.error}`);
        }
        assertEquals(result.length, 3, "Expected 3 DMs in chat1_2");

        const dmMessages = result.map(d => d.dm.message);
        assertArrayIncludes(dmMessages, ["Hi User2!", "Hello User1!", "How are you?"], "Expected specific messages to be included");
        console.log(`Output: Retrieved ${result.length} DMs.`);
        console.log(`Effect confirmed: Retrieved all 3 DMs from chat ID ${chat1_2_id}.`);
      });

      await subCtx.step("should return DMs even if one user has made it inaccessible, as long as one user still has access", async () => {
        console.log(`\n--- Test: _getDMsInChat partially inaccessible chat ---`);
        // chat1_3 is inaccessible for queryUser3 but still accessible for queryUser1
        console.log(`Trace: Querying for DMs in chat ID ${chat1_3_id}, which is partially inaccessible.`);
        console.log(`Query: _getDMsInChat({ chat: ${chat1_3_id} })`);
        const result = await chatConcept._getDMsInChat({ chat: chat1_3_id });
        if ('error' in result) {
          throw new Error(`Expected success, but got an error: ${result.error}`);
        }
        assertEquals(result.length, 1, "Expected 1 DM in chat1_3");
        assertEquals(result[0].dm.message, "Hi User3!", "Expected to retrieve the DM from partially inaccessible chat");
        console.log(`Output: Retrieved ${result.length} DM.`);
        console.log(`Effect confirmed: Retrieved DM from chat ID ${chat1_3_id} which is partially inaccessible, satisfying the "accessible to at least one user" requirement.`);
      });

      await subCtx.step("should return an error if chat is not found or is completely inaccessible", async () => {
        console.log(`\n--- Test: _getDMsInChat completely inaccessible/non-existent chat ---`);
        // To ensure a completely inaccessible chat, we delete it from both sides, leading to DB deletion.
        const tempChatUser1 = freshID();
        const tempChatUser2 = freshID();
        const tempChatRes = await chatConcept.startChat({ requester: tempChatUser1, receiver: tempChatUser2 });
        if ('error' in tempChatRes) {
          throw new Error(`Setup failed: Could not create temporary chat: ${tempChatRes.error}`);
        }
        const tempChatId = tempChatRes.chat;

        const deleteRes1 = await chatConcept.deleteChat({ chat: tempChatId, user: tempChatUser1 });
        if ('error' in deleteRes1) throw new Error(`Setup failed: Could not delete temp chat for user1: ${deleteRes1.error}`);
        const deleteRes2 = await chatConcept.deleteChat({ chat: tempChatId, user: tempChatUser2 });
        if ('error' in deleteRes2) throw new Error(`Setup failed: Could not delete temp chat for user2: ${deleteRes2.error}`);

        console.log(`Setup: Created and then fully deleted a temporary chat ID ${tempChatId}.`);
        console.log(`Trace: Querying for DMs in a completely inaccessible/non-existent chat ID ${tempChatId}.`);
        console.log(`Query: _getDMsInChat({ chat: ${tempChatId} })`);

        const result = await chatConcept._getDMsInChat({ chat: tempChatId });
        if (!('error' in result)) {
          throw new Error("Expected an error for non-existent/inaccessible chat, but got success.");
        }
        assertEquals(result.error, "Chat not found or is inaccessible", "Expected specific error message");
        console.log(`Output: ${result.error}`);
        console.log(`Effect confirmed: _getDMsInChat failed for non-existent/inaccessible chat ID ${tempChatId}, as expected.`);
      });
    });

    await ctx.step("Query: _getAccessibleChatsForUser", async (subCtx) => {
      await subCtx.step("should return all chats accessible to the user", async () => {
        console.log(`\n--- Test: _getAccessibleChatsForUser ---`);
        // queryUser1 has access to chat1_2 (both accessible) and chat1_3 (user1Accessible is true)
        console.log(`Trace: Querying for accessible chats for User ID ${queryUser1}.`);
        console.log(`Query: _getAccessibleChatsForUser({ user: ${queryUser1} })`);

        const result = await chatConcept._getAccessibleChatsForUser({ user: queryUser1 });
        if ('error' in result) {
          throw new Error(`Expected success, but got an error: ${result.error}`);
        }
        assertEquals(result.length, 2, "Expected 2 accessible chats for queryUser1");
        const chatIds = result.map(c => c.chat);
        assertArrayIncludes(chatIds, [chat1_2_id, chat1_3_id], "Expected both chat IDs to be listed");
        console.log(`Output: User ID ${queryUser1} has access to chat IDs: ${chatIds}.`);
        console.log(`Effect confirmed: Correctly returned chat IDs ${chat1_2_id} and ${chat1_3_id} as accessible for ${queryUser1}.`);
      });

      await subCtx.step("should return an empty array if the user has no accessible chats", async () => {
        console.log(`\n--- Test: _getAccessibleChatsForUser no accessible chats ---`);
        // queryUser4 has not been part of any chat throughout the query test setup
        console.log(`Trace: Querying for accessible chats for an isolated User ID ${queryUser4} (not part of any chat).`);
        console.log(`Query: _getAccessibleChatsForUser({ user: ${queryUser4} })`);

        const result = await chatConcept._getAccessibleChatsForUser({ user: queryUser4 });
        if ('error' in result) {
          throw new Error(`Expected success (empty array), but got an error: ${result.error}`);
        }
        assertEquals(result, [], "Expected an empty array for user with no accessible chats");
        console.log(`Output: []`);
        console.log(`Effect confirmed: Correctly returned an empty array for ${queryUser4} who has no accessible chats.`);
      });

      await subCtx.step("should return an empty array if the user is part of a chat but has made it inaccessible", async () => {
        console.log(`\n--- Test: _getAccessibleChatsForUser user made inaccessible ---`);
        // queryUser3 was part of chat1_3 but made it inaccessible during setup.
        console.log(`Trace: Querying for accessible chats for User ID ${queryUser3}, who made their only chat inaccessible.`);
        console.log(`Query: _getAccessibleChatsForUser({ user: ${queryUser3} })`);

        const result = await chatConcept._getAccessibleChatsForUser({ user: queryUser3 });
        if ('error' in result) {
          throw new Error(`Expected success (empty array), but got an error: ${result.error}`);
        }
        assertEquals(result, [], "Expected an empty array for user who made their only chat inaccessible");
        console.log(`Output: []`);
        console.log(`Effect confirmed: Correctly returned an empty array for ${queryUser3}, reflecting that they no longer have accessible chats.`);
      });
    });
  });


  // Principle testing
  await t.step("Principle: Users can communicate", async (ctx) => {
    // Define users specific to this principle test
    const pUser1 = freshID();
    const pUser2 = freshID();
    let principleChatId: ID;

    console.log(`\n--- Principle Test: Users can communicate ---`);
    console.log(`Principle: "when a user starts a chat with another user, they can then send encouragement, make plans to meet, etc"`);

    await ctx.step("Step 1: User starts a chat with another user", async () => {
      console.log(`Trace: As per principle, pUser1 (${pUser1}) initiates communication by starting a chat with pUser2 (${pUser2}).`);
      const result = await chatConcept.startChat({ requester: pUser1, receiver: pUser2 });
      if ('error' in result) {
        throw new Error(`Failed to start principle chat: ${result.error}`);
      }
      principleChatId = result.chat;
      console.log(`Action: startChat({ requester: ${pUser1}, receiver: ${pUser2} }) -> chat ID: ${principleChatId}`);

      // Verify chat exists and is accessible
      const chatDoc = await chatConcept.chats.findOne({ _id: principleChatId });
      assertExists(chatDoc, "Principle chat should exist");
      assertEquals(chatDoc?.user1Accessible, true, "Principle chat should be accessible to pUser1");
      assertEquals(chatDoc?.user2Accessible, true, "Principle chat should be accessible to pUser2");
      console.log(`Current State: Chat ID ${principleChatId} has been created and is fully accessible to both pUser1 and pUser2.`);
    });

    await ctx.step("Step 2: Users can send messages (encouragement and plans)", async () => {
      const message1 = "Hey, great job on that project!";
      console.log(`Trace: pUser1 (${pUser1}) sends an encouragement message to pUser2 (${pUser2}).`);
      const dm1Result = await chatConcept.send({ sender: pUser1, receiver: pUser2, message: message1 });
      if ('error' in dm1Result) {
        throw new Error(`Failed to send first DM for principle test: ${dm1Result.error}`);
      }
      console.log(`Action: send({ sender: ${pUser1}, receiver: ${pUser2}, message: "${message1}" }) -> DM ID: ${dm1Result.dm}`);

      const message2 = "Thanks! Want to grab coffee to discuss next steps?";
      console.log(`Trace: pUser2 (${pUser2}) replies, suggesting plans to meet.`);
      const dm2Result = await chatConcept.send({ sender: pUser2, receiver: pUser1, message: message2 });
      if ('error' in dm2Result) {
        throw new Error(`Failed to send second DM for principle test: ${dm2Result.error}`);
      }
      console.log(`Action: send({ sender: ${pUser2}, receiver: ${pUser1}, message: "${message2}" }) -> DM ID: ${dm2Result.dm}`);

      // Verify DMs are in the chat
      const dmsInChat = await chatConcept._getDMsInChat({ chat: principleChatId });
      if ('error' in dmsInChat) {
        throw new Error(`Expected no error when retrieving DMs for principle test, but got: ${dmsInChat.error}`);
      }
      assertEquals(dmsInChat.length, 2, "Expected two DMs in the principle chat");
      const messages = dmsInChat.map(d => d.dm.message);
      assertArrayIncludes(messages, [message1, message2], "Both messages should be present in the chat history");
      console.log(`Current State: Chat ID ${principleChatId} contains 2 DMs: "${messages[0]}" and "${messages[1]}".`);
      console.log(`Principle Alignment: This demonstrates that after starting a chat, users can indeed send and receive messages for various purposes, like encouragement and making plans.`);
    });

    await ctx.step("Step 3: One user deletes the chat, communication stops for them but not the other", async () => {
      console.log(`Trace: pUser1 (${pUser1}) decides to delete their access to chat ID ${principleChatId}.`);
      const deleteRes = await chatConcept.deleteChat({ chat: principleChatId, user: pUser1 });
      if ('error' in deleteRes) {
        throw new Error(`Failed to delete chat for pUser1: ${deleteRes.error}`);
      }
      console.log(`Action: deleteChat({ chat: ${principleChatId}, user: ${pUser1} })`);

      // Verify pUser1 no longer has access, pUser2 still does
      const chatDoc = await chatConcept.chats.findOne({ _id: principleChatId });
      assertExists(chatDoc, "Chat should still exist after one user deletes their access");
      assertFalse(chatDoc?.user1Accessible, `pUser1 should no longer have access to chat ID ${principleChatId}`);
      assertEquals(chatDoc?.user2Accessible, true, `pUser2 should still have access to chat ID ${principleChatId}`);
      console.log(`Current State: Chat ID ${principleChatId} is now inaccessible for pUser1, but remains accessible for pUser2.`);

      // pUser1 tries to send (should fail)
      const attemptSend1 = await chatConcept.send({ sender: pUser1, receiver: pUser2, message: "Another message?" });
      if (!('error' in attemptSend1)) {
        throw new Error("pUser1 should not be able to send as they lack access, but the action succeeded.");
      }
      assertEquals(attemptSend1.error, "Sender does not have access to this chat", "Expected sender inaccessible error");
      console.log(`Trace: pUser1 attempts to send a message. Action fails with error: '${attemptSend1.error}'.`);

      // pUser2 tries to send (should fail because receiver (pUser1) doesn't have access)
      const attemptSend2 = await chatConcept.send({ sender: pUser2, receiver: pUser1, message: "Still here?" });
      if (!('error' in attemptSend2)) {
        throw new Error("pUser2 should not be able to send if receiver is inaccessible, but the action succeeded.");
      }
      assertEquals(attemptSend2.error, "Receiver does not have access to this chat", "Expected receiver inaccessible error");
      console.log(`Trace: pUser2 attempts to send a message. Action fails with error: '${attemptSend2.error}', because pUser1 no longer has access.`);

      console.log(`Principle Alignment: This step demonstrates that communication via chat is conditional on both parties having access. When one party removes their access, the communication flow is effectively stopped for that party, and new messages cannot be exchanged, upholding controlled communication.`);
    });
  });
  await client.close();
});
