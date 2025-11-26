---
timestamp: 'Tue Nov 25 2025 09:36:03 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_093603.b5ca3b85.md]]'
content_id: 56670d33f6da52a1c13201a7e16b58383d8f6db94715e69de0877cc876295e89
---

# response:

The `TypeError: Cannot read properties of undefined (reading 'uploadChallenge')` error in your test suite suggests that the `concept` variable was `undefined` at the point of being used within your `t.step` functions. While the structure with `Deno.test.beforeEach` *should* correctly initialize `concept` for each step, this error can sometimes occur due to subtle environment issues or a misunderstanding of how `let` variables and `beforeEach` hooks interact in certain Deno versions or configurations.

However, a more direct bug exists within your `ChallengeProgressConcept.ts` file, specifically in the `_getCompletedParts` and `_allPartsCompleted` methods. These methods incorrectly attempt to query the `completions` collection using a `challenge` field, which `CompletionDoc` does not possess. They need to join `completions` with `parts` to link completions back to their respective challenges.

Additionally:

1. The `import { assert } from "node:console";` line is problematic and unused; it should be removed.
2. Assuming `freshID()` consistently generates string-based `ID`s, the MongoDB `_id` fields for `PartDoc` and `CompletionDoc` will be stored as strings. The provided code for both the concept and tests has been updated to reflect this consistency, avoiding unnecessary `ObjectId.toString()` conversions.

The updated concept and test files address these issues:

## `src/concepts/ChallengeProgress/ChallengeProgressConcept.ts` (Modified)

**Key Changes:**

1. **Removed `assert` import.**
2. **`_getCompletedParts` Refactor:** Now uses a MongoDB aggregation pipeline (`$lookup`, `$unwind`, `$match`, `$project`) to correctly join `completions` with `parts` documents to filter by `challenge` and retrieve part details.
3. **`_allPartsCompleted` Refactor:** Also uses an aggregation pipeline (`$lookup`, `$unwind`, `$match`, `$group`, `$addToSet`, `$size`) to count unique completed parts for a user within a specific challenge, comparing it against the total number of parts in that challenge.
4. **`uploadChallenge` Improvement:** Added `await this.uploadedChallenges.insertOne({ _id: challenge });` to ensure the `UploadedChallengeDoc` is created when a challenge is uploaded, which was missing and implicitly relied on the parts being inserted.

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.ts

import { Collection, Db } from "npm:mongodb"; // Removed ObjectId as _id's are string based.
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// import { assert } from "node:console"; // REMOVED THIS LINE

// Declare collection prefix, use concept name
const PREFIX = "ChallengeProgress" + ".";

// Generic types of this concept
type User = ID;
type Challenge = ID;
type Part = ID; // Stored as string ID from freshID()
type Completion = ID; // Stored as string ID from freshID()

interface PartDoc {
  _id: Part; // Stored as string ID
  challenge: Challenge;
  day: number;
  week: number;
}

interface CompletionDoc {
  _id: Completion; // Stored as string ID
  part: Part;
  user: User;
}

interface UploadedChallengeDoc {
  _id: Challenge;
}

export default class ChallengeProgressConcept {
  private parts: Collection<PartDoc>;
  private completions: Collection<CompletionDoc>;
  private uploadedChallenges: Collection<UploadedChallengeDoc>;

  constructor(private readonly db: Db) {
    this.parts = this.db.collection(PREFIX + "Parts");
    this.completions = this.db.collection(PREFIX + "Completions");
    this.uploadedChallenges = this.db.collection(PREFIX + "UploadedChallenges");
  }

