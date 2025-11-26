---
timestamp: 'Tue Nov 25 2025 08:13:29 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_081329.8df703de.md]]'
content_id: 5f44250b385227fd6a0356fc58fedb0ecc16f4f0a784a37cae91ad6dbf1cb402
---

# response:

```typescript
// file: src/concepts/ChallengeDefinition/ChallengeDefinitionConcept.test.ts

import { Collection, Db } from "npm:mongodb";
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ChallengeDefinitionConcept, {
  AnaerobicInfo,
  RepAerobicInfo,
  DistanceAerobicInfo,
} from "./ChallengeDefinitionConcept.ts";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeDefinition" + ".";

Deno.test("ChallengeDefinitionConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeDefinitionConcept(db);
  const challengesCollection: Collection = db.collection(PREFIX + "Challenges");

  // Mock data for tests
  const mockUser: ID = "user123" as ID;
  let createdChallengeId: ID | null = null; // To store a challenge ID for general cleanup

  // Helper function to create a challenge for reuse in tests
  const createTestChallenge = async (
    level: number = 2,
    info: AnaerobicInfo | RepAerobicInfo | DistanceAerobicInfo = {
      _type: "AnaerobicInfo",
      sets: 3,
      reps: 10,
      weight: 50,
    },
    daysPerWeek: number = 3,
    weeks: number = 4,
    creator: ID = mockUser,
    exercise: string = "Push-ups"
  ): Promise<ID> => {
    const result = await concept.createChallenge({
      creator,
      exercise,
      level,
      info,
      daysPerWeek,
      weeks,
    });
    if ("error" in result) {
      throw new Error(`Failed to create challenge: ${result.error}`);
    }
    return result.challenge;
  };

  await t.step("Principle: A user creates, manages, and queries a challenge.", async () => {
    console.log("\n--- Principle Test: Challenge Lifecycle ---");

    // 1. Create a challenge
    const aerobicInfo: RepAerobicInfo = {
      _type: "RepAerobicInfo",
      repSpeed: 20,
      minutes: 30,
    };
    const createResult = await concept.createChallenge({
      creator: mockUser,
      exercise: "Running",
      level: 2,
      info: aerobicInfo,
      daysPerWeek: 3,
      weeks: 4,
    });
    if ("error" in createResult) {
      throw new Error(`Principle Test Error: ${createResult.error}`);
    }
    const challengeId = createResult.challenge;
    createdChallengeId = challengeId; // Store for potential later cleanup
    console.log(`[Action] createChallenge: Created challenge with ID ${challengeId}`);
    assertEquals(typeof challengeId, "string", "Challenge ID should be a string");
    const docAfterCreation = await challengesCollection.findOne({ _id: challengeId });
    assertEquals(docAfterCreation?.creator, mockUser, "Creator should be correctly set");
    assertEquals(docAfterCreation?.exercise, "Running", "Exercise should be correctly set");
    assertEquals(docAfterCreation?.open, false, "Challenge should be initially closed");

    // 2. Get challenge details and verify
    const detailsResult = await concept._getChallengeDetails({ challenge: challengeId });
    console.log(`[Query] _getChallengeDetails: Retrieved details for challenge ${challengeId}`);
    assertEquals(detailsResult.length, 1, "Should return one challenge detail");
    assertEquals(detailsResult[0].exercise, "Running", "Exercise should match");
    assertEquals(detailsResult[0].level, 2, "Level should match");
    assertEquals(detailsResult[0].daysPerWeek, 3, "DaysPerWeek should match");
    assertEquals(detailsResult[0].weeks, 4, "Weeks should match");
    assertEquals(detailsResult[0].info, aerobicInfo, "Info should match");

    // 3. Open the challenge
    const openResult = await concept.openChallenge({ challenge: challengeId });
    console.log(`[Action] openChallenge: Opened challenge ${challengeId}`);
    assertEquals(Object.keys(openResult).length, 0, "openChallenge should return an empty object on success");
    const openStatus = await concept._isOpen({ challenge: challengeId });
    assertEquals(openStatus[0].result, true, "Challenge should now be open");

    // 4. Try to open it again (should do nothing, no error, and remain open)
    await concept.openChallenge({ challenge: challengeId });
    const openStatusAgain = await concept._isOpen({ challenge: challengeId });
    assertEquals(openStatusAgain[0].result, true, "Challenge should still be open after re-opening");

    // 5. Close the challenge
    const closeResult = await concept.closeChallenge({ challenge: challengeId });
    console.log(`[Action] closeChallenge: Closed challenge ${challengeId}`);
    assertEquals(Object.keys(closeResult).length, 0, "closeChallenge should return an empty object on success");
    const closedStatus = await concept._isOpen({ challenge: challengeId });
    assertEquals(closedStatus[0].result, false, "Challenge should now be closed");

    // 6. Try to close it again (should do nothing, no error, and remain closed)
    await concept.closeChallenge({ challenge: challengeId });
    const closedStatusAgain = await concept._isOpen({ challenge: challengeId });
    assertEquals(closedStatusAgain[0].result, false, "Challenge should still be closed after re-closing");

    // 7. Get creator
    const creatorResult = await concept._getCreator({ challenge: challengeId });
    console.log(`[Query] _getCreator: Retrieved creator for challenge ${challengeId}`);
    assertEquals(creatorResult.length, 1, "Should return one creator");
    assertEquals(creatorResult[0].creator, mockUser, "Creator should match");

    // 8. Get part points and bonus points
    // Expected partPoints for level 2, RepAerobicInfo {repSpeed: 20, minutes: 30}:
    // basePoints = 2 * 10 = 20
    // aerobicPoints = 20 * 30 = 600
    // total = 20 + 600 = 620
    const partPointsResult = await concept._getPartPoints({ challenge: challengeId });
    console.log(`[Query] _getPartPoints: Retrieved part points for challenge ${challengeId}`);
    assertEquals(partPointsResult.length, 1, "Should return part points");
    assertEquals(partPointsResult[0].points, 620, "Part points calculation is incorrect for RepAerobicInfo");

    // Expected bonusPoints for level 2, daysPerWeek 3, weeks 4:
    // bonusPoints = Math.round(2 * 3 ** 1.5 * 4 ** 2)
    //             = Math.round(2 * 5.196 * 16)
    //             = Math.round(166.276) = 166
    const bonusPointsResult = await concept._getBonusPoints({ challenge: challengeId });
    console.log(`[Query] _getBonusPoints: Retrieved bonus points for challenge ${challengeId}`);
    assertEquals(bonusPointsResult.length, 1, "Should return bonus points");
    assertEquals(bonusPointsResult[0].bonusPoints, 166, "Bonus points calculation is incorrect");

    // 9. Delete the challenge
    const deleteResult = await concept.deleteChallenge({ challenge: challengeId });
    console.log(`[Action] deleteChallenge: Deleted challenge ${challengeId}`);
    assertEquals(Object.keys(deleteResult).length, 0, "deleteChallenge should return an empty object on success");
    const deletedDoc = await challengesCollection.findOne({ _id: challengeId });
    assertEquals(deletedDoc, null, "Challenge should no longer exist in the database");

    // 10. Verify queries for a deleted challenge return empty/default values
    // _isOpen returns [{result: false}] as per implementation for non-existent challenge
    assertEquals((await concept._isOpen({ challenge: challengeId }))[0].result, false, "isOpen for deleted challenge should be false");
    assertEquals((await concept._getChallengeDetails({ challenge: challengeId })).length, 0, "getChallengeDetails for deleted challenge should be empty");
    assertEquals((await concept._getCreator({ challenge: challengeId })).length, 0, "getCreator for deleted challenge should be empty");
    assertEquals((await concept._getPartPoints({ challenge: challengeId })).length, 0, "getPartPoints for deleted challenge should be empty");
    assertEquals((await concept._getBonusPoints({ challenge: challengeId })).length, 0, "getBonusPoints for deleted challenge should be empty");

    createdChallengeId = null; // Mark as cleaned up
    console.log("--- End Principle Test ---");
  });

  await t.step("Action: createChallenge", async (t) => {
    console.log("\n--- Testing createChallenge ---");

    await t.step("Requires: level is an integer in {1, 2, 3}", async () => {
      // Test with level < 1
      let result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 0, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Level must be an integer between 1 and 3." }, "Level 0 should fail");

      // Test with level > 3
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 4, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Level must be an integer between 1 and 3." }, "Level 4 should fail");

      // Test with non-integer level
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1.5, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Level must be an integer between 1 and 3." }, "Non-integer level should fail");
    });

    await t.step("Requires: daysPerWeek is a positive integer", async () => {
      // Test with daysPerWeek <= 0
      let result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 0, weeks: 1,
      });
      assertEquals(result, { error: "DaysPerWeek must be a positive integer." }, "DaysPerWeek 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: -1, weeks: 1,
      });
      assertEquals(result, { error: "DaysPerWeek must be a positive integer." }, "DaysPerWeek negative should fail");

      // Test with non-integer daysPerWeek
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1.5, weeks: 1,
      });
      assertEquals(result, { error: "DaysPerWeek must be a positive integer." }, "Non-integer daysPerWeek should fail");
    });

    await t.step("Requires: weeks is a positive integer", async () => {
      // Test with weeks <= 0
      let result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: 0,
      });
      assertEquals(result, { error: "Weeks must be a positive integer." }, "Weeks 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: -1,
      });
      assertEquals(result, { error: "Weeks must be a positive integer." }, "Weeks negative should fail");

      // Test with non-integer weeks
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1 }, daysPerWeek: 1, weeks: 1.5,
      });
      assertEquals(result, { error: "Weeks must be a positive integer." }, "Non-integer weeks should fail");
    });

    await t.step("Requires: info fields (reps, sets, weight, repSpeed, distanceSpeed, minutes) are valid", async () => {
      // AnaerobicInfo: reps, sets must be positive integers; weight must be positive number (if present)
      let result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 0, reps: 1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Reps and sets must be positive integers." }, "Anaerobic sets 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: -1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Reps and sets must be positive integers." }, "Anaerobic reps negative should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1.5, reps: 1 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Reps and sets must be positive integers." }, "Anaerobic non-integer sets should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1, weight: 0 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "Anaerobic weight 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1, weight: -10 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "Anaerobic negative weight should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "AnaerobicInfo", sets: 1, reps: 1, weight: "abc" as unknown as number }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields must be numbers." }, "Anaerobic non-number weight should fail");


      // RepAerobicInfo: repSpeed, minutes must be positive numbers
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "RepAerobicInfo", repSpeed: 0, minutes: 10 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "RepAerobic repSpeed 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "RepAerobicInfo", repSpeed: 10, minutes: -5 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "RepAerobic minutes negative should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "RepAerobicInfo", repSpeed: "abc" as unknown as number, minutes: 10 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields must be numbers." }, "RepAerobic non-number repSpeed should fail");


      // DistanceAerobicInfo: distanceSpeed, minutes must be positive numbers
      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "DistanceAerobicInfo", distanceSpeed: 0, minutes: 10 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "DistanceAerobic distanceSpeed 0 should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "DistanceAerobicInfo", distanceSpeed: 10, minutes: -5 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields should be positive." }, "DistanceAerobic minutes negative should fail");

      result = await concept.createChallenge({
        creator: mockUser, exercise: "Test", level: 1, info: { _type: "DistanceAerobicInfo", distanceSpeed: "abc" as unknown as number, minutes: 10 }, daysPerWeek: 1, weeks: 1,
      });
      assertEquals(result, { error: "Info fields must be numbers." }, "DistanceAerobic non-number distanceSpeed should fail");
    });

    await t.step("Effects: creates a new ChallengeDoc and calculates points correctly for AnaerobicInfo", async () => {
      const creator: ID = "creator456" as ID;
      const exercise = "Squats";
      const info: AnaerobicInfo = { _type: "AnaerobicInfo", weight: 70, sets: 4, reps: 8 };
      const level = 3;
      const daysPerWeek = 2;
      const weeks = 6;

      const result = await concept.createChallenge({
        creator, exercise, level, info, daysPerWeek, weeks,
      });

      if ("error" in result) {
        throw new Error(`createChallenge failed: ${result.error}`);
      }
      createdChallengeId = result.challenge; // Store for cleanup

      const doc = await challengesCollection.findOne({ _id: createdChallengeId });
      assertEquals(doc?._id, createdChallengeId, "Challenge ID should match");
      assertEquals(doc?.creator, creator, "Creator should match");
      assertEquals(doc?.exercise, exercise, "Exercise should match");
      assertEquals(doc?.info, info, "Info should match");
      assertEquals(doc?.daysPerWeek, daysPerWeek, "DaysPerWeek should match");
      assertEquals(doc?.weeks, weeks, "Weeks should match");
      assertEquals(doc?.level, level, "Level should match");
      assertEquals(doc?.open, false, "Challenge should initially be closed");

      // Verify AnaerobicInfo point calculations: partPoints = level*10 + reps*sets*weight/10 (if weight exists)
      const expectedPartPoints = level * 10 + (info.reps * info.sets * (info.weight! / 10));
      assertEquals(doc?.partPoints, expectedPartPoints, `Part points calculation for AnaerobicInfo is incorrect. Expected ${expectedPartPoints}, got ${doc?.partPoints}`);

      // Verify bonus points calculation: Math.round(level * daysPerWeek ** 1.5 * weeks ** 2)
      const expectedBonusPoints = Math.round(level * daysPerWeek ** 1.5 * weeks ** 2);
      assertEquals(doc?.bonusPoints, expectedBonusPoints, `Bonus points calculation is incorrect. Expected ${expectedBonusPoints}, got ${doc?.bonusPoints}`);

      await concept.deleteChallenge({ challenge: createdChallengeId }); // Clean up this specific challenge
      createdChallengeId = null; // Reset
    });

    await t.step("Effects: creates a new ChallengeDoc and calculates points correctly for RepAerobicInfo", async () => {
      const creator: ID = "creator789" as ID;
      const exercise = "Jumping Jacks";
      const info: RepAerobicInfo = { _type: "RepAerobicInfo", repSpeed: 25, minutes: 15 };
      const level = 1;
      const daysPerWeek = 4;
      const weeks = 3;

      const result = await concept.createChallenge({
        creator, exercise, level, info, daysPerWeek, weeks,
      });

      if ("error" in result) {
        throw new Error(`createChallenge failed: ${result.error}`);
      }
      createdChallengeId = result.challenge; // Store for cleanup

      const doc = await challengesCollection.findOne({ _id: createdChallengeId });
      assertEquals(doc?.exercise, exercise, "Exercise should match");
      assertEquals(doc?.info, info, "Info should match");
      assertEquals(doc?.level, level, "Level should match");

      // Verify RepAerobicInfo part points: partPoints = level*10 + repSpeed*minutes
      const expectedPartPoints = level * 10 + (info.repSpeed * info.minutes);
      assertEquals(doc?.partPoints, expectedPartPoints, `Part points calculation for RepAerobicInfo is incorrect. Expected ${expectedPartPoints}, got ${doc?.partPoints}`);

      // Verify bonus points calculation
      const expectedBonusPoints = Math.round(level * daysPerWeek ** 1.5 * weeks ** 2);
      assertEquals(doc?.bonusPoints, expectedBonusPoints, `Bonus points calculation is incorrect. Expected ${expectedBonusPoints}, got ${doc?.bonusPoints}`);

      await concept.deleteChallenge({ challenge: createdChallengeId }); // Clean up this specific challenge
      createdChallengeId = null; // Reset
    });

    await t.step("Effects: creates a new ChallengeDoc and calculates points correctly for DistanceAerobicInfo", async () => {
      const creator: ID = "creator101" as ID;
      const exercise = "Running";
      const info: DistanceAerobicInfo = { _type: "DistanceAerobicInfo", distanceSpeed: 12, minutes: 45 };
      const level = 2;
      const daysPerWeek = 5;
      const weeks = 2;

      const result = await concept.createChallenge({
        creator, exercise, level, info, daysPerWeek, weeks,
      });

      if ("error" in result) {
        throw new Error(`createChallenge failed: ${result.error}`);
      }
      createdChallengeId = result.challenge; // Store for cleanup

      const doc = await challengesCollection.findOne({ _id: createdChallengeId });
      assertEquals(doc?.exercise, exercise, "Exercise should match");
      assertEquals(doc?.info, info, "Info should match");
      assertEquals(doc?.level, level, "Level should match");

      // Verify DistanceAerobicInfo part points: partPoints = level*10 + (distanceSpeed/100)*minutes
      const expectedPartPoints = level * 10 + (info.distanceSpeed / 100) * info.minutes;
      assertEquals(doc?.partPoints, expectedPartPoints, `Part points calculation for DistanceAerobicInfo is incorrect. Expected ${expectedPartPoints}, got ${doc?.partPoints}`);

      // Verify bonus points calculation
      const expectedBonusPoints = Math.round(level * daysPerWeek ** 1.5 * weeks ** 2);
      assertEquals(doc?.bonusPoints, expectedBonusPoints, `Bonus points calculation is incorrect. Expected ${expectedBonusPoints}, got ${doc?.bonusPoints}`);

      await concept.deleteChallenge({ challenge: createdChallengeId }); // Clean up this specific challenge
      createdChallengeId = null; // Reset
    });
    console.log("--- End createChallenge Tests ---");
  });

  await t.step("Action: openChallenge", async (t) => {
    console.log("\n--- Testing openChallenge ---");
    const challengeId = await createTestChallenge();
    createdChallengeId = challengeId; // Store for cleanup

    await t.step("Requires: challenge exists", async () => {
      const nonExistentId: ID = "nonExistent" as ID;
      const result = await concept.openChallenge({ challenge: nonExistentId });
      assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge");
    });

    await t.step("Effects: sets Open to True if False, otherwise does nothing", async () => {
      // Initially false
      let doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, false, "Challenge should initially be closed");

      // Open it
      await concept.openChallenge({ challenge: challengeId });
      doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, true, "Challenge should be open after first call");

      // Open it again (should not change anything but remain true)
      await concept.openChallenge({ challenge: challengeId });
      doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, true, "Challenge should remain open after second call");
    });
    console.log("--- End openChallenge Tests ---");
  });

  await t.step("Action: closeChallenge", async (t) => {
    console.log("\n--- Testing closeChallenge ---");
    const challengeId = await createTestChallenge();
    createdChallengeId = challengeId; // Store for cleanup
    await concept.openChallenge({ challenge: challengeId }); // Ensure it's open for testing close

    await t.step("Requires: challenge exists", async () => {
      const nonExistentId: ID = "nonExistent" as ID;
      const result = await concept.closeChallenge({ challenge: nonExistentId });
      assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge");
    });

    await t.step("Effects: sets Open to False if True, otherwise does nothing", async () => {
      // Initially true (from setup)
      let doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, true, "Challenge should initially be open");

      // Close it
      await concept.closeChallenge({ challenge: challengeId });
      doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, false, "Challenge should be closed after first call");

      // Close it again (should not change anything but remain false)
      await concept.closeChallenge({ challenge: challengeId });
      doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?.open, false, "Challenge should remain closed after second call");
    });
    console.log("--- End closeChallenge Tests ---");
  });

  await t.step("Action: deleteChallenge", async (t) => {
    console.log("\n--- Testing deleteChallenge ---");
    const challengeId = await createTestChallenge();
    createdChallengeId = challengeId; // Store for cleanup (if test fails before deleting)

    await t.step("Requires: challenge exists", async () => {
      const nonExistentId: ID = "nonExistent" as ID;
      const result = await concept.deleteChallenge({ challenge: nonExistentId });
      assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge");
    });

    await t.step("Effects: deletes challenge from Challenges", async () => {
      // Verify challenge exists initially
      let doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc?._id, challengeId, "Challenge should exist before deletion");

      // Delete it
      const deleteResult = await concept.deleteChallenge({ challenge: challengeId });
      assertEquals(Object.keys(deleteResult).length, 0, "deleteChallenge should return empty object on success");

      // Verify it's deleted
      doc = await challengesCollection.findOne({ _id: challengeId });
      assertEquals(doc, null, "Challenge should not exist after deletion");
      createdChallengeId = null; // Mark as cleaned up
    });
    console.log("--- End deleteChallenge Tests ---");
  });

  await t.step("Query Actions", async (t) => {
    console.log("\n--- Testing Query Actions ---");
    const challengeId = await createTestChallenge(1, { _type: "DistanceAerobicInfo", distanceSpeed: 10, minutes: 60 }, 5, 2, mockUser, "Test Running");
    createdChallengeId = challengeId; // Store for cleanup

    await t.step("_isOpen", async (t) => {
      await t.step("Requires: challenge exists", async () => {
        const nonExistentId: ID = "nonExistent" as ID;
        const result = await concept._isOpen({ challenge: nonExistentId });
        assertEquals(result, [{ result: false }], "Should return [{ result: false }] for non-existent challenge");
      });

      await t.step("Effects: returns whether challenge is Open", async () => {
        await concept.closeChallenge({ challenge: challengeId });
        let result = await concept._isOpen({ challenge: challengeId });
        assertEquals(result, [{ result: false }], "Should return false for closed challenge");

        await concept.openChallenge({ challenge: challengeId });
        result = await concept._isOpen({ challenge: challengeId });
        assertEquals(result, [{ result: true }], "Should return true for open challenge");
      });
    });

    await t.step("_getChallengeDetails", async (t) => {
      await t.step("Requires: challenge exists", async () => {
        const nonExistentId: ID = "nonExistent" as ID;
        const result = await concept._getChallengeDetails({ challenge: nonExistentId });
        assertEquals(result, [], "Should return empty array for non-existent challenge");
      });

      await t.step("Effects: returns Exercise, Level, DaysPerWeek, Weeks, Info", async () => {
        const result = await concept._getChallengeDetails({ challenge: challengeId });
        assertEquals(result.length, 1, "Should return one challenge detail");
        assertEquals(result[0].exercise, "Test Running", "Exercise should match");
        assertEquals(result[0].level, 1, "Level should match");
        assertEquals(result[0].daysPerWeek, 5, "DaysPerWeek should match");
        assertEquals(result[0].weeks, 2, "Weeks should match");
        assertEquals(result[0].info, { _type: "DistanceAerobicInfo", distanceSpeed: 10, minutes: 60 }, "Info should match");
      });
    });

    await t.step("_getCreator", async (t) => {
      await t.step("Requires: challenge exists", async () => {
        const nonExistentId: ID = "nonExistent" as ID;
        const result = await concept._getCreator({ challenge: nonExistentId });
        assertEquals(result, [], "Should return empty array for non-existent challenge");
      });

      await t.step("Effects: returns Creator", async () => {
        const result = await concept._getCreator({ challenge: challengeId });
        assertEquals(result.length, 1, "Should return one creator");
        assertEquals(result[0].creator, mockUser, "Creator should match");
      });
    });

    await t.step("_getPartPoints", async (t) => {
      await t.step("Requires: challenge exists", async () => {
        const nonExistentId: ID = "nonExistent" as ID;
        const result = await concept._getPartPoints({ challenge: nonExistentId });
        assertEquals(result, [], "Should return empty array for non-existent challenge");
      });

      await t.step("Effects: returns PartPoints", async () => {
        const result = await concept._getPartPoints({ challenge: challengeId });
        assertEquals(result.length, 1, "Should return part points");
        // Verify against expected calculation for the test challenge (level 1, DistanceAerobicInfo 10km/h, 60min)
        // partPoints = level*10 + (distanceSpeed/100)*minutes
        // partPoints = 1*10 + (10/100)*60 = 10 + 0.1*60 = 10 + 6 = 16
        assertEquals(result[0].points, 16, "Part points should be 16");
      });
    });

    await t.step("_getBonusPoints", async (t) => {
      await t.step("Requires: challenge exists", async () => {
        const nonExistentId: ID = "nonExistent" as ID;
        const result = await concept._getBonusPoints({ challenge: nonExistentId });
        assertEquals(result, [], "Should return empty array for non-existent challenge");
      });

      await t.step("Effects: returns BonusPoints", async () => {
        const result = await concept._getBonusPoints({ challenge: challengeId });
        assertEquals(result.length, 1, "Should return bonus points");
        // Verify against expected calculation for the test challenge (level 1, daysPerWeek 5, weeks 2)
        // bonusPoints = Math.round(level * daysPerWeek ** 1.5 * weeks ** 2)
        // bonusPoints = Math.round(1 * 5 ** 1.5 * 2 ** 2) = Math.round(1 * 11.180339 * 4) = Math.round(44.721356) = 45
        assertEquals(result[0].bonusPoints, 45, "Bonus points should be 45");
      });
    });
    console.log("--- End Query Actions Tests ---");
  });

  // Final cleanup for any challenges created and not explicitly deleted by tests
  if (createdChallengeId) {
    try {
      console.log(`\n--- Final Cleanup: Deleting challenge ${createdChallengeId} ---`);
      await concept.deleteChallenge({ challenge: createdChallengeId });
    } catch (e) {
      console.warn(`Error during final cleanup of ${createdChallengeId}: ${e.message}`);
    }
  }

  await client.close();
});

```
