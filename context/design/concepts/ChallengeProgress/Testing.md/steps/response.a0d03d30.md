---
timestamp: 'Tue Nov 25 2025 09:22:31 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_092231.f88350b5.md]]'
content_id: a0d03d30be7a69acc50d07ae26d19727398e80472ce7263330829a080f124d08
---

# response:

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts

import { Collection, Db, ObjectId } from "npm:mongodb";
import {
  assertEquals,
  assertExists,
  assertFalse,
  assertNotEquals,
  assertObjectMatch,
  assertTrue,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID generates string IDs

import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";

// Declare collection prefix, use concept name for direct collection access verification
const PREFIX = "ChallengeProgress" + ".";

// Redefine interfaces for direct collection access typing
interface PartDoc {
  _id: ID;
  challenge: ID;
  day: number;
  week: number;
}

interface CompletionDoc {
  _id: ID;
  part: ID;
  user: ID;
}

interface UploadedChallengeDoc {
  _id: ID;
}

Deno.test("ChallengeProgressConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeProgressConcept(db);

  // Direct access to collections for verification purposes (not through the concept instance)
  const partsCollection: Collection<PartDoc> = db.collection(PREFIX + "Parts");
  const completionsCollection: Collection<CompletionDoc> = db.collection(
    PREFIX + "Completions",
  );
  const uploadedChallengesCollection: Collection<UploadedChallengeDoc> =
    db.collection(PREFIX + "UploadedChallenges");

  // Generate common IDs for testing
  const challengeId_1: ID = freshID();
  const challengeId_2: ID = freshID();
  const userId_1: ID = freshID();
  const userId_2: ID = freshID();

  // --- Action Test: uploadChallenge ---
  await t.step(
    "uploadChallenge: should successfully upload a new challenge and create parts",
    async () => {
      console.log(
        "Trace: Attempting to upload Challenge 1 with 2 weeks and 3 days per week.",
      );
      const result = await concept.uploadChallenge({
        challenge: challengeId_1,
        daysOfWeek: 3,
        weeks: 2,
      });

      assertEquals(result, {}, "Upload should succeed with an empty object");

      // Verify effects: Challenge 1 should be in uploadedChallenges
      const uploadedChallenge = await uploadedChallengesCollection.findOne({
        _id: challengeId_1,
      });
      assertExists(
        uploadedChallenge,
        "Challenge 1 should be recorded as uploaded",
      );
      assertEquals(uploadedChallenge._id, challengeId_1, "Challenge ID matches");

      // Verify effects: Parts should be created for Challenge 1
      const parts = await partsCollection.find({ challenge: challengeId_1 })
        .toArray();
      assertEquals(parts.length, 3 * 2, "6 parts should be created");
      assertObjectMatch(parts[0], { challenge: challengeId_1, week: 1, day: 1 });
      assertObjectMatch(parts[5], { challenge: challengeId_1, week: 2, day: 3 });
      console.log(
        `Verified: Challenge ${challengeId_1} uploaded and ${parts.length} parts created.`,
      );
    },
  );

  await t.step(
    "uploadChallenge: should return an error if challenge is already uploaded",
    async () => {
      console.log("Trace: Attempting to re-upload Challenge 1.");
      const result = await concept.uploadChallenge({
        challenge: challengeId_1,
        daysOfWeek: 1,
        weeks: 1,
      });
      assertNotEquals(result, {}, "Re-upload should not succeed");
      assertEquals(
        (result as { error: string }).error,
        "Challenge already uploaded",
        "Error message should indicate existing challenge",
      );
      console.log(
        `Verified: Re-uploading Challenge ${challengeId_1} failed as expected.`,
      );
    },
  );

  // --- Query Test: _getParts ---
  let allChallenge1Parts: Array<{ part: ID; day: number; week: number }>;
  await t.step(
    "_getParts: should return all parts for an uploaded challenge",
    async () => {
      console.log(`Trace: Querying all parts for Challenge ${challengeId_1}.`);
      allChallenge1Parts = await concept._getParts({ challenge: challengeId_1 });
      assertEquals(allChallenge1Parts.length, 6, "Should retrieve all 6 parts");
      assertObjectMatch(allChallenge1Parts[0], { day: 1, week: 1 });
      assertObjectMatch(allChallenge1Parts[5], { day: 3, week: 2 });
      // Ensure parts have unique IDs
      const partIds = new Set(allChallenge1Parts.map((p) => p.part));
      assertEquals(partIds.size, 6, "All part IDs should be unique");
      console.log(
        `Verified: Retrieved all ${allChallenge1Parts.length} parts for Challenge ${challengeId_1}.`,
      );
    },
  );

  await t.step(
    "_getParts: should return an empty array for a non-existent or not uploaded challenge",
    async () => {
      console.log(`Trace: Querying parts for a non-existent challenge.`);
      const nonExistentParts = await concept._getParts({
        challenge: freshID(),
      });
      assertEquals(
        nonExistentParts.length,
        0,
        "Should return an empty array for a non-existent challenge",
      );
      console.log(
        "Verified: No parts returned for a non-existent challenge, as expected.",
      );
    },
  );

  // --- Action Test: completePart ---
  let partToComplete: ID;
  await t.step(
    "completePart: should successfully record a part completion for a user",
    async () => {
      partToComplete = allChallenge1Parts[0].part; // Take the first part of Challenge 1
      console.log(
        `Trace: User ${userId_1} completing part ${partToComplete} of Challenge ${challengeId_1}.`,
      );
      const result = await concept.completePart({
        part: partToComplete,
        user: userId_1,
      });
      assertEquals(result, {}, "Completion should succeed with an empty object");

      // Verify effects: A completion record should exist
      const completionDoc = await completionsCollection.findOne({
        part: partToComplete,
        user: userId_1,
      });
      assertExists(
        completionDoc,
        "A completion record should be found for the user and part",
      );
      assertEquals(completionDoc.part, partToComplete, "Part ID matches");
      assertEquals(completionDoc.user, userId_1, "User ID matches");
      console.log(
        `Verified: User ${userId_1} successfully completed part ${partToComplete}.`,
      );
    },
  );

  await t.step(
    "completePart: should return an error if the part does not exist",
    async () => {
      console.log(
        `Trace: User ${userId_1} attempting to complete a non-existent part.`,
      );
      const nonExistentPartId = freshID();
      const result = await concept.completePart({
        part: nonExistentPartId,
        user: userId_1,
      });
      assertNotEquals(result, {}, "Attempt should not succeed");
      assertEquals(
        (result as { error: string }).error,
        "Part does not exist",
        "Error message should indicate non-existent part",
      );
      console.log(
        `Verified: User ${userId_1} failed to complete non-existent part ${nonExistentPartId}.`,
      );
    },
  );

  // --- Query Test: _getPartDayWeek ---
  await t.step(
    "_getPartDayWeek: should return day and week for given parts",
    async () => {
      const partsToQuery = [
        allChallenge1Parts[0].part,
        allChallenge1Parts[1].part,
      ];
      console.log(`Trace: Querying day/week for parts: ${partsToQuery.join(", ")}.`);
      const retrievedInfo = await concept._getPartDayWeek({
        parts: partsToQuery,
      });
      assertEquals(retrievedInfo.length, 2, "Should retrieve info for 2 parts");
      assertObjectMatch(retrievedInfo[0], {
        part: partsToQuery[0],
        day: 1,
        week: 1,
      });
      assertObjectMatch(retrievedInfo[1], {
        part: partsToQuery[1],
        day: 2,
        week: 1,
      });
      console.log("Verified: Successfully retrieved day/week for specified parts.");
    },
  );

  await t.step(
    "_getPartDayWeek: should handle non-existent parts by skipping them",
    async () => {
      const partsToQuery = [freshID(), allChallenge1Parts[2].part, freshID()];
      console.log(
        `Trace: Querying day/week for parts including non-existent ones: ${partsToQuery.join(", ")}.`,
      );
      const retrievedInfo = await concept._getPartDayWeek({
        parts: partsToQuery,
      });
      assertEquals(
        retrievedInfo.length,
        1,
        "Should retrieve info for only the existing part",
      );
      assertObjectMatch(retrievedInfo[0], {
        part: allChallenge1Parts[2].part,
        day: 3,
        week: 1,
      });
      console.log(
        "Verified: Non-existent parts were correctly skipped during retrieval.",
      );
    },
  );

  // --- Query Test: _getCompletedParts ---
  await t.step(
    "_getCompletedParts: should return parts completed by a user for a specific challenge",
    async () => {
      // User 1 has completed one part already
      console.log(
        `Trace: Querying parts completed by User ${userId_1} for Challenge ${challengeId_1}.`,
      );
      const completedPartsUser1 = await concept._getCompletedParts({
        user: userId_1,
        challenge: challengeId_1,
      });
      assertEquals(
        completedPartsUser1.length,
        1,
        "User 1 should have 1 completed part",
      );
      assertObjectMatch(completedPartsUser1[0], {
        part: partToComplete,
        day: 1,
        week: 1,
      });

      // User 2 has completed no parts
      console.log(
        `Trace: Querying parts completed by User ${userId_2} for Challenge ${challengeId_1}.`,
      );
      const completedPartsUser2 = await concept._getCompletedParts({
        user: userId_2,
        challenge: challengeId_1,
      });
      assertEquals(
        completedPartsUser2.length,
        0,
        "User 2 should have 0 completed parts",
      );
      console.log("Verified: Completed parts retrieved correctly for users.");
    },
  );

  await t.step(
    "_getCompletedParts: should return an empty array if challenge is not uploaded",
    async () => {
      console.log(
        `Trace: Querying completed parts for a non-existent challenge.`,
      );
      const completedPartsNonExistentChallenge = await concept
        ._getCompletedParts({
          user: userId_1,
          challenge: freshID(),
        });
      assertEquals(
        completedPartsNonExistentChallenge.length,
        0,
        "Should return empty for non-existent challenge",
      );
      console.log(
        "Verified: No completed parts returned for a non-existent challenge.",
      );
    },
  );

  // --- Query Test: _allPartsCompleted ---
  await t.step(
    "_allPartsCompleted: should return false if not all parts are completed",
    async () => {
      // User 1 has 1 out of 6 parts completed
      console.log(
        `Trace: Checking if User ${userId_1} completed all parts of Challenge ${challengeId_1}.`,
      );
      const statusUser1 = await concept._allPartsCompleted({
        user: userId_1,
        challenge: challengeId_1,
      });
      assertEquals(statusUser1.length, 1, "Should return one status object");
      assertFalse(
        statusUser1[0].allPartsCompleted,
        "User 1 should not have completed all parts yet",
      );
      console.log(
        `Verified: User ${userId_1} has not completed all parts of Challenge ${challengeId_1}.`,
      );
    },
  );

  await t.step(
    "_allPartsCompleted: should return true if all parts are completed",
    async () => {
      console.log(
        `Trace: Completing remaining parts for User ${userId_1} in Challenge ${challengeId_1}.`,
      );
      // Complete remaining 5 parts for userId_1
      for (let i = 1; i < allChallenge1Parts.length; i++) {
        await concept.completePart({
          part: allChallenge1Parts[i].part,
          user: userId_1,
        });
      }

      console.log(
        `Trace: Re-checking if User ${userId_1} completed all parts of Challenge ${challengeId_1}.`,
      );
      const statusUser1 = await concept._allPartsCompleted({
        user: userId_1,
        challenge: challengeId_1,
      });
      assertEquals(statusUser1.length, 1, "Should return one status object");
      assertTrue(
        statusUser1[0].allPartsCompleted,
        "User 1 should have completed all parts now",
      );
      console.log(
        `Verified: User ${userId_1} has now completed all parts of Challenge ${challengeId_1}.`,
      );
    },
  );

  await t.step(
    "_allPartsCompleted: should return an empty array if challenge is not uploaded",
    async () => {
      console.log(
        `Trace: Checking completion status for a non-existent challenge.`,
      );
      const statusNonExistent = await concept._allPartsCompleted({
        user: userId_1,
        challenge: freshID(),
      });
      assertEquals(
        statusNonExistent.length,
        0,
        "Should return an empty array for a non-existent challenge",
      );
      console.log(
        "Verified: Empty array returned for non-existent challenge completion status.",
      );
    },
  );

  // --- Action Test: removeChallenge ---
  await t.step(
    "removeChallenge: should successfully remove an uploaded challenge and its parts",
    async () => {
      console.log(`Trace: Attempting to remove Challenge ${challengeId_1}.`);
      const result = await concept.removeChallenge({ challenge: challengeId_1 });
      assertEquals(result, {}, "Removal should succeed with an empty object");

      // Verify effects: Challenge 1 should be gone from uploadedChallenges
      const uploadedChallenge = await uploadedChallengesCollection.findOne({
        _id: challengeId_1,
      });
      assertEquals(
        uploadedChallenge,
        null,
        "Challenge 1 should no longer be in uploadedChallenges",
      );

      // Verify effects: All parts of Challenge 1 should be gone
      const parts = await partsCollection.find({ challenge: challengeId_1 })
        .toArray();
      assertEquals(parts.length, 0, "No parts should remain for Challenge 1");

      // Verify effects: Completions for parts of Challenge 1 should NOT be removed (concept doesn't specify this,
      // so we assume they remain as orphaned records for historical purposes, or a separate cleanup is needed).
      // For this test, we verify they were not explicitly deleted by `removeChallenge`.
      const completions = await completionsCollection.find({
        user: userId_1,
        // No challenge field on CompletionDoc, so we can't filter by challenge directly,
        // but we can check for completions linked to the *removed* parts.
        // We need to re-fetch the part IDs if we want to confirm they still exist in completionsCollection.
        // However, the `_getCompletedParts` query will return empty because the challenge is gone.
      }).toArray();
      // Since completions are linked by 'part' ID, and parts are deleted,
      // fetching completed parts for the challenge will fail.
      // But the raw completion *documents* might still exist,
      // which is an implicit effect of the current implementation.
      // If the intent was for completions to be CASCADE deleted, that would need explicit implementation.
      // Given the current code, the completion records themselves should remain, just orphaned.
      assertNotEquals(completions.length, 0, "Completion records should persist even if parts are gone (current behavior)");


      // Reconfirm _getParts and _getCompletedParts return empty for the removed challenge
      const partsAfterRemoval = await concept._getParts({
        challenge: challengeId_1,
      });
      assertEquals(partsAfterRemoval.length, 0, "_getParts should return empty for removed challenge");
      const completedPartsAfterRemoval = await concept._getCompletedParts({
        user: userId_1,
        challenge: challengeId_1,
      });
      assertEquals(completedPartsAfterRemoval.length, 0, "_getCompletedParts should return empty for removed challenge");

      console.log(
        `Verified: Challenge ${challengeId_1} and its parts successfully removed.`,
      );
    },
  );

  await t.step(
    "removeChallenge: should return an error if the challenge is not uploaded",
    async () => {
      console.log(
        `Trace: Attempting to remove a non-existent challenge (e.g., Challenge ${challengeId_2} which was never uploaded).`,
      );
      const result = await concept.removeChallenge({ challenge: challengeId_2 });
      assertNotEquals(result, {}, "Attempt should not succeed");
      assertEquals(
        (result as { error: string }).error,
        "Challenge is not uploaded",
        "Error message should indicate non-existent challenge",
      );
      console.log(
        `Verified: Removing non-existent Challenge ${challengeId_2} failed as expected.`,
      );
    },
  );

  // --- Principle Trace: User progress on a challenge ---
  await t.step("Principle Trace: User progress on a challenge", async (tTrace) => {
    const principleChallengeId = freshID();
    const principleUserId = freshID();
    const DAYS = 2;
    const WEEKS = 1;

    console.log(
      `--- Principle Trace Start ---
    Goal: Simulate a user completing a challenge over time and check progress.
    Challenge ID: ${principleChallengeId}, User ID: ${principleUserId}`,
    );

    await tTrace.step("1. [Action]: Upload a new challenge", async () => {
      console.log(
        `Trace: Uploading Challenge ${principleChallengeId} with ${WEEKS} week(s) and ${DAYS} day(s) per week.`,
      );
      const uploadResult = await concept.uploadChallenge({
        challenge: principleChallengeId,
        daysOfWeek: DAYS,
        weeks: WEEKS,
      });
      assertEquals(uploadResult, {}, "Challenge upload should succeed.");
      const parts = await concept._getParts({ challenge: principleChallengeId });
      assertEquals(
        parts.length,
        DAYS * WEEKS,
        `Expected ${DAYS * WEEKS} parts to be created.`,
      );
      console.log(
        `Verified: Challenge ${principleChallengeId} uploaded with ${parts.length} parts.`,
      );
    });

    let partsOfPrincipleChallenge: Array<{
      part: ID;
      day: number;
      week: number;
    }>;
    await tTrace.step("2. [Query]: Get all parts of the challenge", async () => {
      console.log(
        `Trace: Retrieving all parts for Challenge ${principleChallengeId}.`,
      );
      partsOfPrincipleChallenge = await concept._getParts({
        challenge: principleChallengeId,
      });
      assertEquals(
        partsOfPrincipleChallenge.length,
        DAYS * WEEKS,
        "Should retrieve all parts.",
      );
      console.log(
        `Verified: Retrieved ${partsOfPrincipleChallenge.length} parts.`,
      );
    });

    await tTrace.step(
      "3. [Query]: Initially, no parts should be completed",
      async () => {
        console.log(
          `Trace: Checking initial completion status for User ${principleUserId}.`,
        );
        const initialCompletedParts = await concept._getCompletedParts({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertEquals(
          initialCompletedParts.length,
          0,
          "User should have no completed parts initially.",
        );
        const initialAllCompleted = await concept._allPartsCompleted({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertFalse(
          initialAllCompleted[0].allPartsCompleted,
          "User should not have completed all parts initially.",
        );
        console.log(
          "Verified: User has no completed parts and has not completed the challenge.",
        );
      },
    );

    await tTrace.step(
      "4. [Action]: User completes the first part",
      async () => {
        const firstPart = partsOfPrincipleChallenge[0];
        console.log(
          `Trace: User ${principleUserId} completing part (day ${firstPart.day}, week ${firstPart.week}, ID: ${firstPart.part}).`,
        );
        const completeResult = await concept.completePart({
          part: firstPart.part,
          user: principleUserId,
        });
        assertEquals(completeResult, {}, "Completion of first part should succeed.");
        console.log("Verified: First part completed.");
      },
    );

    await tTrace.step(
      "5. [Query]: Verify progress after one part completed",
      async () => {
        console.log(
          `Trace: Checking progress for User ${principleUserId} after one part completed.`,
        );
        const completedParts = await concept._getCompletedParts({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertEquals(
          completedParts.length,
          1,
          "User should have 1 completed part.",
        );
        assertObjectMatch(completedParts[0], {
          part: partsOfPrincipleChallenge[0].part,
        });
        const allCompleted = await concept._allPartsCompleted({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertFalse(
          allCompleted[0].allPartsCompleted,
          "User should still not have completed all parts.",
        );
        console.log("Verified: One part completed, challenge not yet finished.");
      },
    );

    await tTrace.step(
      "6. [Action]: User completes the remaining parts",
      async () => {
        console.log(
          `Trace: User ${principleUserId} completing remaining parts.`,
        );
        for (let i = 1; i < partsOfPrincipleChallenge.length; i++) {
          const part = partsOfPrincipleChallenge[i];
          await concept.completePart({ part: part.part, user: principleUserId });
          console.log(
            `    - Completed part (day ${part.day}, week ${part.week}, ID: ${part.part}).`,
          );
        }
        console.log("Verified: All remaining parts completed.");
      },
    );

    await tTrace.step(
      "7. [Query]: Verify full completion status",
      async () => {
        console.log(
          `Trace: Checking final completion status for User ${principleUserId}.`,
        );
        const completedParts = await concept._getCompletedParts({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertEquals(
          completedParts.length,
          DAYS * WEEKS,
          "User should have all parts completed.",
        );
        const allCompleted = await concept._allPartsCompleted({
          user: principleUserId,
          challenge: principleChallengeId,
        });
        assertTrue(
          allCompleted[0].allPartsCompleted,
          "User should have completed all parts.",
        );
        console.log(
          "Verified: User has completed all parts and finished the challenge.",
        );
      },
    );

    await tTrace.step("8. [Action]: Remove the challenge", async () => {
      console.log(`Trace: Removing Challenge ${principleChallengeId}.`);
      const removeResult = await concept.removeChallenge({
        challenge: principleChallengeId,
      });
      assertEquals(removeResult, {}, "Challenge removal should succeed.");
      const partsCount = await partsCollection.countDocuments({
        challenge: principleChallengeId,
      });
      assertEquals(
        partsCount,
        0,
        "No parts should exist for the removed challenge.",
      );
      const uploadedChallenge = await uploadedChallengesCollection.findOne({
        _id: principleChallengeId,
      });
      assertEquals(
        uploadedChallenge,
        null,
        "Challenge record should be removed.",
      );
      console.log(
        `Verified: Challenge ${principleChallengeId} successfully removed.`,
      );
    });

    console.log("--- Principle Trace End ---");
  });

  await client.close();
});
```