  async uploadChallenge({
    challenge,
    daysOfWeek,
    weeks,
  }: {
    challenge: Challenge;
    daysOfWeek: number;
    weeks: number;
  }): Promise<Empty | { error: string }> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (uploadedChallenge) {
      return { error: "Challenge already uploaded" };
    }
    const partDocs: Array<PartDoc> = [];
    for (let week = 1; week <= weeks; week++) {
      for (let day = 1; day <= daysOfWeek; day++) {
        const partDoc: PartDoc = {
          _id: freshID(), // freshID() assumed to return string ID
          week: week,
          day: day,
          challenge: challenge,
        };
        partDocs.push(partDoc);
      }
    }
    await this.uploadedChallenges.insertOne({ _id: challenge }); // Ensure challenge entry is created
    await this.parts.insertMany(partDocs);
    return {};
  }

  async removeChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return { error: "Challenge is not uploaded" };
    }
    await this.uploadedChallenges.deleteOne({ _id: challenge });
    // Note: Completions are intentionally not removed by current spec.
    await this.parts.deleteMany({ challenge: challenge });
    return {};
  }

  async completePart({
    part,
    user,
  }: {
    part: Part;
    user: User;
  }): Promise<Empty | { error: string }> {
    const partDoc = await this.parts.findOne({ _id: part });
    if (!partDoc) {
      return { error: "Part does not exist" };
    }

    const completionDoc: CompletionDoc = {
      _id: freshID(), // freshID() assumed to return string ID
      part: part,
      user: user,
    };

    await this.completions.insertOne(completionDoc);
    return {};
  }

  async _getPartDayWeek({
    parts,
  }: {
    parts: Array<Part>;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const partDocs = await Promise.all(
      parts.map((part) => this.parts.findOne({ _id: part }))
    );

    const output: Array<{ part: Part; day: number; week: number }> = [];

    partDocs.forEach((doc) => {
      if (doc) {
        output.push({ part: doc._id, day: doc.day, week: doc.week });
      }
    });

    return output;
  }

  async _getParts({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }
    const parts = await this.parts.find({ challenge: challenge }).toArray();
    const output: Array<{ part: Part; day: number; week: number }> = [];
    parts.forEach((doc) => {
      output.push({ part: doc._id, day: doc.day, week: doc.week });
    });
    return output;
  }

  async _getCompletedParts({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }

    // Use aggregation to find completions for a user in a specific challenge
    const completedPartsDetails = await this.completions.aggregate([
      { $match: { user: user } }, // Filter by user first for efficiency
      {
        $lookup: {
          from: this.parts.collectionName,
          localField: "part", // Field from 'completions' collection
          foreignField: "_id", // Field from 'parts' collection
          as: "partDetails", // Alias for the joined data
        },
      },
      { $unwind: "$partDetails" }, // Deconstructs the partDetails array (assuming one part per part ID)
      { $match: { "partDetails.challenge": challenge } }, // Further filter by challenge ID from the joined part details
      {
        $project: {
          _id: 0, // Exclude the completion's _id
          part: "$partDetails._id", // Get the part's _id (which is a string ID)
          day: "$partDetails.day",
          week: "$partDetails.week",
        },
      },
    ]).toArray();

    return completedPartsDetails.map(doc => ({
      part: doc.part as ID, // Type assertion for clarity, as it's already ID (string)
      day: doc.day,
      week: doc.week
    }));
  }

  async _allPartsCompleted({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ allPartsCompleted: boolean }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }

    const allPartsForChallenge = await this.parts.find({ challenge: challenge }).toArray();
    const totalPartsInChallenge = allPartsForChallenge.length;

    if (totalPartsInChallenge === 0) {
      // If a challenge has no parts, it's considered completed by definition.
      return [{ allPartsCompleted: true }];
    }

    // Get the count of unique parts completed by the user for this challenge
    const completedPartsCountResult = await this.completions.aggregate([
      { $match: { user: user } }, // Filter completions by user
      {
        $lookup: {
          from: this.parts.collectionName,
          localField: "part",
          foreignField: "_id",
          as: "partDetails",
        },
      },
      { $unwind: "$partDetails" },
      { $match: { "partDetails.challenge": challenge } }, // Filter by challenge ID from joined part
      {
        $group: {
          _id: null, // Group all results together
          uniqueCompletedParts: { $addToSet: "$part" }, // Collect unique part IDs
        },
      },
      {
        $project: {
          _id: 0,
          count: { $size: "$uniqueCompletedParts" }, // Get the size of the set
        },
      },
    ]).toArray();

    const numberOfUniqueCompletedParts = completedPartsCountResult.length > 0
      ? completedPartsCountResult[0].count
      : 0;

    return [{ allPartsCompleted: numberOfUniqueCompletedParts === totalPartsInChallenge }];
  }
}

```

## `src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts` (Modified)

**Key Changes:**

1. **Removed `ObjectId` import** from `npm:mongodb` in `test.ts`, as `_id` fields are now consistently treated as string `ID`s.
2. **Updated `PartDoc` and `CompletionDoc` interfaces** in `test.ts` to use `ID` (string) for `_id`, matching the assumption that `freshID()` creates string IDs and MongoDB stores them as such.
3. **Removed `toString() as ID` conversions** in test assertions and input data, as `_id`s are already expected to be `ID` strings.
4. **Added `console.log` statements** (commented out) at the start of `beforeEach` and `t.step` to assist with debugging the "concept undefined" error if it reoccurs, although the concept bug fixes are the primary solution.
5. **Refined cleanup in `[Trace]: Full challenge progress lifecycle`**: The final check for `remainingCompletions` now correctly filters by `part` IDs associated with the removed challenge.

```typescript
// file: src/concepts/ChallengeProgress/ChallengeProgressConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { Collection, Db, MongoClient } from "npm:mongodb"; // Removed ObjectId import
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID returns string ID

