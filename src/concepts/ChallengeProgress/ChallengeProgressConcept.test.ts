import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";

Deno.test("ChallengeProgressConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeProgressConcept(db);

  // Define some constant IDs for testing
  const USER_ID_1: ID = freshID();
  const USER_ID_2: ID = freshID();
  const CHALLENGE_ID_1: ID = freshID();
  const CHALLENGE_ID_2: ID = freshID(); // For a second challenge to test isolation

  let part1_1: ID; // To store the ID of a specific part for testing completion

  await t.step("Trace: Fulfilling the Challenge Progress Principle", async (t) => {
    console.log("\n--- Trace: Fulfilling the Challenge Progress Principle ---");

    await t.step("[Action] Admin uploads Challenge 1 (2 weeks, 7 days/week)", async () => {
      console.log(`Uploading Challenge ${CHALLENGE_ID_1} with 2 weeks, 7 days/week.`);
      const result: Empty | { error: string } = await concept.uploadChallenge({
        challenge: CHALLENGE_ID_1,
        daysOfWeek: 7,
        weeks: 2,
      });
      assertEquals(result, {}, "Challenge 1 should be uploaded successfully");

      // Verify effect: challenge exists and parts are created
      const partsForChallenge1 = await concept._getParts({ challenge: CHALLENGE_ID_1 });
      assertEquals(
        partsForChallenge1.length,
        2 * 7,
        `Expected ${2 * 7} parts for Challenge ${CHALLENGE_ID_1}, got ${partsForChallenge1.length}`,
      );
      assertExists(partsForChallenge1.find(p => p.week === 1 && p.day === 1), "Part Week 1 Day 1 should exist");
      assertExists(partsForChallenge1.find(p => p.week === 2 && p.day === 7), "Part Week 2 Day 7 should exist");

      part1_1 = partsForChallenge1.find(p => p.week === 1 && p.day === 1)?.part as ID;
      assertExists(part1_1, "part1_1 should be retrieved");
      console.log(`Challenge ${CHALLENGE_ID_1} uploaded. Total parts: ${partsForChallenge1.length}`);
    });

    await t.step("[Requirement] Uploading an already uploaded challenge should fail", async () => {
      console.log(`Attempting to re-upload Challenge ${CHALLENGE_ID_1}.`);
      const result: Empty | { error: string } = await concept.uploadChallenge({
        challenge: CHALLENGE_ID_1,
        daysOfWeek: 5,
        weeks: 1,
      });
      assertNotEquals(result, {}, "Re-uploading should not succeed");
      assertEquals(result, { error: "Challenge already uploaded" }, "Should return 'Challenge already uploaded' error");
      console.log("Successfully prevented re-upload of Challenge 1.");
    });

    await t.step("[Action] User 1 completes Part Week 1 Day 1 of Challenge 1", async () => {
      console.log(`User ${USER_ID_1} completing part ${part1_1} (Week 1 Day 1) of Challenge ${CHALLENGE_ID_1}.`);
      const result: Empty | { error: string } = await concept.completePart({
        part: part1_1,
        user: USER_ID_1,
      });
      assertEquals(result, {}, `Completion for part ${part1_1} by user ${USER_ID_1} should succeed`);

      // Verify effect: Check completed parts for User 1
      const completedPartsUser1 = await concept._getCompletedParts({
        user: USER_ID_1,
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(completedPartsUser1.length, 1, "User 1 should have 1 completed part");
      assertEquals(completedPartsUser1[0].part, part1_1, "The completed part should be part1_1");
      console.log(`User ${USER_ID_1} successfully completed part ${part1_1}.`);
    });

    await t.step("[Requirement] Completing a non-existent part should fail", async () => {
      const NON_EXISTENT_PART_ID: ID = freshID();
      console.log(`User ${USER_ID_1} attempting to complete non-existent part ${NON_EXISTENT_PART_ID}.`);
      const result: Empty | { error: string } = await concept.completePart({
        part: NON_EXISTENT_PART_ID,
        user: USER_ID_1,
      });
      assertNotEquals(result, {}, "Completing non-existent part should fail");
      assertEquals(result, { error: "Part does not exist" }, "Should return 'Part does not exist' error");
      console.log("Successfully prevented completion of non-existent part.");
    });

    await t.step("[Action] User 1 completes another part of Challenge 1", async () => {
      const partsForChallenge1 = await concept._getParts({ challenge: CHALLENGE_ID_1 });
      const anotherPart: ID = partsForChallenge1.find(p => p.week === 1 && p.day === 2)?.part as ID;
      assertExists(anotherPart, "Another part (Week 1 Day 2) should exist");

      console.log(`User ${USER_ID_1} completing part ${anotherPart} (Week 1 Day 2) of Challenge ${CHALLENGE_ID_1}.`);
      const result: Empty | { error: string } = await concept.completePart({
        part: anotherPart,
        user: USER_ID_1,
      });
      assertEquals(result, {}, `Completion for part ${anotherPart} by user ${USER_ID_1} should succeed`);

      // Verify effect: Check completed parts for User 1
      const completedPartsUser1 = await concept._getCompletedParts({
        user: USER_ID_1,
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(completedPartsUser1.length, 2, "User 1 should now have 2 completed parts");
      const partIds = completedPartsUser1.map(p => p.part);
      assertExists(partIds.find(id => id === part1_1), "part1_1 should still be completed");
      assertExists(partIds.find(id => id === anotherPart), "anotherPart should now be completed");
      console.log(`User ${USER_ID_1} successfully completed part ${anotherPart}.`);
    });

    await t.step("[Action] User 2 completes a part of Challenge 1 (isolation check)", async () => {
      const partsForChallenge1 = await concept._getParts({ challenge: CHALLENGE_ID_1 });
      const user2Part: ID = partsForChallenge1.find(p => p.week === 1 && p.day === 3)?.part as ID;
      assertExists(user2Part, "User 2 part (Week 1 Day 3) should exist");

      console.log(`User ${USER_ID_2} completing part ${user2Part} (Week 1 Day 3) of Challenge ${CHALLENGE_ID_1}.`);
      const result: Empty | { error: string } = await concept.completePart({
        part: user2Part,
        user: USER_ID_2,
      });
      assertEquals(result, {}, `Completion for part ${user2Part} by user ${USER_ID_2} should succeed`);

      // Verify effect: Check completed parts for User 2
      const completedPartsUser2 = await concept._getCompletedParts({
        user: USER_ID_2,
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(completedPartsUser2.length, 1, "User 2 should have 1 completed part for Challenge 1");
      assertEquals(completedPartsUser2[0].part, user2Part, "User 2's completed part should be correct");

      // Ensure User 1's progress is unchanged
      const completedPartsUser1 = await concept._getCompletedParts({
        user: USER_ID_1,
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(completedPartsUser1.length, 2, "User 1's completed parts count should remain 2");
      console.log(`User ${USER_ID_2} successfully completed part ${user2Part}. Isolation confirmed.`);
    });

    await t.step("[Query] User 1 checks their completed parts for Challenge 1", async () => {
      console.log(`User ${USER_ID_1} querying completed parts for Challenge ${CHALLENGE_ID_1}.`);
      const completedParts: Array<{ part: ID; day: number; week: number }> =
        await concept._getCompletedParts({ user: USER_ID_1, challenge: CHALLENGE_ID_1 });

      assertEquals(completedParts.length, 2, "User 1 should have 2 completed parts");
      assertEquals(
        completedParts.filter(p => p.week === 1 && p.day === 1).length,
        1,
        "User 1 should have completed Week 1 Day 1",
      );
      assertEquals(
        completedParts.filter(p => p.week === 1 && p.day === 2).length,
        1,
        "User 1 should have completed Week 1 Day 2",
      );
      console.log(`User ${USER_ID_1} retrieved 2 completed parts for Challenge ${CHALLENGE_ID_1}.`);
    });

    await t.step("[Query] User 1 checks if all parts of Challenge 1 are completed (should be false)", async () => {
      console.log(`User ${USER_ID_1} checking if all parts of Challenge ${CHALLENGE_ID_1} are completed.`);
      const result: Array<{ allPartsCompleted: boolean }> = await concept._allPartsCompleted({
        user: USER_ID_1,
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(result.length, 1, "Should return an array with one result");
      assertEquals(
        result[0].allPartsCompleted,
        false,
        "User 1 should not have completed all parts of Challenge 1 yet",
      );
      console.log(`User ${USER_ID_1}: All parts completed status for Challenge ${CHALLENGE_ID_1} is FALSE.`);
    });

    await t.step("[Query] Admin gets all parts for Challenge 1", async () => {
      console.log(`Admin getting all parts for Challenge ${CHALLENGE_ID_1}.`);
      const allParts = await concept._getParts({ challenge: CHALLENGE_ID_1 });
      assertEquals(allParts.length, 14, "Challenge 1 should have 14 parts (2 weeks * 7 days)");
      console.log(`Admin retrieved all ${allParts.length} parts for Challenge ${CHALLENGE_ID_1}.`);
    });

    await t.step("[Action] Admin uploads Challenge 2 (1 week, 5 days/week) for isolation", async () => {
      console.log(`Uploading Challenge ${CHALLENGE_ID_2} with 1 week, 5 days/week.`);
      const result: Empty | { error: string } = await concept.uploadChallenge({
        challenge: CHALLENGE_ID_2,
        daysOfWeek: 5,
        weeks: 1,
      });
      assertEquals(result, {}, "Challenge 2 should be uploaded successfully");

      const partsForChallenge2 = await concept._getParts({ challenge: CHALLENGE_ID_2 });
      assertEquals(partsForChallenge2.length, 5, "Challenge 2 should have 5 parts");
      console.log(`Challenge ${CHALLENGE_ID_2} uploaded. Total parts: ${partsForChallenge2.length}`);

      // Ensure Challenge 1 parts are unaffected
      const partsForChallenge1 = await concept._getParts({ challenge: CHALLENGE_ID_1 });
      assertEquals(partsForChallenge1.length, 14, "Challenge 1 parts count should be unaffected by Challenge 2 upload");
    });

    await t.step("[Query] User 1 checks completed parts for non-existent challenge (should be empty)", async () => {
      const NON_EXISTENT_CHALLENGE_ID: ID = freshID();
      console.log(
        `User ${USER_ID_1} querying completed parts for non-existent challenge ${NON_EXISTENT_CHALLENGE_ID}.`,
      );
      const completedParts = await concept._getCompletedParts({
        user: USER_ID_1,
        challenge: NON_EXISTENT_CHALLENGE_ID,
      });
      assertEquals(completedParts.length, 0, "Should return an empty array for a non-existent challenge");
      console.log("Query for non-existent challenge returned empty as expected.");
    });

    await t.step("[Query] User 1 checks all parts completed for non-existent challenge (should be empty array)", async () => {
      const NON_EXISTENT_CHALLENGE_ID: ID = freshID();
      console.log(
        `User ${USER_ID_1} querying all parts completed for non-existent challenge ${NON_EXISTENT_CHALLENGE_ID}.`,
      );
      const result = await concept._allPartsCompleted({
        user: USER_ID_1,
        challenge: NON_EXISTENT_CHALLENGE_ID,
      });
      assertEquals(result.length, 0, "Should return an empty array for a non-existent challenge");
      console.log("Query for non-existent challenge returned empty array as expected for allPartsCompleted.");
    });

    await t.step("[Action] Admin removes Challenge 1", async () => {
      console.log(`Admin removing Challenge ${CHALLENGE_ID_1}.`);
      const result: Empty | { error: string } = await concept.removeChallenge({
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(result, {}, "Removing Challenge 1 should succeed");

      // Verify effects: Challenge, parts, and completions should be gone
      const uploadedChallenge = await db.collection("ChallengeProgress.UploadedChallenges").findOne({
        _id: CHALLENGE_ID_1,
      });
      assertEquals(uploadedChallenge, null, "Uploaded Challenge 1 should no longer exist");

      const partsCount = await db.collection("ChallengeProgress.Parts").countDocuments({
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(partsCount, 0, "All parts for Challenge 1 should be removed");

      const completionsCount = await db.collection("ChallengeProgress.Completions").countDocuments({
        challenge: CHALLENGE_ID_1,
      });
      assertEquals(completionsCount, 0, "All completions for Challenge 1 should be removed");

      // Ensure Challenge 2 is unaffected
      const partsForChallenge2 = await concept._getParts({ challenge: CHALLENGE_ID_2 });
      assertEquals(partsForChallenge2.length, 5, "Challenge 2 parts should be unaffected by Challenge 1 removal");
      console.log(`Challenge ${CHALLENGE_ID_1} successfully removed, along with its parts and completions.`);
    });

    await t.step("[Requirement] Removing a non-existent challenge should fail", async () => {
      const NON_EXISTENT_CHALLENGE_ID: ID = freshID();
      console.log(`Attempting to remove non-existent challenge ${NON_EXISTENT_CHALLENGE_ID}.`);
      const result: Empty | { error: string } = await concept.removeChallenge({
        challenge: NON_EXISTENT_CHALLENGE_ID,
      });
      assertNotEquals(result, {}, "Removing non-existent challenge should fail");
      assertEquals(result, { error: "Challenge is not uploaded" }, "Should return 'Challenge is not uploaded' error");
      console.log("Successfully prevented removal of non-existent challenge.");
    });

    console.log("\n--- Trace End ---");
  });

  await t.step("Individual Action Tests", async (t) => {
    const TEST_CHALLENGE_ID: ID = freshID();
    const TEST_USER_ID: ID = freshID();

    await t.step("`uploadChallenge` action tests", async (t) => {
      await t.step("[Valid]: Upload a new challenge", async () => {
        console.log(`  Uploading challenge ${TEST_CHALLENGE_ID}.`);
        const result: Empty | { error: string } = await concept.uploadChallenge({
          challenge: TEST_CHALLENGE_ID,
          daysOfWeek: 3,
          weeks: 1,
        });
        assertEquals(result, {}, "Should successfully upload challenge");

        const uploadedChallenge = await db.collection("ChallengeProgress.UploadedChallenges").findOne({
          _id: TEST_CHALLENGE_ID,
        });
        assertExists(uploadedChallenge, "Uploaded challenge document should exist");

        const parts = await concept._getParts({ challenge: TEST_CHALLENGE_ID });
        assertEquals(parts.length, 3, "Should create 3 parts (1 week * 3 days)");
        assertExists(parts.find(p => p.day === 1 && p.week === 1), "Part Week 1 Day 1 should exist");
        console.log("  New challenge uploaded and parts created.");
      });

      await t.step("[Invalid]: Upload an already existing challenge", async () => {
        console.log(`  Attempting to re-upload challenge ${TEST_CHALLENGE_ID}.`);
        const result: Empty | { error: string } = await concept.uploadChallenge({
          challenge: TEST_CHALLENGE_ID,
          daysOfWeek: 1,
          weeks: 1,
        });
        assertEquals(result, { error: "Challenge already uploaded" }, "Should return 'Challenge already uploaded' error");
        console.log("  Re-upload blocked as expected.");
      });
    });

    await t.step("`completePart` action tests", async (t) => {
      const parts = await concept._getParts({ challenge: TEST_CHALLENGE_ID });
      const existingPartId: ID = parts[0].part;
      const nonExistentPartId: ID = freshID();

      await t.step("[Valid]: Complete an existing part", async () => {
        console.log(`  User ${TEST_USER_ID} completing part ${existingPartId}.`);
        const result: Empty | { error: string } = await concept.completePart({
          part: existingPartId,
          user: TEST_USER_ID,
        });
        assertEquals(result, {}, "Should successfully complete the part");

        const completedParts = await concept._getCompletedParts({
          user: TEST_USER_ID,
          challenge: TEST_CHALLENGE_ID,
        });
        assertEquals(completedParts.length, 1, "User should have 1 completed part");
        assertEquals(completedParts[0].part, existingPartId, "The correct part should be marked as completed");
        console.log("  Existing part completed successfully.");
      });

      await t.step("[Invalid]: Complete a non-existent part", async () => {
        console.log(`  User ${TEST_USER_ID} attempting to complete non-existent part ${nonExistentPartId}.`);
        const result: Empty | { error: string } = await concept.completePart({
          part: nonExistentPartId,
          user: TEST_USER_ID,
        });
        assertEquals(result, { error: "Part does not exist" }, "Should return 'Part does not exist' error");
        console.log("  Completion of non-existent part blocked as expected.");
      });
    });

    await t.step("`removeChallenge` action tests", async (t) => {
      const NON_EXISTENT_CHALLENGE_ID: ID = freshID();

      await t.step("[Valid]: Remove an existing challenge", async () => {
        console.log(`  Removing challenge ${TEST_CHALLENGE_ID}.`);
        const result: Empty | { error: string } = await concept.removeChallenge({
          challenge: TEST_CHALLENGE_ID,
        });
        assertEquals(result, {}, "Should successfully remove the challenge");

        const uploadedChallenge = await db.collection("ChallengeProgress.UploadedChallenges").findOne({
          _id: TEST_CHALLENGE_ID,
        });
        assertEquals(uploadedChallenge, null, "Uploaded challenge document should be removed");

        const partsCount = await db.collection("ChallengeProgress.Parts").countDocuments({
          challenge: TEST_CHALLENGE_ID,
        });
        assertEquals(partsCount, 0, "All associated parts should be removed");

        const completionsCount = await db.collection("ChallengeProgress.Completions").countDocuments({
          challenge: TEST_CHALLENGE_ID,
        });
        assertEquals(completionsCount, 0, "All associated completions should be removed");
        console.log("  Existing challenge removed successfully, with cascading deletions.");
      });

      await t.step("[Invalid]: Remove a non-existent challenge", async () => {
        console.log(`  Attempting to remove non-existent challenge ${NON_EXISTENT_CHALLENGE_ID}.`);
        const result: Empty | { error: string } = await concept.removeChallenge({
          challenge: NON_EXISTENT_CHALLENGE_ID,
        });
        assertEquals(result, { error: "Challenge is not uploaded" }, "Should return 'Challenge is not uploaded' error");
        console.log("  Removal of non-existent challenge blocked as expected.");
      });
    });

    await t.step("Query function tests (`_getPartDayWeek`, `_getParts`, `_getCompletedParts`, `_allPartsCompleted`)", async (t) => {
      const queryChallengeId: ID = freshID();
      const queryUserId: ID = freshID();

      // Setup for queries
      await concept.uploadChallenge({ challenge: queryChallengeId, daysOfWeek: 2, weeks: 1 });
      const allParts = await concept._getParts({ challenge: queryChallengeId });
      const partA: ID = allParts.find(p => p.day === 1)?.part as ID;
      const partB: ID = allParts.find(p => p.day === 2)?.part as ID;

      await concept.completePart({ part: partA, user: queryUserId });

      await t.step("`_getPartDayWeek`", async () => {
        console.log("  Testing `_getPartDayWeek`...");
        const result = await concept._getPartDayWeek({ parts: [partA, partB, freshID()] }); // Include non-existent part
        assertEquals(result.length, 2, "Should return 2 valid part details");
        assertExists(result.find(r => r.part === partA && r.day === 1 && r.week === 1), "Part A details should be correct");
        assertExists(result.find(r => r.part === partB && r.day === 2 && r.week === 1), "Part B details should be correct");
        console.log("  `_getPartDayWeek` works correctly, ignoring non-existent parts.");
      });

      await t.step("`_getParts`", async () => {
        console.log("  Testing `_getParts`...");
        const result = await concept._getParts({ challenge: queryChallengeId });
        assertEquals(result.length, 2, "Should return all 2 parts for the challenge");
        assertExists(result.find(r => r.part === partA), "Part A should be listed");
        assertExists(result.find(r => r.part === partB), "Part B should be listed");

        const nonExistentChallengeParts = await concept._getParts({ challenge: freshID() });
        assertEquals(nonExistentChallengeParts.length, 0, "Should return empty array for non-existent challenge");
        console.log("  `_getParts` works correctly.");
      });

      await t.step("`_getCompletedParts`", async () => {
        console.log("  Testing `_getCompletedParts`...");
        const result = await concept._getCompletedParts({ user: queryUserId, challenge: queryChallengeId });
        assertEquals(result.length, 1, "Should return 1 completed part for the user");
        assertEquals(result[0].part, partA, "The completed part should be Part A");

        const noCompletionsUser = await concept._getCompletedParts({ user: freshID(), challenge: queryChallengeId });
        assertEquals(noCompletionsUser.length, 0, "Should return 0 for user with no completions");

        const nonExistentChallengeCompletions = await concept._getCompletedParts({ user: queryUserId, challenge: freshID() });
        assertEquals(nonExistentChallengeCompletions.length, 0, "Should return 0 for non-existent challenge");
        console.log("  `_getCompletedParts` works correctly.");
      });

      await t.step("`_allPartsCompleted`", async () => {
        console.log("  Testing `_allPartsCompleted`...");
        // Not all parts completed
        const result1 = await concept._allPartsCompleted({ user: queryUserId, challenge: queryChallengeId });
        assertEquals(result1.length, 1, "Should return an array with one result");
        assertEquals(result1[0].allPartsCompleted, false, "Should be false as only 1 of 2 parts is completed");

        // Complete the remaining part
        await concept.completePart({ part: partB, user: queryUserId });
        const result2 = await concept._allPartsCompleted({ user: queryUserId, challenge: queryChallengeId });
        assertEquals(result2.length, 1, "Should return an array with one result");
        assertEquals(result2[0].allPartsCompleted, true, "Should be true as all 2 parts are now completed");

        const nonExistentChallengeAllCompleted = await concept._allPartsCompleted({ user: queryUserId, challenge: freshID() });
        assertEquals(nonExistentChallengeAllCompleted.length, 0, "Should return empty array for non-existent challenge");
        console.log("  `_allPartsCompleted` works correctly.");
      });
      // Cleanup after query tests
      await concept.removeChallenge({ challenge: queryChallengeId });
    });
  });

  await client.close();
});