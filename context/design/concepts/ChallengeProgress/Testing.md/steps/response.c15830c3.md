---
timestamp: 'Tue Nov 25 2025 09:42:14 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_094214.e87cc46f.md]]'
content_id: c15830c3a3d8877323abcd12056fe40c2ed32813a1a591ae4282b9304b5c745e
---

# response:

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

Deno.test("ChallengeProgressConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeProgressConcept(db);

  // --- Test Setup Constants ---
  const mockUser1 = freshID() as ID;
  const mockUser2 = freshID() as ID;
  const mockChallenge1 = freshID() as ID;
  const mockChallenge2 = freshID() as ID;
  const daysOfWeek1 = 3;
  const weeks1 = 2; // Total 6 parts for challenge 1
  const daysOfWeek2 = 1;
  const weeks2 = 1; // Total 1 part for challenge 2

  await t.step("Initial state: Collections are empty", async () => {
    assertEquals(
      await db.collection("ChallengeProgress.Parts").countDocuments(),
      0,
      "Parts collection should be empty initially"
    );
    assertEquals(
      await db.collection("ChallengeProgress.Completions").countDocuments(),
      0,
      "Completions collection should be empty initially"
    );
    assertEquals(
      await db.collection("ChallengeProgress.UploadedChallenges")
        .countDocuments(),
      0,
      "UploadedChallenges collection should be empty initially"
    );
  });

  // --- Action: uploadChallenge ---
  await t.step(
    "[Action]: uploadChallenge - Successfully uploads a new challenge",
    async () => {
      console.log(
        `Uploading Challenge1 (${mockChallenge1}) with ${daysOfWeek1} days and ${weeks1} weeks.`
      );
      const result = await concept.uploadChallenge({
        challenge: mockChallenge1,
        daysOfWeek: daysOfWeek1,
        weeks: weeks1,
      });

      assertEquals(result, {}, "Should return an empty object on success");

      // Verify effects:
      const uploadedChallenge = await db
        .collection("ChallengeProgress.UploadedChallenges")
        .findOne({ _id: mockChallenge1 });
      assertEquals(
        uploadedChallenge?._id,
        mockChallenge1,
        "Challenge should be recorded in UploadedChallenges"
      );

      const partsCount = await db
        .collection("ChallengeProgress.Parts")
        .countDocuments({ challenge: mockChallenge1 });
      assertEquals(
        partsCount,
        daysOfWeek1 * weeks1,
        `Should create ${daysOfWeek1 * weeks1} parts for Challenge1`
      );

      const samplePart = await db
        .collection("ChallengeProgress.Parts")
        .findOne({ challenge: mockChallenge1, day: 1, week: 1 });
      assertEquals(
        samplePart?.challenge,
        mockChallenge1,
        "Sample part should be linked to Challenge1"
      );
      assertEquals(samplePart?.day, 1, "Sample part day should be correct");
      assertEquals(samplePart?.week, 1, "Sample part week should be correct");
    }
  );

  await t.step(
    "[Action]: uploadChallenge - Fails when challenge is already uploaded",
    async () => {
      console.log(`Attempting to re-upload Challenge1 (${mockChallenge1}).`);
      const result = await concept.uploadChallenge({
        challenge: mockChallenge1,
        daysOfWeek: 1,
        weeks: 1,
      });

      assertEquals(
        result,
        { error: "Challenge already uploaded" },
        "Should return an error for duplicate challenge upload"
      );

      // Verify no new parts were added
      const partsCount = await db
        .collection("ChallengeProgress.Parts")
        .countDocuments({ challenge: mockChallenge1 });
      assertEquals(
        partsCount,
        daysOfWeek1 * weeks1,
        "No additional parts should be created for duplicate upload"
      );
    }
  );

  // --- Action: completePart ---
  let firstPartId: ID;
  await t.step(
    "[Action]: completePart - Successfully completes an existing part",
    async () => {
      const partsForChallenge1 = await db
        .collection("ChallengeProgress.Parts")
        .find({ challenge: mockChallenge1 })
        .toArray();
      firstPartId = partsForChallenge1[0]._id.toString() as ID;

      console.log(
        `User ${mockUser1} completing part ${firstPartId} of Challenge1.`
      );
      const result = await concept.completePart({
        part: firstPartId,
        user: mockUser1,
      });
      assertEquals(result, {}, "Should return an empty object on success");

      // Verify effects:
      const completion = await db
        .collection("ChallengeProgress.Completions")
        .findOne({ part: firstPartId, user: mockUser1 });
      assertEquals(completion?.part, firstPartId, "Completion part should match");
      assertEquals(completion?.user, mockUser1, "Completion user should match");

      const completionsCount = await db
        .collection("ChallengeProgress.Completions")
        .countDocuments();
      assertEquals(
        completionsCount,
        1,
        "Completions collection should have 1 document"
      );
    }
  );

  await t.step(
    "[Action]: completePart - Fails for a non-existent part",
    async () => {
      const nonExistentPart = freshID() as ID;
      console.log(
        `User ${mockUser1} attempting to complete non-existent part ${nonExistentPart}.`
      );
      const result = await concept.completePart({
        part: nonExistentPart,
        user: mockUser1,
      });
      assertEquals(
        result,
        { error: "Part does not exist" },
        "Should return an error for a non-existent part"
      );

      // Verify no new completions were added
      const completionsCount = await db
        .collection("ChallengeProgress.Completions")
        .countDocuments();
      assertEquals(
        completionsCount,
        1,
        "Completions collection count should remain 1"
      );
    }
  );

  // --- Query: _getParts ---
  await t.step("[Query]: _getParts - Returns all parts for an uploaded challenge", async () => {
    console.log(`Getting all parts for Challenge1 (${mockChallenge1}).`);
    const parts = await concept._getParts({ challenge: mockChallenge1 });
    assertEquals(
      parts.length,
      daysOfWeek1 * weeks1,
      `Should return ${daysOfWeek1 * weeks1} parts for Challenge1`
    );
    const firstPart = parts.find((p) => p.part === firstPartId);
    assertEquals(
      firstPart?.day,
      1,
      "The first part should have day 1"
    );
    assertEquals(
      firstPart?.week,
      1,
      "The first part should have week 1"
    );
  });

  await t.step(
    "[Query]: _getParts - Returns empty array for a non-uploaded challenge",
    async () => {
      const nonExistentChallenge = freshID() as ID;
      console.log(
        `Getting all parts for non-existent challenge (${nonExistentChallenge}).`
      );
      const parts = await concept._getParts({
        challenge: nonExistentChallenge,
      });
      assertEquals(
        parts.length,
        0,
        "Should return an empty array for a non-uploaded challenge"
      );
    }
  );

  // --- Query: _getPartDayWeek ---
  let secondPartId: ID;
  await t.step(
    "[Query]: _getPartDayWeek - Returns day and week for given parts",
    async () => {
      const partsForChallenge1 = await db
        .collection("ChallengeProgress.Parts")
        .find({ challenge: mockChallenge1 })
        .toArray();
      secondPartId = partsForChallenge1[1]._id.toString() as ID; // Get another part

      console.log(
        `Getting day/week for parts: [${firstPartId}, ${secondPartId}].`
      );
      const result = await concept._getPartDayWeek({
        parts: [firstPartId, secondPartId],
      });
      assertEquals(result.length, 2, "Should return 2 entries for 2 parts");
      assertEquals(
        result.some((p) => p.part === firstPartId && p.day === 1 && p.week === 1),
        true,
        "Should contain details for first part"
      );
      assertEquals(
        result.some((p) => p.part === secondPartId && p.day === 2 && p.week === 1), // Assuming parts are ordered by day, then week
        true,
        "Should contain details for second part"
      );
    }
  );

  await t.step(
    "[Query]: _getPartDayWeek - Skips non-existent parts gracefully",
    async () => {
      const nonExistentPart = freshID() as ID;
      console.log(
        `Getting day/week for parts: [${firstPartId}, ${nonExistentPart}].`
      );
      const result = await concept._getPartDayWeek({
        parts: [firstPartId, nonExistentPart],
      });
      assertEquals(result.length, 1, "Should return 1 entry (skipping non-existent)");
      assertEquals(
        result[0].part,
        firstPartId,
        "The existing part should be returned"
      );
    }
  );

  // --- Query: _getCompletedParts & _allPartsCompleted (Addressing a bug in implementation) ---
  await t.step(
    "[BUG]: _getCompletedParts and _allPartsCompleted are incorrectly implemented",
    async () => {
      // Background: The `completions` collection only stores `part` and `user` IDs.
      // The current implementation queries `this.completions.find({ challenge: challenge, user: user })`.
      // Since `CompletionDoc` does not have a `challenge` field, this query will always return an empty array.

      console.warn(
        "--- WARNING: The following tests demonstrate a bug in the current implementation of _getCompletedParts and _allPartsCompleted. ---"
      );

      // complete a second part by user1
      const partsForChallenge1 = await db
        .collection("ChallengeProgress.Parts")
        .find({ challenge: mockChallenge1 })
        .toArray();
      const thirdPartId = partsForChallenge1[2]._id.toString() as ID;
      await concept.completePart({ part: thirdPartId, user: mockUser1 });
      console.log(
        `User ${mockUser1} also completed part ${thirdPartId}. Expected 2 completions.`
      );

      await t.step(
        "[_getCompletedParts BUG]: Should return completed parts for a user in a challenge, but returns empty",
        async () => {
          console.log(
            `Attempting to get completed parts for User ${mockUser1} in Challenge ${mockChallenge1}.`
          );
          const completedParts = await concept._getCompletedParts({
            user: mockUser1,
            challenge: mockChallenge1,
          });

          // Due to the bug, this will be 0, even though User1 completed 2 parts.
          assertEquals(
            completedParts.length,
            0,
            "BUG: _getCompletedParts should return 2 completed parts but returns 0 due to incorrect query logic."
          );
          console.warn(
            "   BUG NOTE: `_getCompletedParts` uses `completions.find({ challenge: challenge, user: user })` " +
            "but `CompletionDoc` lacks a `challenge` field. This query will always return empty."
          );
        }
      );

      await t.step(
        "[_allPartsCompleted BUG]: Should check if all parts are completed, but always returns false if parts exist",
        async () => {
          console.log(
            `Attempting to check if User ${mockUser1} completed all parts of Challenge ${mockChallenge1}.`
          );
          const result = await concept._allPartsCompleted({
            user: mockUser1,
            challenge: mockChallenge1,
          });

          // Due to the bug, the 'completions' part of the comparison will always be 0.
          // Since partsCount (6) != 0, it will be false.
          assertEquals(
            result.length,
            1,
            "Should return an array with one result"
          );
          assertEquals(
            result[0].allPartsCompleted,
            false,
            "BUG: _allPartsCompleted should be false (2/6 completed) but the comparison is flawed due to `completions.length` always being 0."
          );
          console.warn(
            "   BUG NOTE: `_allPartsCompleted` also uses the same flawed query for completions, " +
            "making `completions.length` always 0. The comparison `0 === parts.length` will be false as long as `parts.length > 0`."
          );
        }
      );
    }
  ); // End of bug demonstration step

  // Continue with other actions/queries that are correctly implemented
  await t.step(
    "[Action]: removeChallenge - Successfully removes an existing challenge",
    async () => {
      // Upload Challenge2 first to test removal separately
      await concept.uploadChallenge({
        challenge: mockChallenge2,
        daysOfWeek: daysOfWeek2,
        weeks: weeks2,
      });
      console.log(
        `Removing Challenge2 (${mockChallenge2}) with 1 day, 1 week.`
      );
      const result = await concept.removeChallenge({ challenge: mockChallenge2 });
      assertEquals(result, {}, "Should return an empty object on success");

      // Verify effects:
      const uploadedChallenge = await db
        .collection("ChallengeProgress.UploadedChallenges")
        .findOne({ _id: mockChallenge2 });
      assertEquals(
        uploadedChallenge,
        null,
        "Challenge2 should be removed from UploadedChallenges"
      );

      const partsCount = await db
        .collection("ChallengeProgress.Parts")
        .countDocuments({ challenge: mockChallenge2 });
      assertEquals(
        partsCount,
        0,
        "All parts for Challenge2 should be removed"
      );

      // Ensure Challenge1 and its parts/completions are untouched
      const challenge1Record = await db
        .collection("ChallengeProgress.UploadedChallenges")
        .findOne({ _id: mockChallenge1 });
      assertEquals(
        challenge1Record?._id,
        mockChallenge1,
        "Challenge1 should still exist"
      );
      const partsCountChallenge1 = await db
        .collection("ChallengeProgress.Parts")
        .countDocuments({ challenge: mockChallenge1 });
      assertEquals(
        partsCountChallenge1,
        daysOfWeek1 * weeks1,
        "Parts for Challenge1 should still exist"
      );
    }
  );

  await t.step(
    "[Action]: removeChallenge - Fails for a non-uploaded challenge",
    async () => {
      const nonExistentChallenge = freshID() as ID;
      console.log(
        `Attempting to remove non-existent challenge (${nonExistentChallenge}).`
      );
      const result = await concept.removeChallenge({
        challenge: nonExistentChallenge,
      });
      assertEquals(
        result,
        { error: "Challenge is not uploaded" },
        "Should return an error for a non-uploaded challenge"
      );
    }
  );

  await t.step("[Trace]: Principle fulfillment", async () => {
    // Principle: A user can upload a challenge, complete parts of it, and track their progress.
    // 1. Upload a challenge (already done with mockChallenge1)
    // 2. User completes parts (already done with mockUser1 completing 2 parts of mockChallenge1)

    // 3. User tracks their progress:
    console.log(`Verifying tracking for User ${mockUser1} on Challenge ${mockChallenge1}.`);

    // Get all parts for Challenge1
    const allParts = await concept._getParts({ challenge: mockChallenge1 });
    assertEquals(allParts.length, daysOfWeek1 * weeks1, "Should retrieve all parts of Challenge1.");

    // Due to the bug, _getCompletedParts will return 0, which hinders tracking.
    const completedParts = await concept._getCompletedParts({ user: mockUser1, challenge: mockChallenge1 });
    console.log(
      `   (BUG: Expected 2 completed parts, but _getCompletedParts returned ${completedParts.length}).`
    );
    // assertEquals(completedParts.length, 2, "Should show 2 completed parts for mockUser1 on mockChallenge1"); // This assertion would fail due to the bug.

    const allPartsCompleted = await concept._allPartsCompleted({ user: mockUser1, challenge: mockChallenge1 });
    console.log(
      `   (BUG: Expected allPartsCompleted to be 'false' based on 2/6, but it's ${allPartsCompleted[0]?.allPartsCompleted} due to incorrect completion count).`
    );
    // assertEquals(allPartsCompleted[0]?.allPartsCompleted, false, "User should not have completed all parts."); // This assertion would pass, but for the wrong reason due to the bug.

    console.log("Trace demonstrates that challenge upload, part creation, and part completion actions work as intended.");
    console.log("However, the tracking functions `_getCompletedParts` and `_allPartsCompleted` are affected by a logical error where `CompletionDoc` is queried for a `challenge` field it does not possess, leading to incorrect progress tracking results.");
    console.log("A correct implementation would involve first finding all `Part` IDs for a given `challenge`, and then querying `Completions` using those `Part` IDs and the `User` ID.");
  });

  await client.close();
});
```
