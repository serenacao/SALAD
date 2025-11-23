---
timestamp: 'Sat Nov 22 2025 16:20:24 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_162024.eb9d361d.md]]'
content_id: 0d71411449b59eed79c27773ad5c7bf6d0c8e28d28bd5873234da7d0c42d567d
---

# response:

```typescript
// file: src/concepts/Challenges/ChallengesConcept.test.ts
import { Collection, Db } from "npm:mongodb";
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertArrayIncludes,
  assertStrictEquals,
} from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ChallengesConcept from "./ChallengesConcept.ts";
import { ID, Empty } from "@utils/types.ts";

// Define generic types used in the concept
type User = ID;
type Group = ID;
type Challenge = ID;
type Part = ID;
type VerificationRequest = ID;
type File = ID; // Assuming file is represented by an ID reference to a file storage concept

// Helper function for creating a ChallengesConcept instance in each test
async function setupConcept(): Promise<[ChallengesConcept, Db, Deno.Closer]> {
  const [db, client] = await testDb();
  const concept = new ChallengesConcept(db);
  return [concept, db, client];
}

Deno.test("Challenges Concept", async (t) => {
  let concept: ChallengesConcept;
  let db: Db;
  let client: Deno.Closer;

  // Setup before each test run
  // Note: testDb already handles dropping the database before tests,
  // so `t.beforeEach` setting up the concept and client for *each* step
  // effectively provides a clean slate.
  t.beforeEach(async () => {
    [concept, db, client] = await setupConcept();
  });

  // Teardown after each test run
  t.afterEach(async () => {
    await client.close();
  });

  // --- Test Cases for Actions ---

  await t.step("createChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    const groupA = "group:team alpha" as Group;

    // The beforeEach/afterEach hooks for the main test apply to sub-steps as well,
    // so `setupConcept()` will run again before each `sts.step`.
    // This ensures isolation between sub-steps.

    await sts.step(
      "should create a new challenge for a user with valid parameters",
      async () => {
        console.log("--- Testing createChallenge: valid user creation ---");
        const result = await concept.createChallenge({
          creator: userA,
          creatorType: "User",
          level: 2,
          exercise: "Push-ups",
          reps: 10,
          sets: 3,
          frequency: 3,
          duration: 4,
        });

        assertExists(
          (result as { challenge: Challenge }).challenge,
          "Challenge ID should be returned."
        );
        const challengeId = (result as { challenge: Challenge }).challenge;
        console.log(`  Created challenge with ID: ${challengeId}`);

        const challenge = await concept.challenges.findOne({ _id: challengeId });
        assertExists(challenge, "Challenge should exist in the database.");
        assertEquals(challenge?.creator, userA);
        assertEquals(challenge?.creatorType, "User");
        assertEquals(challenge?.exercise, "Push-ups");
        assertEquals(challenge?.level, 2);
        assertEquals(challenge?.reps, 10);
        assertEquals(challenge?.sets, 3);
        assertEquals(challenge?.frequency, 3);
        assertEquals(challenge?.duration, 4);
        assertEquals(
          challenge?.open,
          false,
          "Challenge should be closed by default."
        );
        assertNotEquals(
          challenge?.points,
          0,
          "Points should be calculated and non-zero."
        );
        assertNotEquals(
          challenge?.bonusPoints,
          0,
          "Bonus points should be calculated and non-zero."
        );

        const parts = await concept.parts
          .find({ challenge: challengeId })
          .toArray();
        assertEquals(
          parts.length,
          challenge!.frequency * challenge!.duration,
          "Correct number of parts should be created."
        );
        console.log(
          `  Verified challenge details and ${parts.length} parts created.`
        );
      }
    );

    await sts.step(
      "should create a new challenge for a group with valid parameters",
      async () => {
        console.log("--- Testing createChallenge: valid group creation ---");
        const result = await concept.createChallenge({
          creator: groupA,
          creatorType: "Group",
          level: 1,
          exercise: "Running",
          minutes: 30,
          frequency: 2,
          duration: 2,
        });

        assertExists(
          (result as { challenge: Challenge }).challenge,
          "Challenge ID should be returned."
        );
        const challengeId = (result as { challenge: Challenge }).challenge;
        console.log(`  Created group challenge with ID: ${challengeId}`);

        const challenge = await concept.challenges.findOne({ _id: challengeId });
        assertExists(challenge, "Group challenge should exist in the database.");
        assertEquals(challenge?.creator, groupA);
        assertEquals(challenge?.creatorType, "Group");
        assertEquals(challenge?.exercise, "Running");
        assertEquals(challenge?.minutes, 30);
        assertEquals(challenge?.level, 1);
        assertEquals(challenge?.frequency, 2);
        assertEquals(challenge?.duration, 2);

        const parts = await concept.parts
          .find({ challenge: challengeId })
          .toArray();
        assertEquals(
          parts.length,
          challenge!.frequency * challenge!.duration,
          "Correct number of parts should be created for group challenge."
        );
      }
    );

    await sts.step("should return an error for invalid level", async () => {
      console.log("--- Testing createChallenge: invalid level ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 0,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid level."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Level must be an integer between 1 and 3.",
        "Correct error message for invalid level."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid reps", async () => {
      console.log("--- Testing createChallenge: invalid reps ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        reps: -1,
        frequency: 1,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid reps."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Reps must be a positive integer if provided.",
        "Correct error message for invalid reps."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid sets", async () => {
      console.log("--- Testing createChallenge: invalid sets ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        sets: 0,
        frequency: 1,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid sets."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Sets must be a positive integer if provided.",
        "Correct error message for invalid sets."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid weight", async () => {
      console.log("--- Testing createChallenge: invalid weight ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        weight: -5,
        frequency: 1,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid weight."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Weight must be a positive number if provided.",
        "Correct error message for invalid weight."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid minutes", async () => {
      console.log("--- Testing createChallenge: invalid minutes ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        minutes: 0,
        frequency: 1,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid minutes."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Minutes must be a positive number if provided.",
        "Correct error message for invalid minutes."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid frequency", async () => {
      console.log("--- Testing createChallenge: invalid frequency ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 0,
        duration: 1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid frequency."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Frequency must be a positive integer.",
        "Correct error message for invalid frequency."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step("should return an error for invalid duration", async () => {
      console.log("--- Testing createChallenge: invalid duration ---");
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: -1,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for invalid duration."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Duration must be a positive integer.",
        "Correct error message for invalid duration."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });
  });

  await t.step("openChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    let challengeId: Challenge;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (result as { challenge: Challenge }).challenge;
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should open a closed challenge", async () => {
      console.log(
        `--- Testing openChallenge: opening challenge ${challengeId} ---`
      );
      let challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(
        challenge?.open,
        false,
        "Challenge should initially be closed."
      );

      const result = await concept.openChallenge({ challenge: challengeId });
      assertEquals(result, {}, "Should return empty object on success.");

      challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, true, "Challenge should now be open.");
      console.log("  Challenge successfully opened.");
    });

    await sts.step("should do nothing if challenge is already open", async () => {
      console.log(
        `--- Testing openChallenge: already open challenge ${challengeId} ---`
      );
      await concept.openChallenge({ challenge: challengeId }); // Open it first
      let challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, true, "Challenge should be open.");

      const result = await concept.openChallenge({ challenge: challengeId });
      assertEquals(result, {}, "Should return empty object on success.");

      challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, true, "Challenge should remain open.");
      console.log("  Challenge remained open, no change.");
    });

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log("--- Testing openChallenge: non-existent challenge ---");
        const nonExistentChallenge = freshID();
        const result = await concept.openChallenge({
          challenge: nonExistentChallenge,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("closeChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    let challengeId: Challenge;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (result as { challenge: Challenge }).challenge;
      await concept.openChallenge({ challenge: challengeId }); // Ensure it's open for closing
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should close an open challenge", async () => {
      console.log(
        `--- Testing closeChallenge: closing challenge ${challengeId} ---`
      );
      let challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(
        challenge?.open,
        true,
        "Challenge should initially be open."
      );

      const result = await concept.closeChallenge({ challenge: challengeId });
      assertEquals(result, {}, "Should return empty object on success.");

      challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, false, "Challenge should now be closed.");
      console.log("  Challenge successfully closed.");
    });

    await sts.step("should do nothing if challenge is already closed", async () => {
      console.log(
        `--- Testing closeChallenge: already closed challenge ${challengeId} ---`
      );
      await concept.closeChallenge({ challenge: challengeId }); // Close it first
      let challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, false, "Challenge should be closed.");

      const result = await concept.closeChallenge({ challenge: challengeId });
      assertEquals(result, {}, "Should return empty object on success.");

      challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(challenge?.open, false, "Challenge should remain closed.");
      console.log("  Challenge remained closed, no change.");
    });

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log("--- Testing closeChallenge: non-existent challenge ---");
        const nonExistentChallenge = freshID();
        const result = await concept.closeChallenge({
          challenge: nonExistentChallenge,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("deleteChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    let challengeId: Challenge;
    let partId: Part;
    let verificationRequestId: VerificationRequest;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      const parts = await concept.parts
        .find({ challenge: challengeId })
        .toArray();
      partId = parts[0]._id; // Get the first part for testing

      // Create a verification request associated with this challenge and part
      const userB = "user:bob" as User;
      await concept.openChallenge({ challenge: challengeId }); // Must be open to create VR
      const vrResult = await concept.createVerificationRequest({
        part: partId,
        requester: userA,
        approver: userB,
        evidence: freshID() as File,
      });
      verificationRequestId = (vrResult as {
        verificationRequest: VerificationRequest;
      }).verificationRequest;
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step(
      "should delete an existing challenge and its associated parts and verification requests",
      async () => {
        console.log(
          `--- Testing deleteChallenge: deleting challenge ${challengeId} ---`
        );
        let challenge = await concept.challenges.findOne({ _id: challengeId });
        assertExists(challenge, "Challenge should exist before deletion.");
        let part = await concept.parts.findOne({ _id: partId });
        assertExists(part, "Part should exist before deletion.");
        let vr = await concept.verificationRequests.findOne({
          _id: verificationRequestId,
        });
        assertExists(vr, "Verification request should exist before deletion.");

        const result = await concept.deleteChallenge({ challenge: challengeId });
        assertEquals(result, {}, "Should return empty object on success.");

        challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(challenge, null, "Challenge should be deleted.");
        part = await concept.parts.findOne({ _id: partId });
        assertEquals(part, null, "Associated part should be deleted.");
        vr = await concept.verificationRequests.findOne({
          _id: verificationRequestId,
        });
        assertEquals(vr, null, "Associated verification request should be deleted.");
        console.log(
          "  Challenge, parts, and verification requests successfully deleted."
        );
      }
    );

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log("--- Testing deleteChallenge: non-existent challenge ---");
        const nonExistentChallenge = freshID();
        const result = await concept.deleteChallenge({
          challenge: nonExistentChallenge,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("inviteToChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    const userC = "user:charlie" as User;
    let challengeId: Challenge;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should invite new users to a challenge", async () => {
      console.log(
        `--- Testing inviteToChallenge: inviting new users to ${challengeId} ---`
      );
      const result = await concept.inviteToChallenge({
        challenge: challengeId,
        users: [userB, userC],
      });
      assertEquals(result, {}, "Should return empty object on success.");

      const challenge = await concept.challenges.findOne({ _id: challengeId });
      assertExists(challenge, "Challenge should exist.");
      assertEquals(
        challenge?.participants.length,
        2,
        "Two participants should be added."
      );
      assertArrayIncludes(
        challenge!.participants.map((p) => p.user),
        [userB, userC],
        "User B and C should be participants."
      );
      assertEquals(
        challenge?.participants.find((p) => p.user === userB)?.accepted,
        false,
        "User B should not be accepted yet."
      );
      assertEquals(
        challenge?.participants.find((p) => p.user === userC)?.completed,
        false,
        "User C should not be completed yet."
      );
      console.log("  Users B and C invited successfully, not yet accepted/completed.");
    });

    await sts.step("should not add duplicate users", async () => {
      console.log(
        `--- Testing inviteToChallenge: avoiding duplicates in ${challengeId} ---`
      );
      await concept.inviteToChallenge({ challenge: challengeId, users: [userB] }); // Invite B once
      const result = await concept.inviteToChallenge({
        challenge: challengeId,
        users: [userB, userC],
      }); // Try to invite B again, and C for the first time
      assertEquals(result, {}, "Should return empty object on success.");

      const challenge = await concept.challenges.findOne({ _id: challengeId });
      assertExists(challenge, "Challenge should exist.");
      assertEquals(
        challenge?.participants.length,
        2,
        "Only two unique participants should exist (B and C)."
      );
      assertArrayIncludes(
        challenge!.participants.map((p) => p.user),
        [userB, userC],
        "User B and C should be participants."
      );
      console.log("  Duplicate user B was not added again.");
    });

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log(
          "--- Testing inviteToChallenge: non-existent challenge ---"
        );
        const nonExistentChallenge = freshID();
        const result = await concept.inviteToChallenge({
          challenge: nonExistentChallenge,
          users: [userB],
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("acceptChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    const userC = "user:charlie" as User;
    let challengeId: Challenge;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      await concept.inviteToChallenge({ challenge: challengeId, users: [userB] });
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should accept an invited user", async () => {
      console.log(
        `--- Testing acceptChallenge: user ${userB} accepting ${challengeId} ---`
      );
      let challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(
        challenge?.participants.find((p) => p.user === userB)?.accepted,
        false,
        "User B should not be accepted initially."
      );

      const result = await concept.acceptChallenge({
        challenge: challengeId,
        user: userB,
      });
      assertEquals(result, {}, "Should return empty object on success.");

      challenge = await concept.challenges.findOne({ _id: challengeId });
      assertEquals(
        challenge?.participants.find((p) => p.user === userB)?.accepted,
        true,
        "User B should now be accepted."
      );
      console.log(`  User ${userB} successfully accepted the challenge.`);
    });

    await sts.step(
      "should do nothing if user is already accepted",
      async () => {
        console.log(
          `--- Testing acceptChallenge: user ${userB} already accepted ${challengeId} ---`
        );
        await concept.acceptChallenge({ challenge: challengeId, user: userB }); // Accept first
        let challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(
          challenge?.participants.find((p) => p.user === userB)?.accepted,
          true,
          "User B should be accepted."
        );

        const result = await concept.acceptChallenge({
          challenge: challengeId,
          user: userB,
        });
        assertEquals(result, {}, "Should return empty object on success.");

        challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(
          challenge?.participants.find((p) => p.user === userB)?.accepted,
          true,
          "User B should remain accepted."
        );
        console.log(`  User ${userB} remained accepted, no change.`);
      }
    );

    await sts.step("should return error if user is not invited", async () => {
      console.log(
        `--- Testing acceptChallenge: non-invited user ${userC} ---`
      );
      const result = await concept.acceptChallenge({
        challenge: challengeId,
        user: userC,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-invited user."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "User is not invited to this challenge.",
        "Correct error message for non-invited user."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log("--- Testing acceptChallenge: non-existent challenge ---");
        const nonExistentChallenge = freshID();
        const result = await concept.acceptChallenge({
          challenge: nonExistentChallenge,
          user: userB,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("leaveChallenge action", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    let challengeId: Challenge;
    let partId: Part;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      await concept.inviteToChallenge({ challenge: challengeId, users: [userB] });
      await concept.acceptChallenge({ challenge: challengeId, user: userB });
      await concept.openChallenge({ challenge: challengeId }); // For completing parts

      const parts = await concept.parts
        .find({ challenge: challengeId })
        .toArray();
      partId = parts[0]._id;
      await concept.completePart({ part: partId, user: userB }); // User B completes a part
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step(
      "should remove user from challenge participants and completers",
      async () => {
        console.log(
          `--- Testing leaveChallenge: user ${userB} leaving ${challengeId} ---`
        );
        let challenge = await concept.challenges.findOne({ _id: challengeId });
        assertExists(
          challenge?.participants.find((p) => p.user === userB),
          "User B should be a participant."
        );
        let part = await concept.parts.findOne({ _id: partId });
        assertArrayIncludes(
          part!.completers,
          [userB],
          "User B should be a completer of a part."
        );

        const result = await concept.leaveChallenge({
          challenge: challengeId,
          user: userB,
        });
        assertEquals(result, {}, "Should return empty object on success.");

        challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(
          challenge?.participants.find((p) => p.user === userB),
          undefined,
          "User B should no longer be a participant."
        );
        part = await concept.parts.findOne({ _id: partId });
        assertEquals(
          part!.completers.includes(userB),
          false,
          "User B should be removed from completers."
        );
        console.log(
          `  User ${userB} successfully left the challenge and removed from parts.`
        );
      }
    );

    await sts.step(
      "should return error if user is not a participant",
      async () => {
        console.log("--- Testing leaveChallenge: non-participant user ---");
        const userC = "user:charlie" as User;
        const result = await concept.leaveChallenge({
          challenge: challengeId,
          user: userC,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-participant user."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "User is not a participant in this challenge.",
          "Correct error message for non-participant user."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );

    await sts.step(
      "should return error if challenge does not exist",
      async () => {
        console.log("--- Testing leaveChallenge: non-existent challenge ---");
        const nonExistentChallenge = freshID();
        const result = await concept.leaveChallenge({
          challenge: nonExistentChallenge,
          user: userB,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent challenge."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge not found.",
          "Correct error message for non-existent challenge."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );
  });

  await t.step("completePart action", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    const userC = "user:charlie" as User; // Not an accepted participant
    let challengeId: Challenge;
    let partIds: Part[] = [];

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 2,
        duration: 1, // 2 parts total
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      await concept.inviteToChallenge({ challenge: challengeId, users: [userB] });
      await concept.acceptChallenge({ challenge: challengeId, user: userB });
      await concept.openChallenge({ challenge: challengeId });

      const parts = await concept.parts
        .find({ challenge: challengeId })
        .toArray();
      partIds = parts.map((p) => p._id);
      assertEquals(partIds.length, 2, "Should have 2 parts for this challenge.");
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should add user to completers for a part", async () => {
      console.log(
        `--- Testing completePart: user ${userB} completing part ${partIds[0]} ---`
      );
      let part = await concept.parts.findOne({ _id: partIds[0] });
      assertEquals(
        part!.completers.includes(userB),
        false,
        "User B should not be a completer initially."
      );

      const result = await concept.completePart({
        part: partIds[0],
        user: userB,
      });
      assertEquals(result, {}, "Should return empty object on success.");

      part = await concept.parts.findOne({ _id: partIds[0] });
      assertArrayIncludes(
        part!.completers,
        [userB],
        "User B should now be a completer."
      );
      console.log(`  User ${userB} completed part ${partIds[0]}.`);
    });

    await sts.step(
      "should mark challenge as completed for user after all parts are done",
      async () => {
        console.log(
          `--- Testing completePart: user ${userB} completing all parts for ${challengeId} ---`
        );
        // Complete first part
        await concept.completePart({ part: partIds[0], user: userB });
        let challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(
          challenge?.participants.find((p) => p.user === userB)?.completed,
          false,
          "Challenge should not be completed yet."
        );

        // Complete second part
        await concept.completePart({ part: partIds[1], user: userB });

        challenge = await concept.challenges.findOne({ _id: challengeId });
        assertEquals(
          challenge?.participants.find((p) => p.user === userB)?.completed,
          true,
          "Challenge should now be completed for user B."
        );
        console.log(
          `  User ${userB} completed all parts and challenge ${challengeId} is marked complete.`
        );
      }
    );

    await sts.step("should return error if challenge is not open", async () => {
      console.log("--- Testing completePart: challenge not open ---");
      await concept.closeChallenge({ challenge: challengeId });
      const result = await concept.completePart({
        part: partIds[0],
        user: userB,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error if challenge is not open."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Challenge is not open.",
        "Correct error message for challenge not open."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });

    await sts.step(
      "should return error if user is not an accepted participant",
      async () => {
        console.log(
          `--- Testing completePart: user ${userC} not accepted ---`
        );
        const result = await concept.completePart({
          part: partIds[0],
          user: userC,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error if user is not accepted."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "User is not an accepted participant in this challenge.",
          "Correct error message for user not accepted."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );

    await sts.step("should return error if part does not exist", async () => {
      console.log("--- Testing completePart: non-existent part ---");
      const nonExistentPart = freshID();
      const result = await concept.completePart({
        part: nonExistentPart,
        user: userB,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-existent part."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Part not found.",
        "Correct error message for non-existent part."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });
  });

  await t.step("createVerificationRequest action", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    const userC = "user:charlie" as User;
    let challengeId: Challenge;
    let partId: Part;
    const evidenceFile = freshID() as File;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      await concept.openChallenge({ challenge: challengeId });
      const parts = await concept.parts
        .find({ challenge: challengeId })
        .toArray();
      partId = parts[0]._id;
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should create a new verification request", async () => {
      console.log(
        `--- Testing createVerificationRequest: creating request for part ${partId} ---`
      );
      const result = await concept.createVerificationRequest({
        part: partId,
        requester: userA,
        approver: userB,
        evidence: evidenceFile,
      });

      assertExists(
        (result as { verificationRequest: VerificationRequest })
          .verificationRequest,
        "Verification request ID should be returned."
      );
      const vrId = (result as {
        verificationRequest: VerificationRequest;
      }).verificationRequest;
      console.log(`  Created verification request with ID: ${vrId}`);

      const vr = await concept.verificationRequests.findOne({ _id: vrId });
      assertExists(vr, "Verification request should exist in the database.");
      assertEquals(vr?.part, partId);
      assertEquals(vr?.requester, userA);
      assertEquals(vr?.approver, userB);
      assertEquals(vr?.evidence, evidenceFile);
      assertEquals(
        vr?.approved,
        false,
        "Request should initially be unapproved."
      );
      console.log("  Verification request created and state verified.");
    });

    await sts.step(
      "should return error if requester is same as approver",
      async () => {
        console.log(
          "--- Testing createVerificationRequest: requester == approver ---"
        );
        const result = await concept.createVerificationRequest({
          part: partId,
          requester: userA,
          approver: userA,
          evidence: evidenceFile,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error if requester is same as approver."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Requester must be distinct from Approver.",
          "Correct error message for requester == approver."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );

    await sts.step(
      "should return error if challenge is not open",
      async () => {
        console.log(
          "--- Testing createVerificationRequest: challenge not open ---"
        );
        await concept.closeChallenge({ challenge: challengeId });
        const result = await concept.createVerificationRequest({
          part: partId,
          requester: userA,
          approver: userB,
          evidence: evidenceFile,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error if challenge is not open."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Challenge is not open.",
          "Correct error message for challenge not open."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);
      }
    );

    await sts.step("should return error if part does not exist", async () => {
      console.log(
        "--- Testing createVerificationRequest: non-existent part ---"
      );
      const nonExistentPart = freshID();
      const result = await concept.createVerificationRequest({
        part: nonExistentPart,
        requester: userA,
        approver: userB,
        evidence: evidenceFile,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-existent part."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Part not found.",
        "Correct error message for non-existent part."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });
  });

  await t.step("verify action", async (sts) => {
    const userA = "user:alice" as User; // Requester
    const userB = "user:bob" as User; // Approver (as per the code's assumption)
    let challengeId: Challenge;
    let partId: Part;
    let verificationRequestId: VerificationRequest;
    const evidenceFile = freshID() as File;

    sts.beforeEach(async () => {
      [concept, db, client] = await setupConcept();
      const createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 1,
        exercise: "Test",
        frequency: 1,
        duration: 1,
      });
      challengeId = (createResult as { challenge: Challenge }).challenge;
      await concept.openChallenge({ challenge: challengeId });
      const parts = await concept.parts
        .find({ challenge: challengeId })
        .toArray();
      partId = parts[0]._id;

      const vrResult = await concept.createVerificationRequest({
        part: partId,
        requester: userA,
        approver: userB,
        evidence: evidenceFile,
      });
      verificationRequestId = (vrResult as {
        verificationRequest: VerificationRequest;
      }).verificationRequest;
    });
    sts.afterEach(async () => {
      await client.close();
    });

    await sts.step("should approve an existing verification request", async () => {
      console.log(
        `--- Testing verify: approving request ${verificationRequestId} for part ${partId} by ${userA} ---`
      );
      let vr = await concept.verificationRequests.findOne({
        _id: verificationRequestId,
      });
      assertEquals(
        vr?.approved,
        false,
        "Verification request should initially be unapproved."
      );

      // The 'verify' action takes part and requester. It implies the caller is the approver.
      // For this test, we assume the context of userB calling this action via a sync.
      // So the arguments identify the specific request to be approved.
      const result = await concept.verify({ part: partId, requester: userA });
      assertEquals(result, {}, "Should return empty object on success.");

      vr = await concept.verificationRequests.findOne({
        _id: verificationRequestId,
      });
      assertEquals(vr?.approved, true, "Verification request should now be approved.");
      console.log("  Verification request successfully approved.");
    });

    await sts.step(
      "should return error if verification request does not exist",
      async () => {
        console.log("--- Testing verify: non-existent request ---");
        const nonExistentPart = freshID(); // part does not match
        const result = await concept.verify({
          part: nonExistentPart,
          requester: userA,
        });
        assertExists(
          (result as { error: string }).error,
          "Should return an error for non-existent request."
        );
        assertStrictEquals(
          (result as { error: string }).error,
          "Pending verification request not found for this part and requester.",
          "Correct error message for non-existent request."
        );
        console.log(`  Error: ${(result as { error: string }).error}`);

        // Also test with correct part but wrong requester
        const wrongRequester = "user:wrong" as User;
        const result2 = await concept.verify({
          part: partId,
          requester: wrongRequester,
        });
        assertExists(
          (result2 as { error: string }).error,
          "Should return an error for non-existent request with wrong requester."
        );
        assertStrictEquals(
          (result2 as { error: string }).error,
          "Pending verification request not found for this part and requester.",
          "Correct error message for non-existent request with wrong requester."
        );
      }
    );

    await sts.step("should return error if challenge is not open", async () => {
      console.log("--- Testing verify: challenge not open ---");
      await concept.closeChallenge({ challenge: challengeId });
      const result = await concept.verify({ part: partId, requester: userA });
      assertExists(
        (result as { error: string }).error,
        "Should return an error if challenge is not open."
      );
      assertStrictEquals(
        (result as { error: string }).error,
        "Challenge is not open.",
        "Correct error message for challenge not open."
      );
      console.log(`  Error: ${(result as { error: string }).error}`);
    });
  });

  // --- Test Cases for Queries ---

  await t.step("Queries", async (sts) => {
    const userA = "user:alice" as User;
    const userB = "user:bob" as User;
    const userC = "user:charlie" as User;
    const groupA = "group:team alpha" as Group;
    let challengeUserCreator: Challenge;
    let challengeGroupCreator: Challenge;
    let partUserCreator1: Part;
    let partUserCreator2: Part;

    sts.beforeAll(async () => {
      // Setup shared state for all query tests in this `t.step` block
      // This will ensure all sub-steps run against the same pre-populated state.
      [concept, db, client] = await setupConcept();

      // Challenge by User A
      let createResult = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 2,
        exercise: "UserChallenge",
        frequency: 2,
        duration: 1, // 2 parts
        reps: 10,
        sets: 3,
        weight: 50,
        minutes: 20,
      });
      challengeUserCreator = (createResult as { challenge: Challenge }).challenge;
      await concept.openChallenge({ challenge: challengeUserCreator });
      await concept.inviteToChallenge({
        challenge: challengeUserCreator,
        users: [userB, userC],
      });
      await concept.acceptChallenge({
        challenge: challengeUserCreator,
        user: userB,
      });

      let parts = await concept.parts
        .find({ challenge: challengeUserCreator })
        .sort({ day: 1 })
        .toArray();
      partUserCreator1 = parts[0]._id;
      partUserCreator2 = parts[1]._id;
      await concept.completePart({ part: partUserCreator1, user: userB }); // User B completes one part
      // Not completing the second part for now so user B is not fully completed yet

      // Challenge by Group A
      createResult = await concept.createChallenge({
        creator: groupA,
        creatorType: "Group",
        level: 1,
        exercise: "GroupChallenge",
        frequency: 1,
        duration: 1,
      });
      challengeGroupCreator = (createResult as { challenge: Challenge }).challenge;
      await concept.openChallenge({ challenge: challengeGroupCreator });
    });

    sts.afterAll(async () => {
      await client.close();
    });

    await sts.step("_isUserCreator query", async () => {
      console.log("--- Testing _isUserCreator query ---");
      let result = await concept._isUserCreator({
        challenge: challengeUserCreator,
        user: userA,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User A should be creator of challengeUserCreator."
      );
      console.log(
        `  _isUserCreator(${challengeUserCreator}, ${userA}): ${JSON.stringify(result)}`
      );

      result = await concept._isUserCreator({
        challenge: challengeUserCreator,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User B should not be creator of challengeUserCreator."
      );
      console.log(
        `  _isUserCreator(${challengeUserCreator}, ${userB}): ${JSON.stringify(result)}`
      );

      result = await concept._isUserCreator({
        challenge: challengeGroupCreator,
        user: userA,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User A should not be creator of challengeGroupCreator."
      );
      console.log(
        `  _isUserCreator(${challengeGroupCreator}, ${userA}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_isGroupCreator query", async () => {
      console.log("--- Testing _isGroupCreator query ---");
      let result = await concept._isGroupCreator({
        challenge: challengeGroupCreator,
        group: groupA,
      });
      assertEquals(
        result,
        [{ result: true }],
        "Group A should be creator of challengeGroupCreator."
      );
      console.log(
        `  _isGroupCreator(${challengeGroupCreator}, ${groupA}): ${JSON.stringify(result)}`
      );

      result = await concept._isGroupCreator({
        challenge: challengeGroupCreator,
        group: "group:beta" as Group,
      });
      assertEquals(
        result,
        [{ result: false }],
        "Group beta should not be creator of challengeGroupCreator."
      );
      console.log(
        `  _isGroupCreator(${challengeGroupCreator}, group:beta): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_isParticipant query", async () => {
      console.log("--- Testing _isParticipant query ---");
      let result = await concept._isParticipant({
        challenge: challengeUserCreator,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User B should be a participant in challengeUserCreator (accepted)."
      );
      console.log(
        `  _isParticipant(${challengeUserCreator}, ${userB}): ${JSON.stringify(result)}`
      );

      result = await concept._isParticipant({
        challenge: challengeUserCreator,
        user: userC,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User C should not be a participant (invited but not accepted)."
      );
      console.log(
        `  _isParticipant(${challengeUserCreator}, ${userC}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_isInvited query", async () => {
      console.log("--- Testing _isInvited query ---");
      let result = await concept._isInvited({
        challenge: challengeUserCreator,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User B should be invited to challengeUserCreator."
      );
      console.log(
        `  _isInvited(${challengeUserCreator}, ${userB}): ${JSON.stringify(result)}`
      );

      result = await concept._isInvited({
        challenge: challengeUserCreator,
        user: userC,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User C should be invited to challengeUserCreator."
      );
      console.log(
        `  _isInvited(${challengeUserCreator}, ${userC}): ${JSON.stringify(result)}`
      );

      result = await concept._isInvited({
        challenge: challengeUserCreator,
        user: userA,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User A is creator, not invited."
      );
      console.log(
        `  _isInvited(${challengeUserCreator}, ${userA}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_isOpen query", async () => {
      console.log("--- Testing _isOpen query ---");
      let result = await concept._isOpen({ challenge: challengeUserCreator });
      assertEquals(
        result,
        [{ result: true }],
        "challengeUserCreator should be open."
      );
      console.log(
        `  _isOpen(${challengeUserCreator}): ${JSON.stringify(result)}`
      );

      await concept.closeChallenge({ challenge: challengeUserCreator });
      result = await concept._isOpen({ challenge: challengeUserCreator });
      assertEquals(
        result,
        [{ result: false }],
        "challengeUserCreator should now be closed."
      );
      console.log(
        `  _isOpen(${challengeUserCreator}) after closing: ${JSON.stringify(result)}`
      );
      await concept.openChallenge({ challenge: challengeUserCreator }); // Reopen for subsequent tests
    });

    await sts.step("_isCompletedPart query", async () => {
      console.log("--- Testing _isCompletedPart query ---");
      let result = await concept._isCompletedPart({
        part: partUserCreator1,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User B should have completed partUserCreator1."
      );
      console.log(
        `  _isCompletedPart(${partUserCreator1}, ${userB}): ${JSON.stringify(result)}`
      );

      result = await concept._isCompletedPart({
        part: partUserCreator2,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User B should not have completed partUserCreator2 yet."
      );
      console.log(
        `  _isCompletedPart(${partUserCreator2}, ${userB}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_isCompletedChallenge query", async () => {
      console.log("--- Testing _isCompletedChallenge query ---");
      let result = await concept._isCompletedChallenge({
        challenge: challengeUserCreator,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: false }],
        "User B should not have completed the entire challenge yet."
      );
      console.log(
        `  _isCompletedChallenge(${challengeUserCreator}, ${userB}): ${JSON.stringify(result)}`
      );

      // Complete the remaining part for userB
      await concept.completePart({ part: partUserCreator2, user: userB });
      result = await concept._isCompletedChallenge({
        challenge: challengeUserCreator,
        user: userB,
      });
      assertEquals(
        result,
        [{ result: true }],
        "User B should now have completed the entire challenge."
      );
      console.log(
        `  _isCompletedChallenge(${challengeUserCreator}, ${userB}) after completing all parts: ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getParticipants query", async () => {
      console.log("--- Testing _getParticipants query ---");
      const result = await concept._getParticipants({
        challenge: challengeUserCreator,
      });
      assertEquals(result.length, 1, "Should return 1 participant (user B).");
      assertEquals(
        result[0].user,
        userB,
        "The participant should be user B."
      );
      console.log(
        `  _getParticipants(${challengeUserCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getInvitees query", async () => {
      console.log("--- Testing _getInvitees query ---");
      const result = await concept._getInvitees({
        challenge: challengeUserCreator,
      });
      assertEquals(result.length, 2, "Should return 2 invitees (user B and C).");
      assertArrayIncludes(
        result.map((p) => p.user),
        [userB, userC],
        "Invitees should include user B and C."
      );
      console.log(
        `  _getInvitees(${challengeUserCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getCompleters query", async () => {
      console.log("--- Testing _getCompleters query ---");
      const result = await concept._getCompleters({
        challenge: challengeUserCreator,
      });
      assertEquals(result.length, 1, "Should return 1 completer (user B).");
      assertEquals(
        result[0].user,
        userB,
        "The completer should be user B."
      );
      console.log(
        `  _getCompleters(${challengeUserCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getChallengeDetails query", async () => {
      console.log("--- Testing _getChallengeDetails query ---");
      const result = await concept._getChallengeDetails({
        challenge: challengeUserCreator,
      });
      assertEquals(
        result.length,
        1,
        "Should return one challenge details object."
      );
      assertEquals(result[0].exercise, "UserChallenge");
      assertEquals(result[0].level, 2);
      assertEquals(result[0].reps, 10);
      assertEquals(result[0].sets, 3);
      assertEquals(result[0].weight, 50);
      assertEquals(result[0].minutes, 20);
      assertEquals(result[0].frequency, 2);
      assertEquals(result[0].duration, 1);
      console.log(
        `  _getChallengeDetails(${challengeUserCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getCreator query", async () => {
      console.log("--- Testing _getCreator query ---");
      let result = await concept._getCreator({
        challenge: challengeUserCreator,
      });
      assertEquals(
        result,
        [{ creator: userA, creatorType: "User" }],
        "Should return user A as creator."
      );
      console.log(
        `  _getCreator(${challengeUserCreator}): ${JSON.stringify(result)}`
      );

      result = await concept._getCreator({ challenge: challengeGroupCreator });
      assertEquals(
        result,
        [{ creator: groupA, creatorType: "Group" }],
        "Should return group A as creator."
      );
      console.log(
        `  _getCreator(${challengeGroupCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getPartPoints query", async () => {
      console.log("--- Testing _getPartPoints query ---");
      const result = await concept._getPartPoints({ part: partUserCreator1 });
      assertEquals(result.length, 1, "Should return points for one part.");
      assertNotEquals(result[0].points, 0, "Points should be a calculated number.");
      console.log(
        `  _getPartPoints(${partUserCreator1}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getChallengePoints query", async () => {
      console.log("--- Testing _getChallengePoints query ---");
      const result = await concept._getChallengePoints({
        challenge: challengeUserCreator,
      });
      assertEquals(
        result.length,
        1,
        "Should return bonus points for one challenge."
      );
      assertNotEquals(
        result[0].bonusPoints,
        0,
        "Bonus points should be a calculated number."
      );
      console.log(
        `  _getChallengePoints(${challengeUserCreator}): ${JSON.stringify(result)}`
      );
    });

    await sts.step("_getChallenges query", async () => {
      console.log("--- Testing _getChallenges query ---");
      const result = await concept._getChallenges({ user: userB });
      assertEquals(
        result.length,
        1,
        "User B should be in one accepted challenge."
      );
      assertEquals(
        result[0].challenge,
        challengeUserCreator,
        "The challenge should be challengeUserCreator."
      );
      console.log(`  _getChallenges(${userB}): ${JSON.stringify(result)}`);

      const resultC = await concept._getChallenges({ user: userC });
      assertEquals(resultC.length, 0, "User C has not accepted any challenges.");
      console.log(`  _getChallenges(${userC}): ${JSON.stringify(resultC)}`);
    });

    await sts.step("_getAssociatedChallenge query", async () => {
      console.log("--- Testing _getAssociatedChallenge query ---");
      const result = await concept._getAssociatedChallenge({
        part: partUserCreator1,
      });
      assertEquals(
        result.length,
        1,
        "Should return one associated challenge."
      );
      assertEquals(
        result[0].challenge,
        challengeUserCreator,
        "The associated challenge should be challengeUserCreator."
      );
      console.log(
        `  _getAssociatedChallenge(${partUserCreator1}): ${JSON.stringify(result)}`
      );
    });
  });

  await t.step("Principle fulfillment trace", async () => {
    console.log(
      "\n--- Principle Fulfillment Trace: Users issue challenges, complete them ---"
    );
    const userA = "user:charlie" as User;
    const userB = "user:diana" as User;
    const userC = "user:eve" as User; // Not invited
    let challengeId: Challenge;
    let partIds: Part[] = [];

    // 1. User A creates a challenge.
    console.log("Step 1: User A creates a challenge.");
    const createResult = await concept.createChallenge({
      creator: userA,
      creatorType: "User",
      level: 1,
      exercise: "Daily Workout",
      frequency: 2,
      duration: 1, // 2 parts
      reps: 10,
      sets: 3,
    });
    challengeId = (createResult as { challenge: Challenge }).challenge;
    assertExists(challengeId);
    console.log(`  Challenge "${challengeId}" created by ${userA}.`);

    // Ensure challenge is open for participation
    await concept.openChallenge({ challenge: challengeId });
    let isOpen = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpen[0].result, true, "Challenge should be open.");
    console.log(`  Challenge ${challengeId} opened.`);

    const parts = await concept.parts
      .find({ challenge: challengeId })
      .sort({ day: 1 })
      .toArray();
    partIds = parts.map((p) => p._id);
    assertEquals(partIds.length, 2, "Expected 2 parts for the challenge.");
    console.log(`  Parts created: ${partIds.join(", ")}`);

    // 2. User A invites User B.
    console.log("\nStep 2: User A invites User B.");
    await concept.inviteToChallenge({ challenge: challengeId, users: [userB] });
    let invitees = await concept._getInvitees({ challenge: challengeId });
    assertArrayIncludes(invitees.map((i) => i.user), [userB]);
    let isInvited = await concept._isInvited({
      challenge: challengeId,
      user: userB,
    });
    assertEquals(isInvited[0].result, true, `User ${userB} should be invited.`);
    console.log(`  User ${userB} invited to challenge ${challengeId}.`);

    // Verify User C is NOT invited
    isInvited = await concept._isInvited({
      challenge: challengeId,
      user: userC,
    });
    assertEquals(isInvited[0].result, false, `User ${userC} should NOT be invited.`);
    console.log(`  User ${userC} is not invited (as expected).`);

    // 3. User B accepts the challenge.
    console.log("\nStep 3: User B accepts the challenge.");
    await concept.acceptChallenge({ challenge: challengeId, user: userB });
    let isParticipant = await concept._isParticipant({
      challenge: challengeId,
      user: userB,
    });
    assertEquals(
      isParticipant[0].result,
      true,
      `User ${userB} should be a participant.`
    );
    console.log(`  User ${userB} accepted challenge ${challengeId}.`);

    // 4. User B completes parts of the challenge.
    console.log("\nStep 4: User B completes the first part of the challenge.");
    await concept.completePart({ part: partIds[0], user: userB });
    let isCompletedPart = await concept._isCompletedPart({
      part: partIds[0],
      user: userB,
    });
    assertEquals(
      isCompletedPart[0].result,
      true,
      `User ${userB} should have completed part ${partIds[0]}.`
    );
    let isCompletedChallenge = await concept._isCompletedChallenge({
      challenge: challengeId,
      user: userB,
    });
    assertEquals(
      isCompletedChallenge[0].result,
      false,
      `User ${userB} should not have completed the entire challenge yet.`
    );
    console.log(
      `  User ${userB} completed part ${partIds[0]}. Challenge not yet fully completed.`
    );

    // 5. User B completes all parts, and the challenge is marked complete for User B.
    console.log(
      "\nStep 5: User B completes the second (and final) part of the challenge."
    );
    await concept.completePart({ part: partIds[1], user: userB });
    isCompletedPart = await concept._isCompletedPart({
      part: partIds[1],
      user: userB,
    });
    assertEquals(
      isCompletedPart[0].result,
      true,
      `User ${userB} should have completed part ${partIds[1]}.`
    );

    isCompletedChallenge = await concept._isCompletedChallenge({
      challenge: challengeId,
      user: userB,
    });
    assertEquals(
      isCompletedChallenge[0].result,
      true,
      `User ${userB} should now have completed the entire challenge.`
    );
    console.log(
      `  User ${userB} completed part ${partIds[1]}. Challenge ${challengeId} is now marked complete for ${userB}.`
    );

    // 6. Verify points and overall completion status.
    console.log("\nStep 6: Verifying points and overall completion status.");
    const challengeDetails = await concept._getChallengeDetails({
      challenge: challengeId,
    });
    assertNotEquals(challengeDetails[0].reps, undefined, "Reps detail should exist.");
    console.log(
      `  Challenge details (e.g., reps: ${challengeDetails[0].reps}) retrieved.`
    );

    const partPoints = await concept._getPartPoints({ part: partIds[0] });
    assertNotEquals(partPoints[0].points, 0, "Part points should be non-zero.");
    console.log(`  Part points: ${partPoints[0].points}.`);

    const bonusPoints = await concept._getChallengePoints({
      challenge: challengeId,
    });
    assertNotEquals(
      bonusPoints[0].bonusPoints,
      0,
      "Bonus points should be non-zero."
    );
    console.log(`  Bonus points: ${bonusPoints[0].bonusPoints}.`);

    let completers = await concept._getCompleters({ challenge: challengeId });
    assertArrayIncludes(
      completers.map((c) => c.user),
      [userB],
      `User ${userB} should be in the completers list.`
    );
    console.log(`  User ${userB} confirmed as a completer of the challenge.`);

    console.log("\n--- Principle fulfillment trace complete and verified. ---");
  });
});
```
