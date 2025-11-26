---
timestamp: 'Tue Nov 25 2025 09:15:05 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_091505.46ff6841.md]]'
content_id: 31af2ff0a5f553239c59bfe3099e86a7911dfab069b4dac080e027365f7369ea
---

# response:

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID generates string IDs
import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";

Deno.test("ChallengeProgressConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeProgressConcept(db);

  // Declare some common IDs to use across tests
  const challenge1Id = freshID() as ID;
  const challenge2Id = freshID() as ID;
  const user1Id = freshID() as ID;
  const user2Id = freshID() as ID;

  // --- I. Action Tests ---

  await t.step("[Action]: uploadChallenge - Successfully uploads a new challenge", async () => {
    const daysOfWeek = 2;
    const weeks = 2;
    const result = await concept.uploadChallenge({
      challenge: challenge1Id,
      daysOfWeek,
      weeks,
    });

    assertEquals(result, {}, "Should return an empty object on successful upload");

    // Verify UploadedChallengeDoc
    const uploadedChallengesCollection = db.collection("ChallengeProgress.UploadedChallenges");
    const uploadedChallenge = await uploadedChallengesCollection.findOne({ _id: challenge1Id });
    assertEquals(uploadedChallenge?._id, challenge1Id, "Uploaded challenge document should exist");

    // Verify PartDocs
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const parts = await partsCollection.find({ challenge: challenge1Id }).toArray();
    assertEquals(parts.length, daysOfWeek * weeks, `Should create ${daysOfWeek * weeks} parts`);

    // Check specific part properties
    const part1_1 = parts.find(p => p.day === 1 && p.week === 1);
    assertEquals(part1_1?.challenge, challenge1Id, "Part (1,1) should be linked to challenge1Id");
    assertEquals(part1_1?.day, 1, "Part (1,1) should have day 1");
    assertEquals(part1_1?.week, 1, "Part (1,1) should have week 1");
  });

  await t.step("[Action]: uploadChallenge - Fails if challenge already uploaded", async () => {
    const result = await concept.uploadChallenge({
      challenge: challenge1Id,
      daysOfWeek: 1,
      weeks: 1,
    });
    assertEquals(result, { error: "Challenge already uploaded" }, "Should return error for duplicate upload");
  });

  await t.step("[Action]: removeChallenge - Fails if challenge is not uploaded", async () => {
    const result = await concept.removeChallenge({ challenge: freshID() as ID });
    assertEquals(result, { error: "Challenge is not uploaded" }, "Should return error for non-existent challenge");
  });

  await t.step("[Action]: removeChallenge - Successfully removes an existing challenge", async () => {
    // First, upload a second challenge to ensure it exists
    await concept.uploadChallenge({
      challenge: challenge2Id,
      daysOfWeek: 1,
      weeks: 1,
    });

    // Get a part from challenge2Id to complete it later,
    // to check if completions are deleted (expected: not deleted by current implementation)
    const challenge2Parts = await db.collection("ChallengeProgress.Parts").find({ challenge: challenge2Id }).toArray();
    const partOfChallenge2Id = challenge2Parts[0]._id;
    await concept.completePart({ part: partOfChallenge2Id, user: user1Id });
    const completionsCollection = db.collection("ChallengeProgress.Completions");
    const initialCompletionsCount = await completionsCollection.countDocuments({ part: partOfChallenge2Id });
    assertEquals(initialCompletionsCount, 1, "Should have one completion for partOfChallenge2Id before removal");

    // Remove challenge2
    const result = await concept.removeChallenge({ challenge: challenge2Id });
    assertEquals(result, {}, "Should return an empty object on successful removal");

    // Verify UploadedChallengeDoc is deleted
    const uploadedChallengesCollection = db.collection("ChallengeProgress.UploadedChallenges");
    const uploadedChallenge = await uploadedChallengesCollection.findOne({ _id: challenge2Id });
    assertEquals(uploadedChallenge, null, "Uploaded challenge document should be deleted");

    // Verify PartDocs are deleted
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const parts = await partsCollection.find({ challenge: challenge2Id }).toArray();
    assertEquals(parts.length, 0, "All parts for the challenge should be deleted");

    // Verify CompletionDocs are NOT deleted (current concept implementation does not cascade delete completions)
    const remainingCompletionsCount = await completionsCollection.countDocuments({ part: partOfChallenge2Id });
    assertEquals(remainingCompletionsCount, 1, "Completions for deleted parts should remain (as per current implementation)");
  });

  let challenge1PartId: ID;

  await t.step("[Action]: completePart - Fails if part does not exist", async () => {
    const result = await concept.completePart({ part: freshID() as ID, user: user1Id });
    assertEquals(result, { error: "Part does not exist" }, "Should return error for non-existent part");
  });

  await t.step("[Action]: completePart - Successfully completes an existing part", async () => {
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const challenge1Parts = await partsCollection.find({ challenge: challenge1Id }).toArray();
    challenge1PartId = challenge1Parts[0]._id; // Get the ID of the first part of challenge1

    const result = await concept.completePart({ part: challenge1PartId, user: user1Id });
    assertEquals(result, {}, "Should return an empty object on successful completion");

    // Verify CompletionDoc is created
    const completionsCollection = db.collection("ChallengeProgress.Completions");
    const completion = await completionsCollection.findOne({ part: challenge1PartId, user: user1Id });
    assertEquals(completion?.part, challenge1PartId, "Completion document should exist for the part");
    assertEquals(completion?.user, user1Id, "Completion document should be linked to the user");
  });

  await t.step("[Action]: completePart - Allows completing the same part multiple times by the same user", async () => {
    // Complete the same part again
    const result = await concept.completePart({ part: challenge1PartId, user: user1Id });
    assertEquals(result, {}, "Should return an empty object on second completion");

    const completionsCollection = db.collection("ChallengeProgress.Completions");
    const completions = await completionsCollection.find({ part: challenge1PartId, user: user1Id }).toArray();
    assertEquals(completions.length, 2, "Should have two completion documents for the same part by the same user");
  });

  // --- II. Query/Getter Tests ---

  await t.step("[Query]: _getPartDayWeek - Retrieves details for given parts", async () => {
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const allChallenge1Parts = await partsCollection.find({ challenge: challenge1Id }).toArray();
    const partIds = allChallenge1Parts.map(p => p._id).slice(0, 2); // Take first two part IDs

    const result = await concept._getPartDayWeek({ parts: partIds });

    assertEquals(result.length, 2, "Should return details for 2 parts");
    assertEquals(result[0].part, partIds[0], "First returned part ID should match input");
    assertEquals(result[0].day, allChallenge1Parts.find(p => p._id === partIds[0])?.day, "First returned part day should match");
  });

  await t.step("[Query]: _getPartDayWeek - Handles non-existent parts gracefully", async () => {
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const allChallenge1Parts = await partsCollection.find({ challenge: challenge1Id }).toArray();
    const existingPartId = allChallenge1Parts[0]._id;
    const nonExistentPartId = freshID() as ID;

    const result = await concept._getPartDayWeek({ parts: [existingPartId, nonExistentPartId] });

    assertEquals(result.length, 1, "Should only return details for the existing part");
    assertEquals(result[0].part, existingPartId, "Should return the existing part's ID");
  });

  await t.step("[Query]: _getParts - Retrieves all parts for an uploaded challenge", async () => {
    const daysOfWeek = 2;
    const weeks = 2; // Challenge 1 was uploaded with 2*2=4 parts
    const result = await concept._getParts({ challenge: challenge1Id });

    assertEquals(result.length, daysOfWeek * weeks, `Should return ${daysOfWeek * weeks} parts for challenge1`);
    assertEquals(result[0].challenge, undefined, "Output objects should not contain the challenge ID directly");
    assertEquals(result[0].part, (await db.collection("ChallengeProgress.Parts").findOne({ challenge: challenge1Id }))?._id, "First part ID should match a part in the challenge");
  });

  await t.step("[Query]: _getParts - Returns empty array for a non-uploaded challenge", async () => {
    const result = await concept._getParts({ challenge: freshID() as ID });
    assertEquals(result.length, 0, "Should return an empty array for a non-existent challenge");
  });

  await t.step("[Query]: _getCompletedParts - Retrieves completed parts for a user in a challenge", async () => {
    // We completed challenge1PartId twice for user1Id
    const result = await concept._getCompletedParts({ user: user1Id, challenge: challenge1Id });

    assertEquals(result.length, 2, "Should return 2 completed parts for user1 in challenge1 (due to double completion)");
    assertEquals(result[0].part, challenge1PartId, "The completed part ID should match");
    assertEquals(result[0].day, (await db.collection("ChallengeProgress.Parts").findOne({ _id: challenge1PartId }))?.day, "The completed part day should match");
  });

  await t.step("[Query]: _getCompletedParts - Returns empty array for user with no completions", async () => {
    const result = await concept._getCompletedParts({ user: user2Id, challenge: challenge1Id });
    assertEquals(result.length, 0, "Should return an empty array for user with no completions");
  });

  await t.step("[Query]: _getCompletedParts - Returns empty array for a non-uploaded challenge", async () => {
    const result = await concept._getCompletedParts({ user: user1Id, challenge: freshID() as ID });
    assertEquals(result.length, 0, "Should return an empty array for a non-existent challenge");
  });

  await t.step("[Query]: _allPartsCompleted - Checks completion status for a user in a challenge", async () => {
    // User1 has completed 1 part (twice counted) out of 4 total parts for challenge1
    const status1 = await concept._allPartsCompleted({ user: user1Id, challenge: challenge1Id });
    assertEquals(status1, [{ allPartsCompleted: false }], "User1 has not completed all parts of challenge1");

    // Complete remaining parts for user1 in challenge1
    const partsCollection = db.collection("ChallengeProgress.Parts");
    const allChallenge1Parts = await partsCollection.find({ challenge: challenge1Id }).toArray();
    for (const part of allChallenge1Parts) {
      if (part._id !== challenge1PartId) { // Skip the one already completed by user1
        await concept.completePart({ part: part._id, user: user1Id });
      }
    }

    // Now, user1 should have completed all parts (4 unique parts)
    const status2 = await concept._allPartsCompleted({ user: user1Id, challenge: challenge1Id });
    assertEquals(status2, [{ allPartsCompleted: true }], "User1 should now have completed all parts of challenge1");

    // User2 has completed 0 parts
    const status3 = await concept._allPartsCompleted({ user: user2Id, challenge: challenge1Id });
    assertEquals(status3, [{ allPartsCompleted: false }], "User2 has not completed any parts of challenge1");
  });

  await t.step("[Query]: _allPartsCompleted - Returns empty array for a non-uploaded challenge", async () => {
    const status = await concept._allPartsCompleted({ user: user1Id, challenge: freshID() as ID });
    assertEquals(status.length, 0, "Should return an empty array for a non-existent challenge");
  });

  // --- III. Principle Demonstration ---
  await t.step("Principle: Users can progress through a defined challenge by completing its individual parts, and their overall progress can be tracked.", async () => {
    // 1. Upload a challenge (defining its structure: weeks, days).
    const principleChallengeId = freshID() as ID;
    const principleUserAId = freshID() as ID;
    const principleUserBId = freshID() as ID;
    const days = 3;
    const weeks = 2; // Total parts = 6
    await t.step("  [Principle Step 1]: Upload a new challenge.", async () => {
      const uploadResult = await concept.uploadChallenge({ challenge: principleChallengeId, daysOfWeek: days, weeks: weeks });
      assertEquals(uploadResult, {}, "Challenge should be uploaded successfully.");
      const allParts = await concept._getParts({ challenge: principleChallengeId });
      assertEquals(allParts.length, days * weeks, `Challenge should have ${days * weeks} parts.`);
      assertEquals((await concept._allPartsCompleted({ user: principleUserAId, challenge: principleChallengeId })), [{ allPartsCompleted: false }], "User A has no parts completed yet.");
    });

    // 2. User A completes some parts.
    let userAPartsCompleted: Array<ID> = [];
    await t.step("  [Principle Step 2]: User A completes some parts.", async () => {
      const allParts = await concept._getParts({ challenge: principleChallengeId });
      const part1 = allParts.find(p => p.day === 1 && p.week === 1)?.part as ID;
      const part2 = allParts.find(p => p.day === 2 && p.week === 1)?.part as ID;

      await concept.completePart({ part: part1, user: principleUserAId });
      await concept.completePart({ part: part2, user: principleUserAId });
      userAPartsCompleted.push(part1, part2);

      const userAProgress = await concept._getCompletedParts({ user: principleUserAId, challenge: principleChallengeId });
      assertEquals(userAProgress.length, 2, "User A should have completed 2 parts.");
      const completedIds = userAProgress.map(p => p.part);
      assertEquals(completedIds.includes(part1), true, "Part 1 should be in user A's completed list.");
      assertEquals(completedIds.includes(part2), true, "Part 2 should be in user A's completed list.");

      assertEquals((await concept._allPartsCompleted({ user: principleUserAId, challenge: principleChallengeId })), [{ allPartsCompleted: false }], "User A has not completed all parts yet.");
    });

    // 3. User B completes all parts.
    await t.step("  [Principle Step 3]: User B completes all parts.", async () => {
      const allParts = await concept._getParts({ challenge: principleChallengeId });
      for (const part of allParts) {
        await concept.completePart({ part: part.part, user: principleUserBId });
      }

      const userBProgress = await concept._getCompletedParts({ user: principleUserBId, challenge: principleChallengeId });
      assertEquals(userBProgress.length, days * weeks, `User B should have completed all ${days * weeks} parts.`);

      assertEquals((await concept._allPartsCompleted({ user: principleUserBId, challenge: principleChallengeId })), [{ allPartsCompleted: true }], "User B should have completed all parts.");
    });

    // 4. Remove the challenge.
    await t.step("  [Principle Step 4]: Remove the challenge.", async () => {
      const removeResult = await concept.removeChallenge({ challenge: principleChallengeId });
      assertEquals(removeResult, {}, "Challenge should be removed successfully.");

      const uploadedChallengesCollection = db.collection("ChallengeProgress.UploadedChallenges");
      const uploadedChallenge = await uploadedChallengesCollection.findOne({ _id: principleChallengeId });
      assertEquals(uploadedChallenge, null, "Uploaded challenge document should be deleted.");

      const partsCollection = db.collection("ChallengeProgress.Parts");
      const parts = await partsCollection.find({ challenge: principleChallengeId }).toArray();
      assertEquals(parts.length, 0, "All parts for the challenge should be deleted.");

      // Verify progress queries reflect the removal
      const userAProgressAfterRemoval = await concept._getCompletedParts({ user: principleUserAId, challenge: principleChallengeId });
      assertEquals(userAProgressAfterRemoval.length, 0, "User A's progress should be empty after challenge removal.");

      const userBCompletionStatusAfterRemoval = await concept._allPartsCompleted({ user: principleUserBId, challenge: principleChallengeId });
      assertEquals(userBCompletionStatusAfterRemoval.length, 0, "User B's completion status should be empty after challenge removal.");

      // Check if completions still exist in the completions collection (as per current design)
      const completionsCollection = db.collection("ChallengeProgress.Completions");
      const userACompletions = await completionsCollection.find({ user: principleUserAId, part: { $in: userAPartsCompleted } }).toArray();
      assertEquals(userACompletions.length, userAPartsCompleted.length, "User A's raw completion records should still exist after challenge removal if their parts were deleted.");
    });
  });

  await client.close();
});
```
