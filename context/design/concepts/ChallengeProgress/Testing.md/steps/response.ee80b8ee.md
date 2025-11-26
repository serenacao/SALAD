---
timestamp: 'Tue Nov 25 2025 11:26:58 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_112658.29757587.md]]'
content_id: ee80b8ee56969ec63fbbff30acc59afca8d3a06e6bcbf8cba2c3fbad0dd7491b
---

# response:

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

Deno.test("ChallengeProgress Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeProgressConcept(db);

  // Helper IDs for testing
  const USER_1 = freshID();
  const USER_2 = freshID();
  const CHALLENGE_1 = freshID();
  const CHALLENGE_2 = freshID(); // For negative testing

  await t.step("[Action]: uploadChallenge - Successfully uploads a new challenge", async () => {
    console.log("Trace: Attempting to upload Challenge 1 with 2 weeks and 3 days per week.");
    const result = await concept.uploadChallenge({
      challenge: CHALLENGE_1,
      daysOfWeek: 3,
      weeks: 2,
    });

    assertEquals(result, {}, "Uploading a new challenge should return an empty object on success.");

    // Verify effects: Challenge 1 should be in uploadedChallenges
    const uploadedChallenge = await db.collection("ChallengeProgress.UploadedChallenges").findOne({ _id: CHALLENGE_1 });
    assertExists(uploadedChallenge, "Challenge 1 should be found in uploadedChallenges collection.");

    // Verify effects: Parts for Challenge 1 should be created
    const partsForChallenge = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    assertEquals(partsForChallenge.length, 3 * 2, "6 parts (3 days * 2 weeks) should be created for Challenge 1.");
    partsForChallenge.forEach(part => {
      assertExists(part._id, "Each part should have an ID.");
      assertEquals(part.challenge, CHALLENGE_1, "Each part should belong to Challenge 1.");
      assertNotEquals(part.day, 0, "Day should be greater than 0.");
      assertNotEquals(part.week, 0, "Week should be greater than 0.");
    });
    console.log(`Effect: Challenge 1 added and ${partsForChallenge.length} parts generated.`);
  });

  await t.step("[Action]: uploadChallenge - Fails to upload an already existing challenge", async () => {
    console.log("Trace: Attempting to upload Challenge 1 again.");
    const result = await concept.uploadChallenge({
      challenge: CHALLENGE_1,
      daysOfWeek: 1,
      weeks: 1,
    });

    assertEquals(result, { error: "Challenge already uploaded" }, "Uploading an existing challenge should return an error.");
    console.log("Requirement: Challenge 1 was already uploaded, so the action failed with the expected error.");
  });

  await t.step("[Action]: completePart - Successfully completes a part for a user", async () => {
    console.log("Trace: Fetching a part from Challenge 1 to complete.");
    const parts = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    const partToComplete = parts[0]._id.toString() as ID; // Get the ID of the first part

    console.log(`Trace: User 1 completing part ${partToComplete}.`);
    const result = await concept.completePart({ part: partToComplete, user: USER_1 });

    assertEquals(result, {}, "Completing an existing part should return an empty object on success.");

    // Verify effects: A completion record should be created
    const completion = await db.collection("ChallengeProgress.Completions").findOne({ part: partToComplete, user: USER_1 });
    assertExists(completion, "A completion record should exist for User 1 and the specified part.");
    assertEquals(completion.challenge, CHALLENGE_1, "The completion record should link to Challenge 1.");
    console.log(`Effect: User 1 successfully completed part ${partToComplete}.`);
  });

  await t.step("[Action]: completePart - Fails to complete a non-existent part", async () => {
    const nonExistentPart = freshID();
    console.log(`Trace: User 1 attempting to complete non-existent part ${nonExistentPart}.`);
    const result = await concept.completePart({ part: nonExistentPart, user: USER_1 });

    assertEquals(result, { error: "Part does not exist" }, "Completing a non-existent part should return an error.");
    console.log("Requirement: Non-existent part, so the action failed with the expected error.");
  });

  await t.step("[Query]: _getPartDayWeek - Retrieves day and week for a list of parts", async () => {
    console.log("Trace: Uploading Challenge 2 to get more parts for testing this query.");
    await concept.uploadChallenge({ challenge: CHALLENGE_2, daysOfWeek: 1, weeks: 1 });
    const partsForChallenge2 = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_2 }).toArray();
    const part2_1 = partsForChallenge2[0]._id.toString() as ID;

    const partsForChallenge1 = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    const part1_1 = partsForChallenge1[0]._id.toString() as ID;
    const part1_2 = partsForChallenge1[1]._id.toString() as ID;

    const nonExistentPart = freshID();
    const inputParts = [part1_1, part1_2, part2_1, nonExistentPart];
    console.log(`Trace: Querying details for parts: ${inputParts.join(', ')}.`);

    const result = await concept._getPartDayWeek({ parts: inputParts });

    assertEquals(result.length, 3, "Only existing parts should be returned.");
    const sortedResult = result.sort((a, b) => a.part.localeCompare(b.part));
    
    assertExists(sortedResult.find(p => p.part === part1_1), "Should contain details for part1_1.");
    assertExists(sortedResult.find(p => p.part === part1_2), "Should contain details for part1_2.");
    assertExists(sortedResult.find(p => p.part === part2_1), "Should contain details for part2_1.");
    
    // Verify specific details for one part
    const foundPart1_1 = sortedResult.find(p => p.part === part1_1);
    assertExists(foundPart1_1);
    assertEquals(foundPart1_1.day, partsForChallenge1[0].day, "Day should match for part1_1.");
    assertEquals(foundPart1_1.week, partsForChallenge1[0].week, "Week should match for part1_1.");
    console.log(`Effect: Retrieved day/week information for the existing parts.`);
  });

  await t.step("[Query]: _getParts - Retrieves all parts for a given challenge", async () => {
    console.log("Trace: Querying all parts for Challenge 1.");
    const result = await concept._getParts({ challenge: CHALLENGE_1 });

    const expectedPartsCount = (await db.collection("ChallengeProgress.Parts").countDocuments({ challenge: CHALLENGE_1 }));
    assertEquals(result.length, expectedPartsCount, `Should return ${expectedPartsCount} parts for Challenge 1.`);
    result.forEach(p => {
      assertExists(p.part, "Each part should have an ID.");
      assertExists(p.day, "Each part should have a day.");
      assertExists(p.week, "Each part should have a week.");
    });
    console.log(`Effect: Successfully retrieved ${result.length} parts for Challenge 1.`);

    console.log("Trace: Querying all parts for a non-existent challenge.");
    const nonExistentChallengeParts = await concept._getParts({ challenge: freshID() });
    assertEquals(nonExistentChallengeParts.length, 0, "Should return an empty array for a non-existent challenge.");
    console.log("Effect: Returned an empty array for a non-existent challenge as expected.");

    console.log("Trace: Querying all parts for a challenge that was uploaded but might not have parts (e.g., if somehow corrupted, though our upload prevents this).");
    const uploadedChallengeWithoutParts = freshID();
    await db.collection("ChallengeProgress.UploadedChallenges").insertOne({ _id: uploadedChallengeWithoutParts }); // Simulate a challenge existing without parts
    const partsForCorruptedChallenge = await concept._getParts({ challenge: uploadedChallengeWithoutParts });
    assertEquals(partsForCorruptedChallenge.length, 0, "Should return an empty array if an uploaded challenge has no associated parts.");
    await db.collection("ChallengeProgress.UploadedChallenges").deleteOne({ _id: uploadedChallengeWithoutParts }); // Clean up
    console.log("Effect: Returned an empty array for a challenge with no associated parts.");
  });


  await t.step("[Query]: _getCompletedParts - Retrieves completed parts for a user in a challenge", async () => {
    // Complete a few more parts for USER_1 in CHALLENGE_1
    const parts = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    const part2 = parts[1]._id.toString() as ID;
    const part3 = parts[2]._id.toString() as ID;

    console.log(`Trace: User 1 completing part ${part2} and part ${part3}.`);
    await concept.completePart({ part: part2, user: USER_1 });
    await concept.completePart({ part: part3, user: USER_1 });

    console.log("Trace: Querying completed parts for User 1 in Challenge 1.");
    const completedPartsUser1 = await concept._getCompletedParts({ user: USER_1, challenge: CHALLENGE_1 });
    assertEquals(completedPartsUser1.length, 3, "User 1 should have 3 completed parts for Challenge 1.");
    assertExists(completedPartsUser1.find(p => p.part === parts[0]._id.toString() as ID), "First part should be in completed list.");
    assertExists(completedPartsUser1.find(p => p.part === part2), "Second part should be in completed list.");
    assertExists(completedPartsUser1.find(p => p.part === part3), "Third part should be in completed list.");
    console.log(`Effect: User 1 has ${completedPartsUser1.length} completed parts for Challenge 1.`);

    console.log("Trace: Querying completed parts for User 2 (who completed none) in Challenge 1.");
    const completedPartsUser2 = await concept._getCompletedParts({ user: USER_2, challenge: CHALLENGE_1 });
    assertEquals(completedPartsUser2.length, 0, "User 2 should have 0 completed parts for Challenge 1.");
    console.log("Effect: User 2 has no completed parts as expected.");

    console.log("Trace: Querying completed parts for a non-existent challenge.");
    const nonExistentChallengeCompleted = await concept._getCompletedParts({ user: USER_1, challenge: freshID() });
    assertEquals(nonExistentChallengeCompleted.length, 0, "Should return an empty array for a non-existent challenge.");
    console.log("Effect: Returned an empty array for a non-existent challenge.");
  });

  await t.step("[Query]: _allPartsCompleted - Checks if all parts of a challenge are completed by a user", async () => {
    const totalPartsChallenge1 = (await db.collection("ChallengeProgress.Parts").countDocuments({ challenge: CHALLENGE_1 }));
    const completedPartsUser1Count = (await db.collection("ChallengeProgress.Completions").countDocuments({ user: USER_1, challenge: CHALLENGE_1 }));

    console.log(`Trace: Current completed parts for User 1: ${completedPartsUser1Count}. Total parts for Challenge 1: ${totalPartsChallenge1}.`);
    console.log("Trace: Querying _allPartsCompleted for User 1 in Challenge 1 (not all parts completed yet).");
    const resultNotCompleted = await concept._allPartsCompleted({ user: USER_1, challenge: CHALLENGE_1 });
    assertEquals(resultNotCompleted.length, 1, "Should return one result object.");
    assertEquals(resultNotCompleted[0].allPartsCompleted, false, "Not all parts should be completed by User 1 yet.");
    console.log("Effect: `allPartsCompleted` is false, as expected.");

    console.log("Trace: Completing remaining parts for User 1 in Challenge 1.");
    const remainingParts = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    const completedPartIds = (await db.collection("ChallengeProgress.Completions").find({ user: USER_1, challenge: CHALLENGE_1 }).toArray()).map(c => c.part);
    for (const part of remainingParts) {
      if (!completedPartIds.includes(part._id.toString() as ID)) {
        await concept.completePart({ part: part._id.toString() as ID, user: USER_1 });
      }
    }
    const finalCompletedCount = (await db.collection("ChallengeProgress.Completions").countDocuments({ user: USER_1, challenge: CHALLENGE_1 }));
    assertEquals(finalCompletedCount, totalPartsChallenge1, "All parts should now be completed by User 1.");
    console.log(`Effect: User 1 has now completed all ${finalCompletedCount} parts.`);


    console.log("Trace: Querying _allPartsCompleted for User 1 in Challenge 1 (all parts now completed).");
    const resultAllCompleted = await concept._allPartsCompleted({ user: USER_1, challenge: CHALLENGE_1 });
    assertEquals(resultAllCompleted.length, 1, "Should return one result object.");
    assertEquals(resultAllCompleted[0].allPartsCompleted, true, "All parts should now be completed by User 1.");
    console.log("Effect: `allPartsCompleted` is true, as expected.");

    console.log("Trace: Querying _allPartsCompleted for User 2 (completed no parts) in Challenge 1.");
    const resultUser2 = await concept._allPartsCompleted({ user: USER_2, challenge: CHALLENGE_1 });
    assertEquals(resultUser2.length, 1, "Should return one result object.");
    assertEquals(resultUser2[0].allPartsCompleted, false, "User 2 should not have all parts completed.");
    console.log("Effect: `allPartsCompleted` is false for User 2, as expected.");

    console.log("Trace: Querying _allPartsCompleted for a non-existent challenge.");
    const nonExistentChallengeCompletion = await concept._allPartsCompleted({ user: USER_1, challenge: freshID() });
    assertEquals(nonExistentChallengeCompletion.length, 0, "Should return an empty array for a non-existent challenge.");
    console.log("Effect: Returned an empty array for a non-existent challenge.");
  });

  await t.step("[Action]: removeChallenge - Successfully removes an existing challenge and its associated data", async () => {
    console.log("Trace: Removing Challenge 1.");
    const result = await concept.removeChallenge({ challenge: CHALLENGE_1 });

    assertEquals(result, {}, "Removing an existing challenge should return an empty object on success.");

    // Verify effects: Challenge 1 should be gone from uploadedChallenges
    const uploadedChallenge = await db.collection("ChallengeProgress.UploadedChallenges").findOne({ _id: CHALLENGE_1 });
    assertEquals(uploadedChallenge, null, "Challenge 1 should not be found in uploadedChallenges collection after removal.");

    // Verify effects: Parts for Challenge 1 should be gone
    const partsForChallenge = await db.collection("ChallengeProgress.Parts").find({ challenge: CHALLENGE_1 }).toArray();
    assertEquals(partsForChallenge.length, 0, "No parts should exist for Challenge 1 after removal.");

    // Verify effects: Completions for Challenge 1 should be gone
    const completionsForChallenge = await db.collection("ChallengeProgress.Completions").find({ challenge: CHALLENGE_1 }).toArray();
    assertEquals(completionsForChallenge.length, 0, "No completions should exist for Challenge 1 after removal.");
    console.log("Effect: Challenge 1 and all its associated parts and completions have been successfully removed.");

    console.log("Trace: Removing Challenge 2.");
    const result2 = await concept.removeChallenge({ challenge: CHALLENGE_2 });
    assertEquals(result2, {}, "Removing Challenge 2 should also be successful.");
    const uploadedChallenge2 = await db.collection("ChallengeProgress.UploadedChallenges").findOne({ _id: CHALLENGE_2 });
    assertEquals(uploadedChallenge2, null, "Challenge 2 should not be found after removal.");
    console.log("Effect: Challenge 2 and its associated data removed.");
  });

  await t.step("[Action]: removeChallenge - Fails to remove a non-existent challenge", async () => {
    const nonExistentChallenge = freshID();
    console.log(`Trace: Attempting to remove non-existent challenge ${nonExistentChallenge}.`);
    const result = await concept.removeChallenge({ challenge: nonExistentChallenge });

    assertEquals(result, { error: "Challenge is not uploaded" }, "Removing a non-existent challenge should return an error.");
    console.log("Requirement: Non-existent challenge, so the action failed with the expected error.");
  });


  await client.close();
});
```