import ChallengeProgressConcept from "./ChallengeProgressConcept.ts";

// Helper types for direct collection access during testing (for verification)
// Assuming freshID() returns string IDs, so _id in DB is string.
interface PartDoc {
  _id: ID; // Stored as string ID
  challenge: ID;
  day: number;
  week: number;
}

interface CompletionDoc {
  _id: ID; // Stored as string ID
  part: ID;
  user: ID;
}

interface UploadedChallengeDoc {
  _id: ID;
}

// Ensure the PREFIX matches the one used in the concept for collection names
const PREFIX = "ChallengeProgress" + ".";

Deno.test("ChallengeProgressConcept", async (t) => {
  let db: Db;
  let client: MongoClient;
  let concept: ChallengeProgressConcept;
  let partsCollection: Collection<PartDoc>;
  let completionsCollection: Collection<CompletionDoc>;
  let uploadedChallengesCollection: Collection<UploadedChallengeDoc>;

  // Setup before each test step
  Deno.test.beforeEach(async () => {
    // console.log("Deno.test.beforeEach: Initializing DB and Concept...");
    [db, client] = await testDb();
    concept = new ChallengeProgressConcept(db);

    // Get direct access to collections for state verification
    // _id types here match the concept's interfaces, assuming string IDs are stored.
    partsCollection = db.collection<PartDoc>(PREFIX + "Parts");
    completionsCollection = db.collection<CompletionDoc>(PREFIX + "Completions");
    uploadedChallengesCollection = db.collection<UploadedChallengeDoc>(
      PREFIX + "UploadedChallenges",
    );
    // console.log("Deno.test.beforeEach: DB and Concept initialized.");
  });

  // Teardown after each test step
  Deno.test.afterEach(async () => {
    // console.log("Deno.test.afterEach: Closing client...");
    await client.close();
    // console.log("Deno.test.afterEach: Client closed.");
  });

  await t.step("[Action]: uploadChallenge - Successfully uploads a new challenge", async () => {
    // console.log(`[t.step] Running test: Successfully uploads a new challenge. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const daysOfWeek = 2;
    const weeks = 2;
    const totalExpectedParts = daysOfWeek * weeks;

    console.log(
      `[Test Output]: Uploading challenge: ${challengeId} with ${weeks} weeks and ${daysOfWeek} days/week.`,
    );
    const result = await concept.uploadChallenge({
      challenge: challengeId,
      daysOfWeek,
      weeks,
    });

    // Confirm 'effects': The action should return an empty object on success.
    assertEquals(result, {}, "Upload should return an empty object on success");

    // Verify database state: uploadedChallenges collection
    const uploadedChallenge = await uploadedChallengesCollection.findOne({
      _id: challengeId,
    });
    assertEquals(
      uploadedChallenge?._id,
      challengeId,
      "Effect: Uploaded challenge ID should exist in uploadedChallenges collection.",
    );

    // Verify database state: parts collection
    const challengeParts = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(
      challengeParts.length,
      totalExpectedParts,
      `Effect: Should create ${totalExpectedParts} parts for the challenge.`,
    );

    // Verify content of parts (week and day numbers)
    const expectedPartsCoordinates = [
      { week: 1, day: 1 },
      { week: 1, day: 2 },
      { week: 2, day: 1 },
      { week: 2, day: 2 },
    ];
    for (const expected of expectedPartsCoordinates) {
      const foundPart = challengeParts.find(
        (p) => p.week === expected.week && p.day === expected.day,
      );
      assertEquals(
        !!foundPart,
        true,
        `Effect: Part for week ${expected.week}, day ${expected.day} should exist.`,
      );
      assertEquals(
        foundPart?.challenge,
        challengeId,
        `Effect: Part's challenge ID should match uploaded challenge ID.`,
      );
    }
    console.log(
      `[Test Output]: Verified ${challengeParts.length} parts and uploaded challenge entry.`,
    );
  });

  await t.step("[Action]: uploadChallenge - Fails if challenge already uploaded", async () => {
    // console.log(`[t.step] Running test: Fails if challenge already uploaded. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const daysOfWeek = 1;
    const weeks = 1;

    // Pre-condition: Challenge is already uploaded
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });

    console.log(
      `[Test Output]: Attempting to re-upload already uploaded challenge: ${challengeId}.`,
    );
    // Attempt to upload the same challenge again with different parameters
    const result = await concept.uploadChallenge({
      challenge: challengeId,
      daysOfWeek: 2, // Different values to ensure it's not just a no-op
      weeks: 2,
    });

    // Confirm 'requires' failure: The action should return an error.
    assertEquals(
      result,
      { error: "Challenge already uploaded" },
      "Requires: Should return an error if challenge is already uploaded.",
    );

    // Verify no unintended side effects: No new parts should be added.
    const challengeParts = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(
      challengeParts.length,
      daysOfWeek * weeks, // Still the count from the first successful upload
      "Effect: No new parts should be added on failed re-upload.",
    );
    console.log(
      `[Test Output]: Verified error message and no new parts created for re-upload attempt.`,
    );
  });

  await t.step("[Action]: removeChallenge - Successfully removes an uploaded challenge and its parts", async () => {
    // console.log(`[t.step] Running test: Successfully removes an uploaded challenge and its parts. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const daysOfWeek = 2;
    const weeks = 1;
    const totalParts = daysOfWeek * weeks;

    // Pre-condition: Upload the challenge first
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });
    const partsBeforeRemoval = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(
      partsBeforeRemoval.length,
      totalParts,
      "Pre-condition: Parts exist before removal.",
    );

    // Perform the action: Remove the challenge
    console.log(`[Test Output]: Removing challenge: ${challengeId}.`);
    const result = await concept.removeChallenge({ challenge: challengeId });
    assertEquals(result, {}, "Remove should return an empty object on success.");

    // Verify 'effects': Check if challenge and its parts are removed.
    const uploadedChallenge = await uploadedChallengesCollection.findOne({
      _id: challengeId,
    });
    assertEquals(
      uploadedChallenge,
      null,
      "Effect: Uploaded challenge ID should no longer exist in uploadedChallenges collection.",
    );

    const challengeParts = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(
      challengeParts.length,
      0,
      "Effect: All parts for the challenge should be removed.",
    );
    console.log(`[Test Output]: Verified challenge and its parts are removed.`);
  });

  await t.step("[Action]: removeChallenge - Does not remove completions associated with the parts (current implementation behavior)", async () => {
    // console.log(`[t.step] Running test: Does not remove completions associated with the parts. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const daysOfWeek = 1;
    const weeks = 1;

    // Pre-condition: Upload challenge and a user completes a part
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });
    const partDocs = await partsCollection.find({ challenge: challengeId }).toArray();
    const partId = partDocs[0]._id; // _id is already ID string
    await concept.completePart({ part: partId, user: userId });

    const completionsBeforeRemoval = await completionsCollection.find({
      part: partId,
      user: userId,
    }).toArray();
    assertEquals(
      completionsBeforeRemoval.length,
      1,
      "Pre-condition: Completion exists before challenge removal.",
    );

    // Perform the action: Remove the challenge
    console.log(
      `[Test Output]: Removing challenge: ${challengeId} which has a completed part.`,
    );
    await concept.removeChallenge({ challenge: challengeId });

    // Verify 'effects' (or lack thereof for completions): Completions should still exist.
    const completionsAfterRemoval = await completionsCollection.find({
      part: partId,
      user: userId,
    }).toArray();
    assertEquals(
      completionsAfterRemoval.length,
      1,
      "Effect: Completions should NOT be removed when challenge is removed by current implementation.",
    );
    console.log(
      `[Test Output]: Verified completions are retained after challenge removal.`,
    );
  });

  await t.step("[Action]: removeChallenge - Fails if challenge is not uploaded", async () => {
    // console.log(`[t.step] Running test: Fails if challenge is not uploaded. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const nonExistentChallengeId = freshID() as ID;

    console.log(
      `[Test Output]: Attempting to remove non-existent challenge: ${nonExistentChallengeId}.`,
    );
    const result = await concept.removeChallenge({ challenge: nonExistentChallengeId });

    // Confirm 'requires' failure: The action should return an error.
    assertEquals(
      result,
      { error: "Challenge is not uploaded" },
      "Requires: Should return an error if challenge is not uploaded.",
    );
    console.log(
      `[Test Output]: Verified error message for removal of non-existent challenge.`,
    );
  });

  await t.step("[Action]: completePart - Successfully records a part completion", async () => {
    // console.log(`[t.step] Running test: Successfully records a part completion. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const daysOfWeek = 1;
    const weeks = 1;

    // Pre-condition: Upload challenge to ensure a part exists
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });
    const parts = await partsCollection.find({ challenge: challengeId }).toArray();
    const partToCompleteId = parts[0]._id; // _id is already ID string

    console.log(
      `[Test Output]: User ${userId} completing part ${partToCompleteId} of challenge ${challengeId}.`,
    );
    const result = await concept.completePart({ part: partToCompleteId, user: userId });
    assertEquals(result, {}, "Completion should return an empty object on success.");

    // Verify 'effects': A new completion document should be created.
    const completion = await completionsCollection.findOne({
      part: partToCompleteId,
      user: userId,
    });
    assertEquals(!!completion, true, "Effect: A completion document should be created.");
    assertEquals(
      completion?.part,
      partToCompleteId,
      "Effect: Completion document should reference the correct part.",
    );
    assertEquals(
      completion?.user,
      userId,
      "Effect: Completion document should reference the correct user.",
    );
    console.log(`[Test Output]: Verified part completion record creation.`);
  });

  await t.step("[Action]: completePart - Allows multiple completions for the same part by the same user", async () => {
    // console.log(`[t.step] Running test: Allows multiple completions for the same part. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek: 1, weeks: 1 });
    const parts = await partsCollection.find({ challenge: challengeId }).toArray();
    const partId = parts[0]._id; // _id is already ID string

    console.log(
      `[Test Output]: User ${userId} completing part ${partId} multiple times.`,
    );
    await concept.completePart({ part: partId, user: userId });
    await concept.completePart({ part: partId, user: userId }); // Complete the same part again

    // Verify 'effects': Both completions should be recorded.
    const completions = await completionsCollection.find({ part: partId, user: userId }).toArray();
    assertEquals(
      completions.length,
      2,
      "Effect: Should allow and record multiple completions for the same part by the same user.",
    );
    console.log(`[Test Output]: Verified multiple completions are recorded.`);
  });

  await t.step("[Action]: completePart - Fails if part does not exist", async () => {
    // console.log(`[t.step] Running test: Fails if part does not exist. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const nonExistentPartId = freshID() as ID;
    const userId = freshID() as ID;

    console.log(
      `[Test Output]: Attempting to complete non-existent part: ${nonExistentPartId} by user: ${userId}.`,
    );
    const result = await concept.completePart({
      part: nonExistentPartId,
      user: userId,
    });

    // Confirm 'requires' failure: The action should return an error.
    assertEquals(
      result,
      { error: "Part does not exist" },
      "Requires: Should return an error if part does not exist.",
    );

    // Verify no unintended side effects: No completion document should be created.
    const completion = await completionsCollection.findOne({ part: nonExistentPartId, user: userId });
    assertEquals(
      completion,
      null,
      "Effect: No completion document should be created for a non-existent part.",
    );
    console.log(
      `[Test Output]: Verified error message and no completion record for non-existent part.`,
    );
  });

  await t.step("[Query]: _getPartDayWeek - Retrieves day and week for given parts", async () => {
    // console.log(`[t.step] Running test: _getPartDayWeek. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek: 2, weeks: 2 });
    const allParts = await partsCollection.find({ challenge: challengeId }).toArray();

    // Select specific parts and include a non-existent one
    const part1_1 = allParts.find((p) => p.week === 1 && p.day === 1)!;
    const part2_2 = allParts.find((p) => p.week === 2 && p.day === 2)!;
    const nonExistentPart = freshID() as ID;

    // Input to concept method are ID strings
    const partsToQuery = [part1_1._id, part2_2._id, nonExistentPart];
    console.log(
      `[Test Output]: Querying details for parts: ${partsToQuery.join(", ")}.`,
    );
    const partDetails = await concept._getPartDayWeek({ parts: partsToQuery });

    // Verify results: Only existing parts should be returned with correct details.
    assertEquals(
      partDetails.length,
      2,
      "Query: Should return details for existing parts only.",
    );
    const foundPart1_1 = partDetails.find((p) => p.part === part1_1._id);
    const foundPart2_2 = partDetails.find((p) => p.part === part2_2._id);

    assertEquals(
      foundPart1_1?.day,
      part1_1.day,
      `Query: Part ${part1_1._id} should have correct day.`,
    );
    assertEquals(
      foundPart1_1?.week,
      part1_1.week,
      `Query: Part ${part1_1._id} should have correct week.`,
    );
    assertEquals(
      foundPart2_2?.day,
      part2_2.day,
      `Query: Part ${part2_2._id} should have correct day.`,
    );
    assertEquals(
      foundPart2_2?.week,
      part2_2.week,
      `Query: Part ${part2_2._id} should have correct week.`,
    );
    console.log(
      `[Test Output]: Verified correct day and week retrieval for existing parts.`,
    );
  });

  await t.step("[Query]: _getParts - Retrieves all parts for an uploaded challenge", async () => {
    // console.log(`[t.step] Running test: _getParts. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const daysOfWeek = 3;
    const weeks = 2;
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });
    const totalPartsExpected = daysOfWeek * weeks;

    console.log(`[Test Output]: Querying all parts for challenge: ${challengeId}.`);
    const parts = await concept._getParts({ challenge: challengeId });

    // Verify results: All parts with correct count and coordinates.
    assertEquals(
      parts.length,
      totalPartsExpected,
      `Query: Should return all ${totalPartsExpected} parts.`,
    );
    const expectedPartsSet = new Set<string>();
    for (let w = 1; w <= weeks; w++) {
      for (let d = 1; d <= daysOfWeek; d++) {
        expectedPartsSet.add(`${w}-${d}`);
      }
    }

    parts.forEach((p) => {
      const key = `${p.week}-${p.day}`;
      assertEquals(
        expectedPartsSet.has(key),
        true,
        `Query: Expected part week ${p.week}, day ${p.day} found.`,
      );
      expectedPartsSet.delete(key);
    });
    assertEquals(
      expectedPartsSet.size,
      0,
      "Query: All expected parts should have been found.",
    );
    console.log(`[Test Output]: Verified all parts and their details for the challenge.`);
  });

  await t.step("[Query]: _getParts - Returns empty array if challenge not uploaded", async () => {
    // console.log(`[t.step] Running test: _getParts - Returns empty array. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const nonExistentChallengeId = freshID() as ID;

    console.log(
      `[Test Output]: Querying parts for non-existent challenge: ${nonExistentChallengeId}.`,
    );
    const parts = await concept._getParts({ challenge: nonExistentChallengeId });

    // Verify results: Empty array for non-existent challenge.
    assertEquals(
      parts.length,
      0,
      "Query: Should return an empty array for a non-existent challenge.",
    );
    console.log(`[Test Output]: Verified empty array for non-existent challenge query.`);
  });

  await t.step("[Query]: _getCompletedParts - Retrieves parts completed by a user for a challenge", async () => {
    // console.log(`[t.step] Running test: _getCompletedParts. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const anotherUserId = freshID() as ID;

    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek: 2, weeks: 1 }); // Creates parts: (1,1), (1,2)
    const allParts = await partsCollection.find({ challenge: challengeId }).toArray();
    const part1 = allParts.find((p) => p.week === 1 && p.day === 1)!;
    const part2 = allParts.find((p) => p.week === 1 && p.day === 2)!;

    // Set up completions:
    await concept.completePart({ part: part1._id, user: userId }); // User completes part 1
    await concept.completePart({ part: part2._id, user: anotherUserId }); // Another user completes part 2
    await concept.completePart({ part: part2._id, user: userId }); // User completes part 2

    console.log(
      `[Test Output]: Querying completed parts for user ${userId} in challenge ${challengeId}.`,
    );
    const completedParts = await concept._getCompletedParts({ user: userId, challenge: challengeId });

    // Verify results for the primary user
    assertEquals(
      completedParts.length,
      2,
      "Query: User should have completed 2 unique parts.",
    );
    const completedPartIds = completedParts.map((p) => p.part);
    assertEquals(
      completedPartIds.includes(part1._id),
      true,
      `Query: User should have completed part ${part1._id}.`,
    );
    assertEquals(
      completedPartIds.includes(part2._id),
      true,
      `Query: User should have completed part ${part2._id}.`,
    );

    const p1Details = completedParts.find((p) => p.part === part1._id);
    assertEquals(p1Details?.day, 1, "Query: Part 1,1 day should be correct.");
    assertEquals(p1Details?.week, 1, "Query: Part 1,1 week should be correct.");
    const p2Details = completedParts.find((p) => p.part === part2._id);
    assertEquals(p2Details?.day, 2, "Query: Part 1,2 day should be correct.");
    assertEquals(p2Details?.week, 1, "Query: Part 1,2 week should be correct.");
    console.log(
      `[Test Output]: Verified completed parts and their details for user ${userId}.`,
    );

    // Verify results for the another user
    console.log(
      `[Test Output]: Querying completed parts for user ${anotherUserId} in challenge ${challengeId}.`,
    );
    const anotherUserCompletedParts = await concept._getCompletedParts({
      user: anotherUserId,
      challenge: challengeId,
    });
    assertEquals(
      anotherUserCompletedParts.length,
      1,
      "Query: Another user should have completed 1 unique part.",
    );
    assertEquals(
      anotherUserCompletedParts[0].part,
      part2._id,
      `Query: Another user should have completed part ${part2._id}.`,
    );
  });

  await t.step("[Query]: _getCompletedParts - Returns empty array if user has no completions or challenge not uploaded", async () => {
    // console.log(`[t.step] Running test: _getCompletedParts - Returns empty array. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const nonExistentUserId = freshID() as ID;

    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek: 1, weeks: 1 });

    // Case 1: User exists but has no completions for the challenge
    console.log(
      `[Test Output]: Querying completed parts for user ${nonExistentUserId} (no completions) in challenge ${challengeId}.`,
    );
    let completedParts = await concept._getCompletedParts({ user: nonExistentUserId, challenge: challengeId });
    assertEquals(
      completedParts.length,
      0,
      "Query: Should return empty array for user with no completions.",
    );

    // Case 2: Challenge does not exist
    const nonExistentChallengeId = freshID() as ID;
    console.log(
      `[Test Output]: Querying completed parts for user ${userId} in non-existent challenge ${nonExistentChallengeId}.`,
    );
    completedParts = await concept._getCompletedParts({ user: userId, challenge: nonExistentChallengeId });
    assertEquals(
      completedParts.length,
      0,
      "Query: Should return empty array for non-existent challenge.",
    );

    console.log(
      `[Test Output]: Verified empty arrays for no completions or non-existent challenge scenarios.`,
    );
  });

  await t.step("[Query]: _allPartsCompleted - Correctly reports completion status", async () => {
    // console.log(`[t.step] Running test: _allPartsCompleted. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const daysOfWeek = 2;
    const weeks = 1; // Total 2 parts

    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek, weeks });
    const allParts = await partsCollection.find({ challenge: challengeId }).toArray();
    const part1 = allParts.find((p) => p.week === 1 && p.day === 1)!;
    const part2 = allParts.find((p) => p.week === 1 && p.day === 2)!;

    console.log(
      `[Test Output]: Checking completion status for user ${userId} in challenge ${challengeId}.`,
    );

    // Case 1: No parts completed
    let status = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      status.length,
      1,
      "Query: Status array should have one element.",
    );
    assertEquals(
      status[0].allPartsCompleted,
      false,
      "Query: Should report false if no parts completed.",
    );
    console.log(`[Test Output]: Verified 'false' when no parts completed.`);

    // Case 2: Some parts completed
    await concept.completePart({ part: part1._id, user: userId });
    status = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      status[0].allPartsCompleted,
      false,
      "Query: Should report false if only some parts completed.",
    );
    console.log(`[Test Output]: Verified 'false' when some parts completed.`);

    // Case 3: All parts completed
    await concept.completePart({ part: part2._id, user: userId });
    status = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      status[0].allPartsCompleted,
      true,
      "Query: Should report true if all parts completed.",
    );
    console.log(`[Test Output]: Verified 'true' when all parts completed.`);

    // Case 4: Another user with no parts completed
    const anotherUserId = freshID() as ID;
    status = await concept._allPartsCompleted({ user: anotherUserId, challenge: challengeId });
    assertEquals(
      status[0].allPartsCompleted,
      false,
      "Query: Should report false for another user with no parts completed.",
    );
    console.log(
      `[Test Output]: Verified 'false' for another user with no parts completed.`,
    );
  });

  await t.step("[Query]: _allPartsCompleted - Returns empty array if challenge not uploaded", async () => {
    // console.log(`[t.step] Running test: _allPartsCompleted - Returns empty array. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const nonExistentChallengeId = freshID() as ID;
    const userId = freshID() as ID;

    console.log(
      `[Test Output]: Querying completion status for non-existent challenge: ${nonExistentChallengeId}.`,
    );
    const status = await concept._allPartsCompleted({ user: userId, challenge: nonExistentChallengeId });
    assertEquals(
      status.length,
      0,
      "Query: Should return an empty array for a non-existent challenge.",
    );
    console.log(
      `[Test Output]: Verified empty array for non-existent challenge query.`,
    );
  });

  // # trace: Demonstrates a full flow from challenge creation to completion and status checking.
  await t.step("[Trace]: Full challenge progress lifecycle", async () => {
    // console.log(`[t.step] Running trace: Full challenge progress lifecycle. Concept is: ${concept ? 'defined' : 'undefined'}`);
    const challengeId = freshID() as ID;
    const userId = freshID() as ID;
    const days = 2;
    const weeks = 2; // Total 4 parts
    const totalPartsInChallenge = days * weeks;

    console.log(
      `\n--- [Trace Start]: Full lifecycle for challenge: ${challengeId}, user: ${userId} ---`,
    );

    // 1. Upload Challenge: Create the challenge and its parts.
    console.log(`[Trace Step 1]: Uploading challenge with ${weeks} weeks and ${days} days/week.`);
    await concept.uploadChallenge({ challenge: challengeId, daysOfWeek: days, weeks: weeks });
    let allChallengeParts = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(
      allChallengeParts.length,
      totalPartsInChallenge,
      "Trace: Challenge should have all parts uploaded.",
    );
    console.log(`[Trace Result]: Challenge uploaded with ${allChallengeParts.length} parts.`);

    // 2. Initial checks: Verify no parts are completed and the challenge is not fully completed.
    console.log(`[Trace Step 2]: Checking initial status before any completions.`);
    let completedPartsForUser = await concept._getCompletedParts({ user: userId, challenge: challengeId });
    assertEquals(
      completedPartsForUser.length,
      0,
      "Trace: Initially, user should have 0 parts completed.",
    );

    let allCompletedStatus = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      allCompletedStatus[0].allPartsCompleted,
      false,
      "Trace: Initially, the challenge should not be reported as fully completed.",
    );
    console.log(
      `[Trace Result]: Initial status: ${completedPartsForUser.length} parts completed by user, 'allPartsCompleted' is false.`,
    );

    // 3. Complete some parts: User completes a subset of the parts.
    console.log(`[Trace Step 3]: User ${userId} completing some parts.`);
    const part1_1 = allChallengeParts.find((p) => p.week === 1 && p.day === 1)!;
    const part1_2 = allChallengeParts.find((p) => p.week === 1 && p.day === 2)!;
    await concept.completePart({ part: part1_1._id, user: userId });
    await concept.completePart({ part: part1_2._id, user: userId });
    console.log(`[Trace Result]: Completed parts: ${part1_1._id} (W1D1), ${part1_2._id} (W1D2).`);

    // 4. Check status again: Confirm number of completed parts and overall completion status.
    console.log(`[Trace Step 4]: Checking status after some completions.`);
    completedPartsForUser = await concept._getCompletedParts({ user: userId, challenge: challengeId });
    assertEquals(
      completedPartsForUser.length,
      2,
      "Trace: User should now have 2 parts completed.",
    );
    assertEquals(
      completedPartsForUser.some((p) => p.part === part1_1._id),
      true,
      "Trace: Part 1,1 should be listed as completed.",
    );
    assertEquals(
      completedPartsForUser.some((p) => p.part === part1_2._id),
      true,
      "Trace: Part 1,2 should be listed as completed.",
    );

    allCompletedStatus = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      allCompletedStatus[0].allPartsCompleted,
      false,
      "Trace: Challenge should still not be reported as fully completed.",
    );
    console.log(
      `[Trace Result]: Status: ${completedPartsForUser.length} parts completed, 'allPartsCompleted' is false.`,
    );

    // 5. Complete remaining parts: User completes the rest of the challenge parts.
    console.log(`[Trace Step 5]: User ${userId} completing remaining parts.`);
    const part2_1 = allChallengeParts.find((p) => p.week === 2 && p.day === 1)!;
    const part2_2 = allChallengeParts.find((p) => p.week === 2 && p.day === 2)!;
    await concept.completePart({ part: part2_1._id, user: userId });
    await concept.completePart({ part: part2_2._id, user: userId });
    console.log(`[Trace Result]: Completed parts: ${part2_1._id} (W2D1), ${part2_2._id} (W2D2).`);

    // 6. Final status check: Confirm all parts are completed and the challenge is fully completed.
    console.log(`[Trace Step 6]: Checking final status after all parts are completed.`);
    completedPartsForUser = await concept._getCompletedParts({ user: userId, challenge: challengeId });
    assertEquals(
      completedPartsForUser.length,
      totalPartsInChallenge,
      "Trace: All parts of the challenge should now be completed.",
    );

    allCompletedStatus = await concept._allPartsCompleted({ user: userId, challenge: challengeId });
    assertEquals(
      allCompletedStatus[0].allPartsCompleted,
      true,
      "Trace: Challenge should now be reported as fully completed.",
    );
    console.log(
      `[Trace Result]: Final status: All ${completedPartsForUser.length} parts completed! 'allPartsCompleted' is true.`,
    );

    // 7. Remove challenge: Clean up the challenge, but note that completions are retained.
    console.log(`[Trace Step 7]: Removing challenge.`);
    await concept.removeChallenge({ challenge: challengeId });
    const remainingParts = await partsCollection.find({ challenge: challengeId }).toArray();
    assertEquals(remainingParts.length, 0, "Trace: All challenge parts should be removed.");

    // Filter completions by part _id that were associated with the removed challenge
    const allRemovedChallengePartIds = allChallengeParts.map(p => p._id);
    const remainingCompletions = await completionsCollection.find({ user: userId, part: { $in: allRemovedChallengePartIds } }).toArray();

    assertEquals(
      remainingCompletions.length,
      totalPartsInChallenge,
      "Trace: Completion records should remain even after challenge removal (as per current implementation).",
    );
    console.log(
      `[Trace Result]: Challenge removed. ${remainingCompletions.length} completion records for the user are retained.`,
    );

    console.log(`--- [Trace End]: Challenge progress lifecycle demonstrated ---`);
  });
});
```
