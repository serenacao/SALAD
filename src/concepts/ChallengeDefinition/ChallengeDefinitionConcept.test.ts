import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengeDefinitionConcept, {
  AnaerobicInfo,
  RepAerobicInfo,
  DistanceAerobicInfo,
} from "./ChallengeDefinitionConcept.ts";
import { ID, Level } from "@utils/types.ts";

Deno.test("ChallengeDefinition Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeDefinitionConcept(db);

  // Define test users and challenges
  const name1: string = "Challenge 1";
  const name2: string = "Challenge 2";
  const testUser1: ID = "user123" as ID;
  const testUser2: ID = "user456" as ID;
  let challengeId1: ID;
  let challengeId2: ID;

  function getLevelPts(level: Level): number {
    return level === "Easy" ? 1 : level === "Moderate" ? 1.5 : 1.8;
  }
  /**
   * Helper function to calculate points based on challenge info.
   * This is an arbitrary calculation based on the spec's hint.
   */
  function calculatePartPoints(
    level: Level,
    info: RepAerobicInfo | DistanceAerobicInfo | AnaerobicInfo
  ): number {
    const levelPts = getLevelPts(level);
    let basePoints = levelPts * 10;
    if (info._type === "RepAerobicInfo") {
      return (basePoints += calculateRepAerobicPartPoints(info));
    } else if (info._type === "DistanceAerobicInfo") {
      return (basePoints += calculateDistanceAerobicPartPoints(info));
    } else {
      return (basePoints += calculateAnaerobicPartPoints(info));
    }
  }

  function calculateRepAerobicPartPoints(info: RepAerobicInfo): number {
    const points = info.repSpeed * info.minutes;
    return points;
  }

  function calculateDistanceAerobicPartPoints(
    info: DistanceAerobicInfo
  ): number {
    const points = (info.distanceSpeed / 100) * info.minutes;
    return points;
  }

  function calculateAnaerobicPartPoints(info: AnaerobicInfo): number {
    let points = info.reps * info.sets;
    if (info.weight) {
      points *= info.weight / 10;
    }
    return points;
  }

  /**
   * Helper function to calculate bonus points based on challenge info.
   * This is an arbitrary calculation based on the spec's hint.
   */
  function calculateBonusPoints(
    level: Level,
    daysPerWeek: number,
    weeks: number
  ): number {
    const levelPts = getLevelPts(level);
    return Math.round(levelPts * daysPerWeek ** 1.5 * weeks ** 2);
  }
  await t.step(
    "[Action]: createChallenge - Valid Anaerobic Challenge",
    async () => {
      console.log("\n--- Testing createChallenge with AnaerobicInfo ---");
      const anaerobicInfo: AnaerobicInfo = {
        _type: "AnaerobicInfo",
        weight: 70,
        sets: 3,
        reps: 10,
      };
      const name = name1;
      const creator = testUser1;
      const exercise = "Bench Press";
      const level = "Moderate";
      const daysPerWeek = 3;
      const weeks = 4;

      const result = await concept.createChallenge({
        name,
        creator,
        exercise,
        level,
        info: anaerobicInfo,
        daysPerWeek,
        weeks,
      });

      console.log("createChallenge result:", result);

      // Assert that no error occurred and a challenge ID is returned
      assertNotEquals(
        (result as { error?: string }).error,
        "Level must be an integer between 1 and 3."
      );
      assertExists((result as { challenge: ID }).challenge);
      challengeId1 = (result as { challenge: ID }).challenge;

      // Verify effects: Challenge exists and details are correct
      const details = await concept._getChallengeDetails({
        challenge: challengeId1,
      });
      console.log("Retrieved details:", details);
      assertEquals(details.length, 1);
      assertEquals(details[0].exercise, exercise);
      assertEquals(details[0].level, level);
      assertEquals(details[0].daysPerWeek, daysPerWeek);
      assertEquals(details[0].weeks, weeks);
      assertEquals(details[0].info, anaerobicInfo);

      const creatorResult = await concept._getCreator({
        challenge: challengeId1,
      });
      assertEquals(creatorResult.length, 1);
      assertEquals(creatorResult[0].creator, creator);

      const isOpen = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(isOpen.length, 1);
      assertEquals(
        isOpen[0].isOpen,
        false,
        "Challenge should be closed by default."
      );

      // Verify points calculation
      const expectedPartPoints = calculatePartPoints(level, anaerobicInfo);
      const expectedBonusPoints = calculateBonusPoints(
        level,
        daysPerWeek,
        weeks
      );

      const partPointsResult = await concept._getPartPoints({
        challenge: challengeId1,
      });
      assertEquals(partPointsResult.length, 1);
      assertEquals(
        partPointsResult[0].points,
        expectedPartPoints,
        "Part points mismatch."
      );

      const bonusPointsResult = await concept._getBonusPoints({
        challenge: challengeId1,
      });
      assertEquals(bonusPointsResult.length, 1);
      assertEquals(
        bonusPointsResult[0].bonusPoints,
        expectedBonusPoints,
        "Bonus points mismatch."
      );

      console.log(
        "Expected part points:",
        expectedPartPoints,
        "Actual:",
        partPointsResult[0].points
      );
      console.log(
        "Expected bonus points:",
        expectedBonusPoints,
        "Actual:",
        bonusPointsResult[0].bonusPoints
      );
      console.log(
        "createChallenge with AnaerobicInfo successful and verified."
      );
    }
  );

  await t.step(
    "[Action]: createChallenge - Valid RepAerobic Challenge",
    async () => {
      console.log("\n--- Testing createChallenge with RepAerobicInfo ---");
      const repAerobicInfo: RepAerobicInfo = {
        _type: "RepAerobicInfo",
        repSpeed: 60,
        minutes: 30,
      };
      const name = name2;
      const creator = testUser2;
      const exercise = "Jumping Jacks";
      const level = "Easy";
      const daysPerWeek = 5;
      const weeks = 2;

      const result = await concept.createChallenge({
        name,
        creator,
        exercise,
        level,
        info: repAerobicInfo,
        daysPerWeek,
        weeks,
      });

      console.log("createChallenge result:", result);
      assertExists((result as { challenge: ID }).challenge);
      challengeId2 = (result as { challenge: ID }).challenge;

      const details = await concept._getChallengeDetails({
        challenge: challengeId2,
      });
      assertEquals(details.length, 1);
      assertEquals(details[0].info, repAerobicInfo);

      const expectedPartPoints = calculatePartPoints(level, repAerobicInfo);
      const expectedBonusPoints = calculateBonusPoints(
        level,
        daysPerWeek,
        weeks
      );

      const partPointsResult = await concept._getPartPoints({
        challenge: challengeId2,
      });
      assertEquals(partPointsResult[0].points, expectedPartPoints);

      const bonusPointsResult = await concept._getBonusPoints({
        challenge: challengeId2,
      });
      assertEquals(bonusPointsResult[0].bonusPoints, expectedBonusPoints);

      console.log(
        "createChallenge with RepAerobicInfo successful and verified."
      );
    }
  );

  await t.step(
    "[Action]: createChallenge - Valid DistanceAerobic Challenge",
    async () => {
      console.log("\n--- Testing createChallenge with DistanceAerobicInfo ---");
      const distanceAerobicInfo: DistanceAerobicInfo = {
        _type: "DistanceAerobicInfo",
        distanceSpeed: 10,
        minutes: 45,
      };
      const creator = testUser1;
      const name = name1;
      const exercise = "Running";
      const level = "Intense";
      const daysPerWeek = 2;
      const weeks = 8;

      const result = await concept.createChallenge({
        name,
        creator,
        exercise,
        level,
        info: distanceAerobicInfo,
        daysPerWeek,
        weeks,
      });

      console.log("createChallenge result:", result);
      assertExists((result as { challenge: ID }).challenge);
      const challengeId3 = (result as { challenge: ID }).challenge;

      const details = await concept._getChallengeDetails({
        challenge: challengeId3,
      });
      assertEquals(details.length, 1);
      assertEquals(details[0].info, distanceAerobicInfo);

      const expectedPartPoints = calculatePartPoints(
        level,
        distanceAerobicInfo
      );
      const expectedBonusPoints = calculateBonusPoints(
        level,
        daysPerWeek,
        weeks
      );

      const partPointsResult = await concept._getPartPoints({
        challenge: challengeId3,
      });
      assertEquals(partPointsResult[0].points, expectedPartPoints);

      const bonusPointsResult = await concept._getBonusPoints({
        challenge: challengeId3,
      });
      assertEquals(bonusPointsResult[0].bonusPoints, expectedBonusPoints);

      console.log(
        "createChallenge with DistanceAerobicInfo successful and verified."
      );
    }
  );

  await t.step(
    "[Action]: createChallenge - Invalid input (requires)",
    async () => {
      console.log("\n--- Testing createChallenge with invalid inputs ---");
      const validInfo: AnaerobicInfo = {
        _type: "AnaerobicInfo",
        sets: 3,
        reps: 10,
      };

      // Test invalid daysPerWeek
      let result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Pushups",
        level: "Easy",
        info: validInfo,
        daysPerWeek: 0,
        weeks: 4,
      });
      assertEquals(
        (result as { error: string }).error,
        "DaysPerWeek must be a positive integer.",
        "DaysPerWeek 0 should fail."
      );

      // Test invalid weeks
      result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Pushups",
        level: "Easy",
        info: validInfo,
        daysPerWeek: 3,
        weeks: -1,
      });
      assertEquals(
        (result as { error: string }).error,
        "Weeks must be a positive integer.",
        "Weeks negative should fail."
      );

      // Test invalid info fields (negative/zero for applicable fields)
      let invalidInfo: AnaerobicInfo = {
        _type: "AnaerobicInfo",
        sets: -1,
        reps: 10,
      };
      result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Squats",
        level: "Easy",
        info: invalidInfo,
        daysPerWeek: 3,
        weeks: 4,
      });
      assertEquals(
        (result as { error: string }).error,
        "Reps and sets must be positive integers.",
        "Negative sets should fail."
      );

      invalidInfo = { _type: "AnaerobicInfo", sets: 3, reps: 0 };
      result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Squats",
        level: "Easy",
        info: invalidInfo,
        daysPerWeek: 3,
        weeks: 4,
      });
      assertEquals(
        (result as { error: string }).error,
        "Reps and sets must be positive integers.",
        "Zero reps should fail."
      );

      const invalidRepAerobicInfo: RepAerobicInfo = {
        _type: "RepAerobicInfo",
        repSpeed: 0,
        minutes: 20,
      };
      result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Burpees",
        level: "Easy",
        info: invalidRepAerobicInfo,
        daysPerWeek: 3,
        weeks: 4,
      });
      assertEquals(
        (result as { error: string }).error,
        "Info fields should be positive.",
        "Zero repSpeed should fail."
      );

      const invalidDistanceAerobicInfo: DistanceAerobicInfo = {
        _type: "DistanceAerobicInfo",
        distanceSpeed: 5,
        minutes: -10,
      };
      result = await concept.createChallenge({
        name: name1,
        creator: testUser1,
        exercise: "Running",
        level: "Easy",
        info: invalidDistanceAerobicInfo,
        daysPerWeek: 3,
        weeks: 4,
      });
      assertEquals(
        (result as { error: string }).error,
        "Info fields should be positive.",
        "Negative minutes should fail."
      );
      console.log("createChallenge invalid input tests successful.");
    }
  );

  await t.step(
    "[Action]: openChallenge & closeChallenge - Lifecycle",
    async () => {
      console.log("\n--- Testing openChallenge and closeChallenge ---");
      // Initial state: challengeId1 is closed (open: false)
      let isOpenResult = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(
        isOpenResult[0].isOpen,
        false,
        "Initial state: Challenge should be closed."
      );

      // Open the challenge
      const openResult = await concept.openChallenge({
        challenge: challengeId1,
      });
      console.log("openChallenge result:", openResult);
      assertEquals(
        openResult,
        {},
        "openChallenge should return empty object on success."
      );

      // Verify effect: challenge is now open
      isOpenResult = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(
        isOpenResult[0].isOpen,
        true,
        "After openChallenge: Challenge should be open."
      );

      // Try opening again (should do nothing but still return success)
      const reopenResult = await concept.openChallenge({
        challenge: challengeId1,
      });
      console.log("reopenChallenge result:", reopenResult);
      assertEquals(
        reopenResult,
        {},
        "openChallenge again should return empty object."
      );
      isOpenResult = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(
        isOpenResult[0].isOpen,
        true,
        "After re-openChallenge: Challenge should remain open."
      );

      // Close the challenge
      const closeResult = await concept.closeChallenge({
        challenge: challengeId1,
      });
      console.log("closeChallenge result:", closeResult);
      assertEquals(
        closeResult,
        {},
        "closeChallenge should return empty object on success."
      );

      // Verify effect: challenge is now closed
      isOpenResult = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(
        isOpenResult[0].isOpen,
        false,
        "After closeChallenge: Challenge should be closed."
      );

      // Try closing again (should do nothing but still return success)
      const recloseResult = await concept.closeChallenge({
        challenge: challengeId1,
      });
      console.log("recloseChallenge result:", recloseResult);
      assertEquals(
        recloseResult,
        {},
        "closeChallenge again should return empty object."
      );
      isOpenResult = await concept._isOpen({ challenge: challengeId1 });
      assertEquals(
        isOpenResult[0].isOpen,
        false,
        "After re-closeChallenge: Challenge should remain closed."
      );
      console.log("openChallenge and closeChallenge lifecycle successful.");
    }
  );

  await t.step(
    "[Action]: openChallenge & closeChallenge - Non-existent challenge",
    async () => {
      console.log(
        "\n--- Testing openChallenge and closeChallenge with non-existent challenge ---"
      );
      const nonExistentId: ID = "nonExistentChallenge" as ID;

      let result = await concept.openChallenge({ challenge: nonExistentId });
      assertEquals(
        (result as { error: string }).error,
        "Challenge not found.",
        "Opening non-existent challenge should return error."
      );

      result = await concept.closeChallenge({ challenge: nonExistentId });
      assertEquals(
        (result as { error: string }).error,
        "Challenge not found.",
        "Closing non-existent challenge should return error."
      );
      console.log(
        "openChallenge and closeChallenge non-existent challenge tests successful."
      );
    }
  );

  await t.step("[Action]: deleteChallenge", async () => {
    console.log("\n--- Testing deleteChallenge ---");
    // Ensure challengeId1 exists
    let details = await concept._getChallengeDetails({
      challenge: challengeId1,
    });
    assertEquals(details.length, 1, "Challenge should exist before deletion.");

    // Delete the challenge
    const deleteResult = await concept.deleteChallenge({
      challenge: challengeId1,
    });
    console.log("deleteChallenge result:", deleteResult);
    assertEquals(
      deleteResult,
      {},
      "deleteChallenge should return empty object on success."
    );

    // Verify effect: challenge no longer exists
    details = await concept._getChallengeDetails({ challenge: challengeId1 });
    assertEquals(
      details.length,
      0,
      "Challenge should not exist after deletion."
    );

    // Try deleting again (should return error)
    const redeleteResult = await concept.deleteChallenge({
      challenge: challengeId1,
    });
    assertEquals(
      (redeleteResult as { error: string }).error,
      "Challenge not found.",
      "Deleting non-existent challenge should return error."
    );
    console.log("deleteChallenge successful.");
  });

  await t.step(
    "[Query]: _getChallengeDetails, _getCreator, _getPartPoints, _getBonusPoints - Non-existent challenge",
    async () => {
      console.log("\n--- Testing queries with non-existent challenge ---");
      const nonExistentId: ID = "anotherNonExistent" as ID;

      let details = await concept._getChallengeDetails({
        challenge: nonExistentId,
      });
      assertEquals(
        details.length,
        0,
        "_getChallengeDetails should return empty for non-existent."
      );

      let creatorResult = await concept._getCreator({
        challenge: nonExistentId,
      });
      assertEquals(
        creatorResult.length,
        0,
        "_getCreator should return empty for non-existent."
      );

      let partPointsResult = await concept._getPartPoints({
        challenge: nonExistentId,
      });
      assertEquals(
        partPointsResult.length,
        0,
        "_getPartPoints should return empty for non-existent."
      );

      let bonusPointsResult = await concept._getBonusPoints({
        challenge: nonExistentId,
      });
      assertEquals(
        bonusPointsResult.length,
        0,
        "_getBonusPoints should return empty for non-existent."
      );

      let isOpenResult = await concept._isOpen({ challenge: nonExistentId });
      assertEquals(
        isOpenResult[0].isOpen,
        false,
        "_isOpen should return false for non-existent."
      );
      console.log("Querying non-existent challenge tests successful.");
    }
  );

  await t.step(
    "# trace: Principle fulfillment - Create, Open, Close, Delete a Challenge",
    async () => {
      console.log("\n--- Principle Fulfillment Trace ---");
      const creator = testUser1;
      const exercise = "Principle Test Exercise";
      const level = "Moderate";
      const daysPerWeek = 5;
      const weeks = 6;
      const info: AnaerobicInfo = {
        _type: "AnaerobicInfo",
        weight: 80,
        sets: 4,
        reps: 8,
      };
      const name = name1;

      console.log("Step 1: Create a new challenge.");
      const createResult = await concept.createChallenge({
        name,
        creator,
        exercise,
        level,
        info,
        daysPerWeek,
        weeks,
      });
      assertExists((createResult as { challenge: ID }).challenge);
      const principleChallengeId = (createResult as { challenge: ID })
        .challenge;
      console.log(`Challenge '${principleChallengeId}' created.`);

      // Verify initial state
      let isOpen = await concept._isOpen({ challenge: principleChallengeId });
      assertEquals(
        isOpen[0].isOpen,
        false,
        "Principle Step 1: Challenge should be closed after creation."
      );
      let details = await concept._getChallengeDetails({
        challenge: principleChallengeId,
      });
      assertEquals(
        details[0].exercise,
        exercise,
        "Principle Step 1: Challenge details verified."
      );

      console.log("Step 2: Open the challenge for participation.");
      const openResult = await concept.openChallenge({
        challenge: principleChallengeId,
      });
      assertEquals(
        openResult,
        {},
        "Principle Step 2: Open challenge action successful."
      );

      // Verify effect
      isOpen = await concept._isOpen({ challenge: principleChallengeId });
      assertEquals(
        isOpen[0].isOpen,
        true,
        "Principle Step 2: Challenge should now be open."
      );
      console.log(`Challenge '${principleChallengeId}' is now open.`);

      console.log("Step 3: Close the challenge.");
      const closeResult = await concept.closeChallenge({
        challenge: principleChallengeId,
      });
      assertEquals(
        closeResult,
        {},
        "Principle Step 3: Close challenge action successful."
      );

      // Verify effect
      isOpen = await concept._isOpen({ challenge: principleChallengeId });
      assertEquals(
        isOpen[0].isOpen,
        false,
        "Principle Step 3: Challenge should now be closed."
      );
      console.log(`Challenge '${principleChallengeId}' is now closed.`);

      console.log("Step 4: Delete the challenge.");
      const deleteResult = await concept.deleteChallenge({
        challenge: principleChallengeId,
      });
      assertEquals(
        deleteResult,
        {},
        "Principle Step 4: Delete challenge action successful."
      );

      // Verify effect
      details = await concept._getChallengeDetails({
        challenge: principleChallengeId,
      });
      assertEquals(
        details.length,
        0,
        "Principle Step 4: Challenge should no longer exist after deletion."
      );
      console.log(`Challenge '${principleChallengeId}' has been deleted.`);
      console.log("Principle fulfillment trace completed successfully.");
    }
  );

  await client.close();
});
