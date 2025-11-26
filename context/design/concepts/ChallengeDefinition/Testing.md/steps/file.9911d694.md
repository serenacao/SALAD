---
timestamp: 'Tue Nov 25 2025 08:00:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_080024.b5ca11cd.md]]'
content_id: 9911d694231d09626e9fc79dc8639b7eaab4d048167bf7786dd6d2f6e411c0dc
---

# file: src/concepts/ChallengeDefinition/ChallengeDefinitionConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengeDefinitionConcept from "./ChallengeDefinitionConcept.ts";
import {
  AnaerobicInfo,
  RepAerobicInfo,
  DistanceAerobicInfo,
} from "./ChallengeDefinitionConcept.ts";
import { ID } from "@utils/types.ts";
import { Collection } from "npm:mongodb";

// A mock user ID for testing purposes
const TEST_USER_ID: ID = "testUser123" as ID;
// Re-using the collection prefix for direct database access for verification
const COLLECTION_PREFIX = "ChallengeDefinition" + ".";

Deno.test("ChallengeDefinitionConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeDefinitionConcept(db);
  // Access the underlying collection for direct state verification
  const challengesCollection: Collection<any> = db.collection(
    COLLECTION_PREFIX + "Challenges",
  );

  await t.step("createChallenge: Success cases (effects)", async (t) => {
    await t.step(
      "Should successfully create an anaerobic challenge and calculate points",
      async () => {
        console.log(
          "[Test Case]: Creating an anaerobic challenge (Bench Press).",
        );
        const anaerobicInfo: AnaerobicInfo = {
          _type: "AnaerobicInfo",
          weight: 70, // kg
          sets: 3,
          reps: 10,
        };
        const createResult = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Bench Press",
          level: 2,
          info: anaerobicInfo,
          daysPerWeek: 3,
          weeks: 4,
        });

        assertExists(createResult.challenge, "Challenge ID should be returned");
        const challengeId = createResult.challenge as ID;
        console.log(`[Effect]: Challenge created with ID: ${challengeId}`);

        const challengeDoc = await challengesCollection.findOne({
          _id: challengeId,
        });
        assertExists(challengeDoc, "Challenge document should exist in DB");
        assertEquals(challengeDoc.creator, TEST_USER_ID);
        assertEquals(challengeDoc.exercise, "Bench Press");
        assertEquals(challengeDoc.level, 2);
        assertObjectMatch(challengeDoc.info, anaerobicInfo);
        assertEquals(challengeDoc.daysPerWeek, 3);
        assertEquals(challengeDoc.weeks, 4);
        assertEquals(challengeDoc.open, false, "Challenge should be initially closed");

        // Verify point calculations based on the internal logic
        // partPoints = (level * 10) + (reps * sets * weight/10) = (2*10) + (10*3*70/10) = 20 + 210 = 230
        assertEquals(challengeDoc.partPoints, 230, "Part points calculated incorrectly");
        // bonusPoints = round(level * daysPerWeek^1.5 * weeks^2) = round(2 * 3^1.5 * 4^2) = round(2 * 5.196 * 16) = round(166.272) = 166
        assertEquals(challengeDoc.bonusPoints, 166, "Bonus points calculated incorrectly");
        console.log(`[Verification]: PartPoints: ${challengeDoc.partPoints}, BonusPoints: ${challengeDoc.bonusPoints}`);
      },
    );

    await t.step(
      "Should successfully create a rep aerobic challenge and calculate points",
      async () => {
        console.log(
          "[Test Case]: Creating a rep aerobic challenge (Jumping Jacks).",
        );
        const repAerobicInfo: RepAerobicInfo = {
          _type: "RepAerobicInfo",
          repSpeed: 60, // reps per minute
          minutes: 30,
        };
        const createResult = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Jumping Jacks",
          level: 1,
          info: repAerobicInfo,
          daysPerWeek: 5,
          weeks: 2,
        });

        assertExists(createResult.challenge, "Challenge ID should be returned");
        const challengeId = createResult.challenge as ID;
        console.log(`[Effect]: Challenge created with ID: ${challengeId}`);

        const challengeDoc = await challengesCollection.findOne({
          _id: challengeId,
        });
        assertExists(challengeDoc, "Challenge document should exist in DB");
        assertEquals(challengeDoc.partPoints, 1810); // (1*10) + (60*30) = 10 + 1800 = 1810
        assertEquals(challengeDoc.bonusPoints, 45); // round(1 * 5^1.5 * 2^2) = round(1 * 11.18 * 4) = 45
        console.log(`[Verification]: PartPoints: ${challengeDoc.partPoints}, BonusPoints: ${challengeDoc.bonusPoints}`);
      },
    );

    await t.step(
      "Should successfully create a distance aerobic challenge and calculate points",
      async () => {
        console.log(
          "[Test Case]: Creating a distance aerobic challenge (Running).",
        );
        const distanceAerobicInfo: DistanceAerobicInfo = {
          _type: "DistanceAerobicInfo",
          distanceSpeed: 10, // km per hour
          minutes: 45,
        };
        const createResult = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Running",
          level: 3,
          info: distanceAerobicInfo,
          daysPerWeek: 4,
          weeks: 6,
        });

        assertExists(createResult.challenge, "Challenge ID should be returned");
        const challengeId = createResult.challenge as ID;
        console.log(`[Effect]: Challenge created with ID: ${challengeId}`);

        const challengeDoc = await challengesCollection.findOne({
          _id: challengeId,
        });
        assertExists(challengeDoc, "Challenge document should exist in DB");
        assertEquals(challengeDoc.partPoints, 34.5); // (3*10) + ((10/100)*45) = 30 + 4.5 = 34.5
        assertEquals(challengeDoc.bonusPoints, 864); // round(3 * 4^1.5 * 6^2) = round(3 * 8 * 36) = 864
        console.log(`[Verification]: PartPoints: ${challengeDoc.partPoints}, BonusPoints: ${challengeDoc.bonusPoints}`);
      },
    );
  });

  await t.step("createChallenge: Failure cases (requires)", async (t) => {
    console.log(
      "\n[Test Group]: Testing 'createChallenge' requirements validation.",
    );
    const validAnaerobicInfo: AnaerobicInfo = {
      _type: "AnaerobicInfo",
      sets: 3,
      reps: 10,
    };

    await t.step(
      "Should return an error if 'level' is not an integer between 1 and 3",
      async () => {
        console.log("[Test Case]: Invalid level (0).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Pushups",
          level: 0,
          info: validAnaerobicInfo,
          daysPerWeek: 3,
          weeks: 4,
        });
        assertObjectMatch(result, {
          error: "Level must be an integer between 1 and 3.",
        });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );

    await t.step(
      "Should return an error if 'daysPerWeek' is not a positive integer",
      async () => {
        console.log("[Test Case]: Invalid daysPerWeek (0).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Pullups",
          level: 1,
          info: validAnaerobicInfo,
          daysPerWeek: 0,
          weeks: 4,
        });
        assertObjectMatch(result, {
          error: "DaysPerWeek must be a positive integer.",
        });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );

    await t.step(
      "Should return an error if 'weeks' is not a positive integer",
      async () => {
        console.log("[Test Case]: Invalid weeks (negative).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Squats",
          level: 1,
          info: validAnaerobicInfo,
          daysPerWeek: 3,
          weeks: -1,
        });
        assertObjectMatch(result, {
          error: "Weeks must be a positive integer.",
        });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );

    await t.step(
      "Should return an error if AnaerobicInfo 'reps' is not a positive integer",
      async () => {
        console.log("[Test Case]: Invalid AnaerobicInfo reps (0).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Deadlifts",
          level: 1,
          info: { _type: "AnaerobicInfo", sets: 3, reps: 0 },
          daysPerWeek: 3,
          weeks: 4,
        });
        assertObjectMatch(result, {
          error: "Reps and sets must be positive integers.",
        });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );

    await t.step(
      "Should return an error if AnaerobicInfo 'weight' is provided but not positive",
      async () => {
        console.log("[Test Case]: Invalid AnaerobicInfo weight (0).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Deadlifts",
          level: 1,
          info: { _type: "AnaerobicInfo", sets: 3, reps: 10, weight: 0 },
          daysPerWeek: 3,
          weeks: 4,
        });
        assertObjectMatch(result, { error: "Info fields should be positive." });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );

    await t.step(
      "Should return an error if RepAerobicInfo 'minutes' is not positive",
      async () => {
        console.log("[Test Case]: Invalid RepAerobicInfo minutes (negative).");
        const result = await concept.createChallenge({
          creator: TEST_USER_ID,
          exercise: "Burpees",
          level: 1,
          info: { _type: "RepAerobicInfo", repSpeed: 60, minutes: -5 },
          daysPerWeek: 3,
          weeks: 4,
        });
        assertObjectMatch(result, { error: "Info fields should be positive." });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );
  });

  let sharedChallengeId: ID; // To be used across multiple tests

  await t.step("openChallenge (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing 'openChallenge'.");
    // Pre-requisite: Create a challenge that is initially closed.
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Plank Hold",
      level: 1,
      info: { _type: "AnaerobicInfo", sets: 1, reps: 60 }, // No weight, as 0 weight is not positive per validation
      daysPerWeek: 2,
      weeks: 1,
    });
    sharedChallengeId = createResult.challenge as ID;
    let challengeDoc = await challengesCollection.findOne({
      _id: sharedChallengeId,
    });
    assertEquals(
      challengeDoc?.open,
      false,
      "Pre-condition: Challenge should be initially closed",
    );
    console.log(`[Pre-condition]: Challenge ${sharedChallengeId} is closed.`);

    await t.step("Should open a challenge if it exists and is closed", async () => {
      console.log(`[Action]: Opening challenge ${sharedChallengeId}.`);
      const result = await concept.openChallenge({ challenge: sharedChallengeId });
      assertEquals(result, {}, "Should return an empty object on success");

      challengeDoc = await challengesCollection.findOne({
        _id: sharedChallengeId,
      });
      assertEquals(challengeDoc?.open, true, "Challenge should now be open");
      console.log(`[Effect]: Challenge ${sharedChallengeId} is now open: ${challengeDoc?.open}`);
    });

    await t.step(
      "Should do nothing if the challenge is already open",
      async () => {
        console.log(`[Action]: Attempting to open already-open challenge ${sharedChallengeId}.`);
        const result = await concept.openChallenge({ challenge: sharedChallengeId });
        assertEquals(result, {}, "Should return an empty object even if already open");

        challengeDoc = await challengesCollection.findOne({
          _id: sharedChallengeId,
        });
        assertEquals(challengeDoc?.open, true, "Challenge should remain open");
        console.log(`[Effect]: Challenge ${sharedChallengeId} state unchanged: ${challengeDoc?.open}`);
      },
    );

    await t.step(
      "Should return an error if the challenge does not exist",
      async () => {
        console.log("[Action]: Attempting to open a non-existent challenge.");
        const result = await concept.openChallenge({
          challenge: "nonExistent" as ID,
        });
        assertObjectMatch(result, { error: "Challenge not found." });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );
  });

  await t.step("closeChallenge (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing 'closeChallenge'.");
    // Pre-requisite: Challenge from openChallenge should still be open.
    let challengeDoc = await challengesCollection.findOne({
      _id: sharedChallengeId,
    });
    assertEquals(
      challengeDoc?.open,
      true,
      "Pre-condition: Challenge should be open from previous steps",
    );
    console.log(`[Pre-condition]: Challenge ${sharedChallengeId} is open.`);

    await t.step(
      "Should close a challenge if it exists and is open",
      async () => {
        console.log(`[Action]: Closing challenge ${sharedChallengeId}.`);
        const result = await concept.closeChallenge({
          challenge: sharedChallengeId,
        });
        assertEquals(result, {}, "Should return an empty object on success");

        challengeDoc = await challengesCollection.findOne({
          _id: sharedChallengeId,
        });
        assertEquals(challengeDoc?.open, false, "Challenge should now be closed");
        console.log(`[Effect]: Challenge ${sharedChallengeId} is now closed: ${challengeDoc?.open}`);
      },
    );

    await t.step(
      "Should do nothing if the challenge is already closed",
      async () => {
        console.log(`[Action]: Attempting to close already-closed challenge ${sharedChallengeId}.`);
        const result = await concept.closeChallenge({
          challenge: sharedChallengeId,
        });
        assertEquals(result, {}, "Should return an empty object even if already closed");

        challengeDoc = await challengesCollection.findOne({
          _id: sharedChallengeId,
        });
        assertEquals(challengeDoc?.open, false, "Challenge should remain closed");
        console.log(`[Effect]: Challenge ${sharedChallengeId} state unchanged: ${challengeDoc?.open}`);
      },
    );

    await t.step(
      "Should return an error if the challenge does not exist",
      async () => {
        console.log("[Action]: Attempting to close a non-existent challenge.");
        const result = await concept.closeChallenge({
          challenge: "nonExistent" as ID,
        });
        assertObjectMatch(result, { error: "Challenge not found." });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );
  });

  await t.step("deleteChallenge (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing 'deleteChallenge'.");
    // Pre-requisite: Create a challenge to delete.
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Yoga Flow",
      level: 1,
      info: { _type: "AnaerobicInfo", sets: 1, reps: 30 },
      daysPerWeek: 1,
      weeks: 1,
    });
    const challengeToDeleteId = createResult.challenge as ID;
    let challengeDoc = await challengesCollection.findOne({
      _id: challengeToDeleteId,
    });
    assertExists(challengeDoc, "Pre-condition: Challenge should exist before deletion");
    console.log(`[Pre-condition]: Challenge ${challengeToDeleteId} exists.`);

    await t.step("Should delete an existing challenge", async () => {
      console.log(`[Action]: Deleting challenge ${challengeToDeleteId}.`);
      const result = await concept.deleteChallenge({
        challenge: challengeToDeleteId,
      });
      assertEquals(result, {}, "Should return an empty object on success");

      challengeDoc = await challengesCollection.findOne({
        _id: challengeToDeleteId,
      });
      assertEquals(
        challengeDoc,
        null,
        "Challenge should no longer exist in DB after deletion",
      );
      console.log(`[Effect]: Challenge ${challengeToDeleteId} successfully deleted.`);
    });

    await t.step(
      "Should return an error if the challenge does not exist",
      async () => {
        console.log("[Action]: Attempting to delete a non-existent challenge.");
        const result = await concept.deleteChallenge({
          challenge: "nonExistent" as ID,
        });
        assertObjectMatch(result, { error: "Challenge not found." });
        console.log(`[Verification]: Error received: ${result.error}`);
      },
    );
  });

  await t.step("_isOpen (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing '_isOpen' query.");
    // Pre-requisite: Create a new challenge for testing open/closed states.
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Pilates",
      level: 2,
      info: { _type: "RepAerobicInfo", repSpeed: 40, minutes: 20 },
      daysPerWeek: 3,
      weeks: 2,
    });
    const challengeId = createResult.challenge as ID;
    console.log(`[Pre-condition]: Challenge ${challengeId} created.`);

    await t.step("Should return true if challenge is open", async () => {
      await concept.openChallenge({ challenge: challengeId }); // Ensure it's open
      console.log(`[Pre-condition]: Challenge ${challengeId} set to open.`);
      const result = await concept._isOpen({ challenge: challengeId });
      assertEquals(result, [{ result: true }]);
      console.log(`[Effect]: _isOpen returned: ${JSON.stringify(result)}`);
    });

    await t.step("Should return false if challenge is closed", async () => {
      await concept.closeChallenge({ challenge: challengeId }); // Ensure it's closed
      console.log(`[Pre-condition]: Challenge ${challengeId} set to closed.`);
      const result = await concept._isOpen({ challenge: challengeId });
      assertEquals(result, [{ result: false }]);
      console.log(`[Effect]: _isOpen returned: ${JSON.stringify(result)}`);
    });

    await t.step(
      "Should return [{ result: false }] for a non-existent challenge",
      async () => {
        console.log("[Action]: Querying _isOpen for a non-existent challenge.");
        const result = await concept._isOpen({ challenge: "nonExistent" as ID });
        assertEquals(
          result,
          [{ result: false }],
          "Should return false for a non-existent challenge as per implementation",
        );
        console.log(`[Effect]: _isOpen returned: ${JSON.stringify(result)}`);
      },
    );
  });

  await t.step("_getChallengeDetails (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing '_getChallengeDetails' query.");
    const anaerobicInfo: AnaerobicInfo = {
      _type: "AnaerobicInfo",
      weight: 60,
      sets: 4,
      reps: 8,
    };
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Overhead Press",
      level: 3,
      info: anaerobicInfo,
      daysPerWeek: 2,
      weeks: 5,
    });
    const challengeId = createResult.challenge as ID;
    console.log(`[Pre-condition]: Challenge ${challengeId} created.`);

    await t.step(
      "Should return correct challenge details for an existing challenge",
      async () => {
        console.log(`[Action]: Getting details for challenge ${challengeId}.`);
        const result = await concept._getChallengeDetails({
          challenge: challengeId,
        });
        assertEquals(result.length, 1);
        assertObjectMatch(result[0], {
          exercise: "Overhead Press",
          level: 3,
          daysPerWeek: 2,
          weeks: 5,
          info: anaerobicInfo,
        });
        console.log(`[Effect]: Details retrieved: ${JSON.stringify(result[0])}`);
      },
    );

    await t.step(
      "Should return an empty array for a non-existent challenge",
      async () => {
        console.log(
          "[Action]: Getting details for a non-existent challenge.",
        );
        const result = await concept._getChallengeDetails({
          challenge: "nonExistent" as ID,
        });
        assertEquals(result, []);
        console.log(`[Effect]: Details retrieved for non-existent challenge: ${JSON.stringify(result)}`);
      },
    );
  });

  await t.step("_getCreator (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing '_getCreator' query.");
    const creatorId: ID = "anotherUser456" as ID;
    const createResult = await concept.createChallenge({
      creator: creatorId,
      exercise: "Jumping Rope",
      level: 1,
      info: { _type: "DistanceAerobicInfo", distanceSpeed: 5, minutes: 15 },
      daysPerWeek: 3,
      weeks: 1,
    });
    const challengeId = createResult.challenge as ID;
    console.log(`[Pre-condition]: Challenge ${challengeId} created by ${creatorId}.`);

    await t.step(
      "Should return the correct creator for an existing challenge",
      async () => {
        console.log(`[Action]: Getting creator for challenge ${challengeId}.`);
        const result = await concept._getCreator({ challenge: challengeId });
        assertEquals(result, [{ creator: creatorId }]);
        console.log(`[Effect]: Creator retrieved: ${JSON.stringify(result[0])}`);
      },
    );

    await t.step(
      "Should return an empty array for a non-existent challenge",
      async () => {
        console.log("[Action]: Getting creator for a non-existent challenge.");
        const result = await concept._getCreator({
          challenge: "nonExistent" as ID,
        });
        assertEquals(result, []);
        console.log(`[Effect]: Creator retrieved for non-existent challenge: ${JSON.stringify(result)}`);
      },
    );
  });

  await t.step("_getPartPoints (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing '_getPartPoints' query.");
    // Expected partPoints = (level * 10) + ((distanceSpeed / 100) * minutes) = (2*10) + ((25/100)*20) = 20 + 5 = 25
    const expectedPartPoints = 25;
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Cycling Sprint",
      level: 2,
      info: { _type: "DistanceAerobicInfo", distanceSpeed: 25, minutes: 20 },
      daysPerWeek: 1,
      weeks: 3,
    });
    const challengeId = createResult.challenge as ID;
    console.log(`[Pre-condition]: Challenge ${challengeId} created with expected part points: ${expectedPartPoints}.`);

    await t.step(
      "Should return the correct part points for an existing challenge",
      async () => {
        console.log(`[Action]: Getting part points for challenge ${challengeId}.`);
        const result = await concept._getPartPoints({ challenge: challengeId });
        assertEquals(result, [{ points: expectedPartPoints }]);
        console.log(`[Effect]: Part points retrieved: ${JSON.stringify(result[0])}`);
      },
    );

    await t.step(
      "Should return an empty array for a non-existent challenge",
      async () => {
        console.log("[Action]: Getting part points for a non-existent challenge.");
        const result = await concept._getPartPoints({
          challenge: "nonExistent" as ID,
        });
        assertEquals(result, []);
        console.log(`[Effect]: Part points retrieved for non-existent challenge: ${JSON.stringify(result)}`);
      },
    );
  });

  await t.step("_getBonusPoints (requires & effects)", async (t) => {
    console.log("\n[Test Group]: Testing '_getBonusPoints' query.");
    // Expected bonusPoints = round(level * daysPerWeek^1.5 * weeks^2)
    // = round(3 * 5^1.5 * 10^2) = round(3 * 11.1803 * 100) = round(3354.09) = 3354
    const expectedBonusPoints = 3354;
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Marathon Training",
      level: 3,
      info: { _type: "DistanceAerobicInfo", distanceSpeed: 12, minutes: 120 },
      daysPerWeek: 5,
      weeks: 10,
    });
    const challengeId = createResult.challenge as ID;
    console.log(`[Pre-condition]: Challenge ${challengeId} created with expected bonus points: ${expectedBonusPoints}.`);

    await t.step(
      "Should return the correct bonus points for an existing challenge",
      async () => {
        console.log(`[Action]: Getting bonus points for challenge ${challengeId}.`);
        const result = await concept._getBonusPoints({ challenge: challengeId });
        assertEquals(result, [{ bonusPoints: expectedBonusPoints }]);
        console.log(`[Effect]: Bonus points retrieved: ${JSON.stringify(result[0])}`);
      },
    );

    await t.step(
      "Should return an empty array for a non-existent challenge",
      async () => {
        console.log(
          "[Action]: Getting bonus points for a non-existent challenge.",
        );
        const result = await concept._getBonusPoints({
          challenge: "nonExistent" as ID,
        });
        assertEquals(result, []);
        console.log(`[Effect]: Bonus points retrieved for non-existent challenge: ${JSON.stringify(result)}`);
      },
    );
  });

  await t.step("Principle Trace: Full Challenge Lifecycle", async () => {
    console.log("\n--- Principle Trace: Demonstrating a full challenge lifecycle ---");

    // 1. Create a challenge
    console.log("\n[Step 1]: Creating a new Anaerobic Challenge (Deadlifts).");
    const anaerobicInfo: AnaerobicInfo = {
      _type: "AnaerobicInfo",
      weight: 80, // kg
      sets: 4,
      reps: 5,
    };
    const createResult = await concept.createChallenge({
      creator: TEST_USER_ID,
      exercise: "Deadlifts",
      level: 3,
      info: anaerobicInfo,
      daysPerWeek: 2,
      weeks: 8,
    });
    assertExists(createResult.challenge, "Challenge creation failed.");
    const challengeId = createResult.challenge as ID;
    console.log(`[Effect]: Challenge created with ID: ${challengeId}`);

    // Verify initial state: closed, correct details, calculated points
    let isOpenResult = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpenResult, [{ result: false }], "Challenge should be initially closed.");
    console.log(`[Verification]: Challenge is initially open: ${isOpenResult[0].result}`);

    let details = await concept._getChallengeDetails({ challenge: challengeId });
    assertEquals(details.length, 1);
    assertObjectMatch(details[0], {
      exercise: "Deadlifts",
      level: 3,
      daysPerWeek: 2,
      weeks: 8,
      info: anaerobicInfo,
    });
    console.log(`[Verification]: Challenge details retrieved: ${JSON.stringify(details[0])}`);

    // Expected point calculations for this specific challenge
    const expectedTracePartPoints = (3 * 10) + (5 * 4 * 80 / 10); // 30 + 160 = 190
    const expectedTraceBonusPoints = Math.round(3 * Math.pow(2, 1.5) * Math.pow(8, 2)); // round(3 * 2.828427 * 64) = round(542.976) = 543

    let partPointsResult = await concept._getPartPoints({ challenge: challengeId });
    assertEquals(partPointsResult, [{ points: expectedTracePartPoints }]);
    console.log(`[Verification]: Part points are: ${partPointsResult[0].points}`);

    let bonusPointsResult = await concept._getBonusPoints({ challenge: challengeId });
    assertEquals(bonusPointsResult, [{ bonusPoints: expectedTraceBonusPoints }]);
    console.log(`[Verification]: Bonus points are: ${bonusPointsResult[0].bonusPoints}`);

    // 2. Open the challenge
    console.log("\n[Step 2]: Opening the challenge.");
    const openResult = await concept.openChallenge({ challenge: challengeId });
    assertEquals(openResult, {}, "Opening challenge should succeed.");
    console.log("[Effect]: Challenge successfully opened.");

    // Verify state: open
    isOpenResult = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpenResult, [{ result: true }], "Challenge should now be open.");
    console.log(`[Verification]: Challenge is now open: ${isOpenResult[0].result}`);

    // 3. Close the challenge
    console.log("\n[Step 3]: Closing the challenge.");
    const closeResult = await concept.closeChallenge({ challenge: challengeId });
    assertEquals(closeResult, {}, "Closing challenge should succeed.");
    console.log("[Effect]: Challenge successfully closed.");

    // Verify state: closed
    isOpenResult = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpenResult, [{ result: false }], "Challenge should now be closed.");
    console.log(`[Verification]: Challenge is now open: ${isOpenResult[0].result}`); // Should print false

    // 4. Delete the challenge
    console.log("\n[Step 4]: Deleting the challenge.");
    const deleteResult = await concept.deleteChallenge({ challenge: challengeId });
    assertEquals(deleteResult, {}, "Deleting challenge should succeed.");
    console.log("[Effect]: Challenge successfully deleted.");

    // Verify state: challenge no longer exists
    const finalCheck = await challengesCollection.findOne({ _id: challengeId });
    assertEquals(finalCheck, null, "Challenge document should not exist after deletion.");
    console.log("[Verification]: Challenge no longer exists in the database.");

    // Verify queries for a deleted challenge (should reflect non-existence)
    console.log("\n[Step 5]: Verifying queries for the deleted challenge.");
    isOpenResult = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpenResult, [{ result: false }], "Queries on deleted challenge should reflect non-existence.");
    console.log(`[Verification]: _isOpen for deleted challenge: ${isOpenResult[0].result}`);

    details = await concept._getChallengeDetails({ challenge: challengeId });
    assertEquals(details, [], "Details for deleted challenge should be empty.");
    console.log(`[Verification]: _getChallengeDetails for deleted challenge: ${JSON.stringify(details)}`);

    console.log("\n--- End of Principle Trace ---");
  });

  await client.close();
});
```
