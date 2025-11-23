---
timestamp: 'Sat Nov 22 2025 16:42:28 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_164228.cbe3326b.md]]'
content_id: 9fcf13985a7a1ffe8ddf30c1f67f29f13cfae065b86b45693419112602b60bed
---

# file: src/concepts/Challenges/ChallengesConcept.test.ts

```typescript
import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengesConcept from "./ChallengesConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("Challenges Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengesConcept(db);

  // Define some test IDs for users, groups, and files
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const group1 = "group:Fitness" as ID;
  const file1 = "file:workout_proof_1" as ID;
  const file2 = "file:workout_proof_2" as ID;

  await t.step("1. createChallenge action", async (st) => {
    st.test("should create a new challenge and its parts with valid inputs (User creator)", async () => {
      console.log("\n--- Testing createChallenge (User creator) ---");
      // **requires**: level is integer in {1,2,3}, reps/sets/weight/minutes positive if exist, frequency/duration positive integers.
      // All requirements satisfied.
      const result = await concept.createChallenge({
        creator: userA,
        creatorType: "User",
        level: 2,
        exercise: "Push-ups",
        reps: 10,
        sets: 3,
        frequency: 3, // 3 days per week
        duration: 2, // 2 weeks
      });

      assertExists((result as { challenge: ID }).challenge);
      const challengeId = (result as { challenge: ID }).challenge;
      console.log(`Action: createChallenge(${userA}, level=2, reps=10, sets=3, frequency=3, duration=2)`);
      console.log(`Output: Created challenge with ID: ${challengeId}`);

      // **effects**: creates new Challenge, Open set to False, calculates Points/BonusPoints, creates Parts.
      const challengeDoc = await concept.challenges.findOne({ _id: challengeId });
      assertExists(challengeDoc);
      assertEquals(challengeDoc.creator, userA);
      assertEquals(challengeDoc.creatorType, "User");
      assertEquals(challengeDoc.open, false); // Effect: Open set to False
      assertEquals(challengeDoc.level, 2);
      assertEquals(challengeDoc.reps, 10);
      assertEquals(challengeDoc.sets, 3);
      assertEquals(challengeDoc.frequency, 3);
      assertEquals(challengeDoc.duration, 2);
      assertExists(challengeDoc.points); // Effect: Points calculated
      assertExists(challengeDoc.bonusPoints); // Effect: BonusPoints calculated
      console.log(`Effect: Challenge state confirmed. Open: ${challengeDoc.open}, Points: ${challengeDoc.points}, BonusPoints: ${challengeDoc.bonusPoints}`);

      const parts = await concept.parts.find({ challenge: challengeId }).toArray();
      assertEquals(parts.length, 3 * 2); // frequency * duration. Effect: Parts created.
      parts.forEach(part => {
        assertExists(part._id);
        assertEquals(part.challenge, challengeId);
        assertEquals(part.completers.length, 0);
      });
      console.log(`Effect: Verified ${parts.length} associated parts created with empty completers.`);
    });

    st.test("should create a new challenge and its parts with valid inputs (Group creator)", async () => {
        console.log("\n--- Testing createChallenge (Group creator) ---");
        const result = await concept.createChallenge({
          creator: group1,
          creatorType: "Group",
          level: 1,
          exercise: "Meditate",
          minutes: 15,
          frequency: 5,
          duration: 4,
        });
  
        assertExists((result as { challenge: ID }).challenge);
        const challengeId = (result as { challenge: ID }).challenge;
        console.log(`Action: createChallenge(${group1}, creatorType="Group", level=1, minutes=15, frequency=5, duration=4)`);
        console.log(`Output: Created group challenge with ID: ${challengeId}`);
  
        const challengeDoc = await concept.challenges.findOne({ _id: challengeId });
        assertExists(challengeDoc);
        assertEquals(challengeDoc.creator, group1);
        assertEquals(challengeDoc.creatorType, "Group");
        assertEquals(challengeDoc.minutes, 15);
        assertEquals(challengeDoc.frequency, 5);
        assertEquals(challengeDoc.duration, 4);
        console.log(`Effect: Group Challenge details confirmed. Creator: ${challengeDoc.creator}, Exercise: ${challengeDoc.exercise}.`);
  
        const parts = await concept.parts.find({ challenge: challengeId }).toArray();
        assertEquals(parts.length, 5 * 4);
        console.log(`Effect: Verified ${parts.length} associated parts created for group challenge.`);
    });

    st.test("should return an error for invalid level", async () => {
      console.log("\n--- Testing createChallenge with invalid level ---");
      // **requires**: level is an integer in {1,2,3}. Here, level=0 violates this.
      const result = await concept.createChallenge({
        creator: userA, creatorType: "User", level: 0, exercise: "Jump", frequency: 1, duration: 1,
      });
      assertObjectMatch(result, { error: "Level must be an integer between 1 and 3." });
      console.log(`Action: createChallenge(level=0)`);
      console.log(`Output: Received expected error: ${result.error}`);
    });

    st.test("should return an error for invalid reps", async () => {
      console.log("\n--- Testing createChallenge with invalid reps ---");
      // **requires**: reps is positive integer. Here, reps=-1 violates this.
      const result = await concept.createChallenge({
        creator: userA, creatorType: "User", level: 1, exercise: "Run", reps: -1, frequency: 1, duration: 1,
      });
      assertObjectMatch(result, { error: "Reps must be a positive integer if provided." });
      console.log(`Action: createChallenge(reps=-1)`);
      console.log(`Output: Received expected error: ${result.error}`);
    });

    st.test("should return an error for invalid frequency", async () => {
      console.log("\n--- Testing createChallenge with invalid frequency ---");
      // **requires**: frequency is positive integer. Here, frequency=0 violates this.
      const result = await concept.createChallenge({
        creator: userA, creatorType: "User", level: 1, exercise: "Stretch", frequency: 0, duration: 1,
      });
      assertObjectMatch(result, { error: "Frequency must be a positive integer." });
      console.log(`Action: createChallenge(frequency=0)`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  let createdChallengeId: Challenge;
  let createdGroupChallengeId: Challenge;
  let part1Id: Part;
  let part2Id: Part;
  let part3Id: Part;
  let part4Id: Part;

  await t.step("2. Setup for subsequent tests: create a challenge", async () => {
    console.log("\n--- Setup: Creating a challenge for subsequent tests ---");
    const result = await concept.createChallenge({
      creator: userA,
      creatorType: "User",
      level: 1,
      exercise: "Plank",
      minutes: 2,
      frequency: 2, // 2 days/week
      duration: 2, // 2 weeks
    });
    createdChallengeId = (result as { challenge: ID }).challenge;
    assertExists(createdChallengeId);
    console.log(`Setup: Challenge created with ID: ${createdChallengeId}`);

    const parts = await concept.parts.find({ challenge: createdChallengeId }).toArray();
    assertEquals(parts.length, 4); // 2 days/week * 2 weeks
    part1Id = parts.find(p => p.week === 1 && p.day === 1)!._id;
    part2Id = parts.find(p => p.week === 1 && p.day === 2)!._id;
    part3Id = parts.find(p => p.week === 2 && p.day === 1)!._id;
    part4Id = parts.find(p => p.week === 2 && p.day === 2)!._id;
    console.log(`Setup: Associated parts: ${part1Id}, ${part2Id}, ${part3Id}, ${part4Id}`);

    const groupResult = await concept.createChallenge({
        creator: group1,
        creatorType: "Group",
        level: 1,
        exercise: "Group stretch",
        minutes: 10,
        frequency: 1,
        duration: 1,
    });
    createdGroupChallengeId = (groupResult as { challenge: ID }).challenge;
    assertExists(createdGroupChallengeId);
    console.log(`Setup: Group challenge created with ID: ${createdGroupChallengeId}`);
  });

  await t.step("3. openChallenge action", async (st) => {
    st.test("should set 'open' to true for an existing challenge", async () => {
      console.log("\n--- Testing openChallenge ---");
      // **requires**: challenge exists in Challenges. Satisfied by `createdChallengeId`.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, false);
      console.log(`Precondition: Challenge initially closed.`);

      const result = await concept.openChallenge({ challenge: createdChallengeId });
      assertObjectMatch(result, {}); // Expect empty success object
      console.log(`Action: openChallenge(${createdChallengeId}).`);

      // **effect**: sets Open for challenge to True.
      challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, true);
      console.log(`Effect: Challenge is now open.`);
    });

    st.test("should do nothing if challenge is already open", async () => {
      console.log("\n--- Testing openChallenge (already open) ---");
      // **requires**: challenge exists in Challenges. Satisfied.
      const result = await concept.openChallenge({ challenge: createdChallengeId });
      assertObjectMatch(result, {});
      console.log(`Action: openChallenge(${createdChallengeId}) again.`);

      // **effect**: sets Open for challenge to True if it was False, otherwise does nothing.
      // Already true, so should remain true.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, true);
      console.log(`Effect: Challenge remains open (idempotent).`);
    });

    st.test("should return an error if challenge does not exist", async () => {
      console.log("\n--- Testing openChallenge (non-existent challenge) ---");
      // **requires**: challenge exists in Challenges. Not satisfied.
      const nonExistentId = "nonExistent" as ID;
      const result = await concept.openChallenge({ challenge: nonExistentId });
      assertObjectMatch(result, { error: "Challenge not found." });
      console.log(`Action: openChallenge(${nonExistentId}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("4. closeChallenge action", async (st) => {
    st.test("should set 'open' to false for an existing challenge", async () => {
      console.log("\n--- Testing closeChallenge ---");
      // Ensure it's open first for a valid close action.
      await concept.openChallenge({ challenge: createdChallengeId });
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, true);
      console.log(`Precondition: Challenge is open for closeChallenge test.`);

      const result = await concept.closeChallenge({ challenge: createdChallengeId });
      assertObjectMatch(result, {});
      console.log(`Action: closeChallenge(${createdChallengeId}).`);

      // **effect**: sets Open for challenge to False.
      challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, false);
      console.log(`Effect: Challenge is now closed.`);
    });

    st.test("should do nothing if challenge is already closed", async () => {
      console.log("\n--- Testing closeChallenge (already closed) ---");
      const result = await concept.closeChallenge({ challenge: createdChallengeId });
      assertObjectMatch(result, {});
      console.log(`Action: closeChallenge(${createdChallengeId}) again.`);

      // **effect**: sets Open for challenge to False if it was True, otherwise does nothing.
      // Already false, so should remain false.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.open, false);
      console.log(`Effect: Challenge remains closed (idempotent).`);
    });

    st.test("should return an error if challenge does not exist", async () => {
      console.log("\n--- Testing closeChallenge (non-existent challenge) ---");
      const nonExistentId = "nonExistent" as ID;
      const result = await concept.closeChallenge({ challenge: nonExistentId });
      assertObjectMatch(result, { error: "Challenge not found." });
      console.log(`Action: closeChallenge(${nonExistentId}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("5. inviteToChallenge action", async (st) => {
    st.test("should add users to challenge participants", async () => {
      console.log("\n--- Testing inviteToChallenge ---");
      // **requires**: challenge exists in Challenges. Satisfied.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.participants.length, 0);
      console.log(`Precondition: Initially no participants.`);

      const result = await concept.inviteToChallenge({ challenge: createdChallengeId, users: [userB, userC] });
      assertObjectMatch(result, {});
      console.log(`Action: inviteToChallenge(${createdChallengeId}, users=[${userB}, ${userC}]).`);

      // **effect**: adds every User in users to Users with Accepted and Completed set to False.
      challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.participants.length, 2);
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { user: userB, accepted: false, completed: false });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userC)!, { user: userC, accepted: false, completed: false });
      console.log(`Effect: Participants added: ${JSON.stringify(challengeDoc?.participants)}`);
      // Use query to confirm effect
      const isInvitedB = await concept._isInvited({ challenge: createdChallengeId, user: userB });
      assertEquals(isInvitedB[0].result, true);
      const isInvitedC = await concept._isInvited({ challenge: createdChallengeId, user: userC });
      assertEquals(isInvitedC[0].result, true);
    });

    st.test("should not add already invited users again", async () => {
      console.log("\n--- Testing inviteToChallenge (already invited) ---");
      const result = await concept.inviteToChallenge({ challenge: createdChallengeId, users: [userB, userA] }); // userB already invited, userA is new
      assertObjectMatch(result, {});
      console.log(`Action: inviteToChallenge(${createdChallengeId}, users=[${userB} (again), ${userA}]).`);

      const challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.participants.length, 3); // userA should be added, userB not duplicated
      const participants = challengeDoc?.participants.map(p => p.user);
      assertExists(participants?.includes(userA));
      assertExists(participants?.includes(userB));
      assertExists(participants?.includes(userC));
      console.log(`Effect: Participants after re-invite attempt: ${JSON.stringify(challengeDoc?.participants)}`);
    });

    st.test("should return an error if challenge does not exist", async () => {
      console.log("\n--- Testing inviteToChallenge (non-existent challenge) ---");
      const nonExistentId = "nonExistent" as ID;
      const result = await concept.inviteToChallenge({ challenge: nonExistentId, users: [userA] });
      assertObjectMatch(result, { error: "Challenge not found." });
      console.log(`Action: inviteToChallenge(${nonExistentId}, users=[${userA}]).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("6. acceptChallenge action", async (st) => {
    st.test("should set 'accepted' to true for an invited user", async () => {
      console.log("\n--- Testing acceptChallenge ---");
      // **requires**: challenge exists, user is in Users for challenge. Satisfied.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { accepted: false });
      console.log(`Precondition: ${userB} is initially not accepted.`);

      const result = await concept.acceptChallenge({ challenge: createdChallengeId, user: userB });
      assertObjectMatch(result, {});
      console.log(`Action: acceptChallenge(${createdChallengeId}, ${userB}).`);

      // **effect**: sets Accepted for user to True.
      challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { accepted: true });
      console.log(`Effect: ${userB} is now accepted.`);
      const isParticipantB = await concept._isParticipant({ challenge: createdChallengeId, user: userB });
      assertEquals(isParticipantB[0].result, true); // Confirm with query
    });

    st.test("should do nothing if user already accepted", async () => {
      console.log("\n--- Testing acceptChallenge (already accepted) ---");
      const result = await concept.acceptChallenge({ challenge: createdChallengeId, user: userB });
      assertObjectMatch(result, {});
      console.log(`Action: acceptChallenge(${createdChallengeId}, ${userB}) again.`);

      // **effect**: sets Accepted for user to True if Accepted was False, otherwise does nothing.
      // Already true, so should remain true.
      const challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { accepted: true });
      console.log(`Effect: ${userB} remains accepted (idempotent).`);
    });

    st.test("should return an error if user is not invited", async () => {
      console.log("\n--- Testing acceptChallenge (user not invited) ---");
      // **requires**: user is in Users for challenge. Not satisfied.
      const nonInvitedUser = "user:Dave" as ID;
      const result = await concept.acceptChallenge({ challenge: createdChallengeId, user: nonInvitedUser });
      assertObjectMatch(result, { error: "User is not invited to this challenge." });
      console.log(`Action: acceptChallenge(${createdChallengeId}, ${nonInvitedUser}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });

    st.test("should return an error if challenge does not exist", async () => {
      console.log("\n--- Testing acceptChallenge (non-existent challenge) ---");
      const nonExistentId = "nonExistent" as ID;
      const result = await concept.acceptChallenge({ challenge: nonExistentId, user: userA });
      assertObjectMatch(result, { error: "Challenge not found." });
      console.log(`Action: acceptChallenge(${nonExistentId}, ${userA}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("7. leaveChallenge action", async (st) => {
    st.test("should remove a user from participants and completers", async () => {
      console.log("\n--- Testing leaveChallenge ---");
      // Ensure userA is accepted and completed a part for this test scenario
      await concept.acceptChallenge({ challenge: createdChallengeId, user: userA });
      await concept.openChallenge({ challenge: createdChallengeId }); // Ensure open for completePart
      await concept.completePart({ part: part1Id, user: userA });
      
      // **requires**: challenge exists in Challenges, user is in Users for challenge. Satisfied.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertExists(challengeDoc?.participants.find(p => p.user === userA));
      let partDoc = await concept.parts.findOne({ _id: part1Id });
      assertExists(partDoc?.completers.includes(userA));
      console.log(`Precondition: ${userA} is participant and completed part1.`);

      const result = await concept.leaveChallenge({ challenge: createdChallengeId, user: userA });
      assertObjectMatch(result, {});
      console.log(`Action: leaveChallenge(${createdChallengeId}, ${userA}).`);

      // **effect**: deletes User from from Users and also from any Completers sets it was apart of.
      challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertEquals(challengeDoc?.participants.find(p => p.user === userA), undefined);
      partDoc = await concept.parts.findOne({ _id: part1Id });
      assertEquals(partDoc?.completers.includes(userA), false);
      console.log(`Effect: ${userA} removed from participants and completers.`);
    });

    st.test("should return an error if user is not a participant", async () => {
      console.log("\n--- Testing leaveChallenge (user not participant) ---");
      // **requires**: user is in Users for challenge. Not satisfied.
      const nonParticipantUser = "user:Dave" as ID;
      const result = await concept.leaveChallenge({ challenge: createdChallengeId, user: nonParticipantUser });
      assertObjectMatch(result, { error: "User is not a participant in this challenge." });
      console.log(`Action: leaveChallenge(${createdChallengeId}, ${nonParticipantUser}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("8. completePart action", async (st) => {
    st.test("should add user to completers for a part", async () => {
      console.log("\n--- Testing completePart ---");
      // Ensure challenge is open and userB is accepted for this test
      await concept.openChallenge({ challenge: createdChallengeId });
      await concept.acceptChallenge({ challenge: createdChallengeId, user: userB });

      // **requires**: challenge has Open set to True; user is in Users and has Accepted set to True. Satisfied.
      let partDoc = await concept.parts.findOne({ _id: part1Id });
      assertEquals(partDoc?.completers.includes(userB), false);
      console.log(`Precondition: ${userB} has not completed part1 yet.`);

      const result = await concept.completePart({ part: part1Id, user: userB });
      assertObjectMatch(result, {});
      console.log(`Action: completePart(${part1Id}, ${userB}).`);

      // **effect**: adds user to the Completers set for part.
      partDoc = await concept.parts.findOne({ _id: part1Id });
      assertEquals(partDoc?.completers.includes(userB), true);
      console.log(`Effect: Verified ${userB} in completers for part ${part1Id}.`);

      const challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { completed: false }); // Not all parts done yet
      console.log(`Effect: Challenge not yet marked completed for ${userB} (only one part done).`);
    });

    st.test("should mark challenge completed when all parts are done by user", async () => {
      console.log("\n--- Testing completePart (all parts done) ---");
      // Complete remaining parts for userB
      await concept.completePart({ part: part2Id, user: userB });
      await concept.completePart({ part: part3Id, user: userB });
      await concept.completePart({ part: part4Id, user: userB });
      console.log(`Actions: ${userB} completed all remaining parts.`);

      // **effect**: if all parts associated with Challenge have user in its Completers set, marks Completed as True for this user in challenge.
      let challengeDoc = await concept.challenges.findOne({ _id: createdChallengeId });
      assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { completed: true });
      console.log(`Effect: Verified challenge marked completed for ${userB}.`);
      const isCompletedChallenge = await concept._isCompletedChallenge({ challenge: createdChallengeId, user: userB });
      assertEquals(isCompletedChallenge[0].result, true); // Confirm with query
    });

    st.test("should return an error if part does not exist", async () => {
      console.log("\n--- Testing completePart (non-existent part) ---");
      // **requires**: part exists in Parts. Not satisfied.
      const nonExistentPartId = "nonExistentPart" as ID;
      const result = await concept.completePart({ part: nonExistentPartId, user: userB });
      assertObjectMatch(result, { error: "Part not found." });
      console.log(`Action: completePart(${nonExistentPartId}, ${userB}).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });

    st.test("should return an error if challenge is not open", async () => {
      console.log("\n--- Testing completePart (challenge not open) ---");
      await concept.closeChallenge({ challenge: createdChallengeId }); // Close the challenge
      // **requires**: challenge has Open set to True. Not satisfied.
      const result = await concept.completePart({ part: part1Id, user: userB });
      assertObjectMatch(result, { error: "Challenge is not open." });
      console.log(`Action: completePart(${part1Id}, ${userB}) when challenge closed.`);
      console.log(`Output: Received expected error: ${result.error}`);
      await concept.openChallenge({ challenge: createdChallengeId }); // Re-open for future tests
    });

    st.test("should return an error if user is not an accepted participant", async () => {
      console.log("\n--- Testing completePart (user not accepted participant) ---");
      await concept.inviteToChallenge({ challenge: createdChallengeId, users: [userC] }); // Invite C, but don't accept
      // **requires**: user is in Users and has Accepted set to True. Not satisfied for userC.
      const result = await concept.completePart({ part: part1Id, user: userC });
      assertObjectMatch(result, { error: "User is not an accepted participant in this challenge." });
      console.log(`Action: completePart(${part1Id}, ${userC}) when not accepted.`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  let verificationRequestId: VerificationRequest;

  await t.step("9. createVerificationRequest action", async (st) => {
    st.test("should create a new verification request", async () => {
      console.log("\n--- Testing createVerificationRequest ---");
      // Ensure challenge is open
      await concept.openChallenge({ challenge: createdChallengeId });
      console.log(`Precondition: Challenge ${createdChallengeId} is open.`);

      // **requires**: part exists, Challenge associated with part has Open set to True; Requester is distinct from Approver. All satisfied.
      const result = await concept.createVerificationRequest({
        part: part1Id,
        requester: userB,
        approver: userA,
        evidence: file1,
      });
      assertExists((result as { verificationRequest: ID }).verificationRequest);
      verificationRequestId = (result as { verificationRequest: ID }).verificationRequest;
      console.log(`Action: createVerificationRequest(${part1Id}, ${userB}, ${userA}, ${file1}).`);
      console.log(`Output: Created verification request with ID: ${verificationRequestId}`);

      // **effect**: creates a new VerificationRequest with given fields, Approved set to False.
      const vrDoc = await concept.verificationRequests.findOne({ _id: verificationRequestId });
      assertExists(vrDoc);
      assertEquals(vrDoc.requester, userB);
      assertEquals(vrDoc.approver, userA);
      assertEquals(vrDoc.part, part1Id);
      assertEquals(vrDoc.challenge, createdChallengeId);
      assertEquals(vrDoc.evidence, file1);
      assertEquals(vrDoc.approved, false); // Effect: Approved set to False
      console.log(`Effect: Verification request details confirmed. Requester: ${vrDoc.requester}, Approver: ${vrDoc.approver}, Approved: ${vrDoc.approved}`);
    });

    st.test("should return an error if part does not exist", async () => {
      console.log("\n--- Testing createVerificationRequest (non-existent part) ---");
      // **requires**: part exists in Parts. Not satisfied.
      const nonExistentPartId = "nonExistentPart" as ID;
      const result = await concept.createVerificationRequest({
        part: nonExistentPartId, requester: userB, approver: userA, evidence: file2,
      });
      assertObjectMatch(result, { error: "Part not found." });
      console.log(`Action: createVerificationRequest(${nonExistentPartId}, ...).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });

    st.test("should return an error if challenge is not open", async () => {
      console.log("\n--- Testing createVerificationRequest (challenge not open) ---");
      await concept.closeChallenge({ challenge: createdChallengeId }); // Close the challenge
      // **requires**: Challenge associated with part has Open set to True. Not satisfied.
      const result = await concept.createVerificationRequest({
        part: part1Id, requester: userB, approver: userA, evidence: file2,
      });
      assertObjectMatch(result, { error: "Challenge is not open." });
      console.log(`Action: createVerificationRequest(${part1Id}, ...) when challenge closed.`);
      console.log(`Output: Received expected error: ${result.error}`);
      await concept.openChallenge({ challenge: createdChallengeId }); // Re-open
    });

    st.test("should return an error if requester is same as approver", async () => {
      console.log("\n--- Testing createVerificationRequest (requester == approver) ---");
      // **requires**: Requester is distinct from Approver. Not satisfied.
      const result = await concept.createVerificationRequest({
        part: part1Id, requester: userA, approver: userA, evidence: file2,
      });
      assertObjectMatch(result, { error: "Requester must be distinct from Approver." });
      console.log(`Action: createVerificationRequest(${part1Id}, ${userA}, ${userA}, ...).`);
      console.log(`Output: Received expected error: ${result.error}`);
    });
  });

  await t.step("10. verify action", async (st) => {
    st.test("should set 'approved' to true for an existing verification request", async () => {
      console.log("\n--- Testing verify action ---");
      // **requires**: there is a VerificationRequest associated with part and requester; Challenge associated with part has Open set to True. Satisfied.
      let vrDoc = await concept.verificationRequests.findOne({ _id: verificationRequestId });
      assertEquals(vrDoc?.approved, false);
      console.log(`Precondition: Verification request initially not approved.`);

      const result = await concept.verify({ part: part1Id, requester: userB }); // Requester argument is to find the VR
      assertObjectMatch(result, {});
      console.log(`Action: verify(${part1Id}, ${userB}).`);

      // **effect**: sets Approved to True for the associated VerificationRequest.
      vrDoc = await concept.verificationRequests.findOne({ _id: verificationRequestId });
      assertEquals(vrDoc?.approved, true);
      console.log(`Effect: Verification request is now approved.`);
    });

    st.test("should return an error if verification request does not exist or is already approved", async () => {
      console.log("\n--- Testing verify action (non-existent or already approved) ---");
      // **requires**: there is a VerificationRequest associated with part and requester. Not satisfied (already approved).
      const result = await concept.verify({ part: part1Id, requester: userB });
      assertObjectMatch(result, { error: "Pending verification request not found for this part and requester." });
      console.log(`Action: verify(${part1Id}, ${userB}) (already approved).`);
      console.log(`Output: Received expected error: ${result.error}`);

      const nonExistentPart = "nonExistentPart" as ID;
      const result2 = await concept.verify({ part: nonExistentPart, requester: userB });
      assertObjectMatch(result2, { error: "Pending verification request not found for this part and requester." });
      console.log(`Action: verify(${nonExistentPart}, ${userB}) (non-existent).`);
      console.log(`Output: Received expected error: ${result2.error}`);
    });

    st.test("should return an error if challenge is not open", async () => {
      console.log("\n--- Testing verify action (challenge not open) ---");
      // Create a new VR for this test
      const newVrResult = await concept.createVerificationRequest({
        part: part2Id, requester: userC, approver: userA, evidence: file1,
      });
      const newVrId = (newVrResult as { verificationRequest: ID }).verificationRequest;
      console.log(`Precondition: Created new VR ${newVrId} for testing closed challenge.`);

      await concept.closeChallenge({ challenge: createdChallengeId }); // Close the challenge
      // **requires**: Challenge associated with part has Open set to True. Not satisfied.
      const result = await concept.verify({ part: part2Id, requester: userC });
      assertObjectMatch(result, { error: "Challenge is not open." });
      console.log(`Action: verify(${part2Id}, ${userC}) when challenge closed.`);
      console.log(`Output: Received expected error: ${result.error}`);
      await concept.openChallenge({ challenge: createdChallengeId }); // Re-open
    });
  });

  await t.step("11. Query tests", async (st) => {
    st.test("_isUserCreator should return true if user is creator", async () => {
      console.log("\n--- Query: _isUserCreator ---");
      // **requires**: challenge exists. Satisfied.
      const result = await concept._isUserCreator({ challenge: createdChallengeId, user: userA });
      assertEquals(result[0].result, true); // Effect: returns whether or not user is Creator for Challenge
      const resultFalse = await concept._isUserCreator({ challenge: createdChallengeId, user: userB });
      assertEquals(resultFalse[0].result, false);
      console.log(`_isUserCreator(${userA}): true. _isUserCreator(${userB}): false.`);
    });

    st.test("_isGroupCreator should return true if group is creator", async () => {
        console.log("\n--- Query: _isGroupCreator ---");
        const result = await concept._isGroupCreator({ challenge: createdGroupChallengeId, group: group1 });
        assertEquals(result[0].result, true); // Effect: returns whether or not group is Creator for Challenge
        const resultFalse = await concept._isGroupCreator({ challenge: createdGroupChallengeId, group: "group:Other" as ID });
        assertEquals(resultFalse[0].result, false);
        console.log(`_isGroupCreator(${group1}): true. _isGroupCreator(other): false.`);
    });

    st.test("_isParticipant should return true if user accepted challenge", async () => {
      console.log("\n--- Query: _isParticipant ---");
      const resultB = await concept._isParticipant({ challenge: createdChallengeId, user: userB });
      assertEquals(resultB[0].result, true); // UserB accepted
      const resultC = await concept._isParticipant({ challenge: createdChallengeId, user: userC });
      assertEquals(resultC[0].result, false); // UserC invited but not accepted
      console.log(`_isParticipant(${userB}): true. _isParticipant(${userC}): false.`);
    });

    st.test("_isInvited should return true if user is invited", async () => {
      console.log("\n--- Query: _isInvited ---");
      const resultB = await concept._isInvited({ challenge: createdChallengeId, user: userB });
      assertEquals(resultB[0].result, true); // UserB is invited
      const resultC = await concept._isInvited({ challenge: createdChallengeId, user: userC });
      assertEquals(resultC[0].result, true); // UserC is invited (even if not accepted)
      const resultD = await concept._isInvited({ challenge: createdChallengeId, user: "user:Dave" as ID });
      assertEquals(resultD[0].result, false); // UserD not invited
      console.log(`_isInvited(${userB}): true. _isInvited(${userC}): true. _isInvited(Dave): false.`);
    });

    st.test("_isOpen should return true if challenge is open", async () => {
      console.log("\n--- Query: _isOpen ---");
      await concept.openChallenge({ challenge: createdChallengeId });
      const result = await concept._isOpen({ challenge: createdChallengeId });
      assertEquals(result[0].result, true);
      await concept.closeChallenge({ challenge: createdChallengeId });
      const resultClosed = await concept._isOpen({ challenge: createdChallengeId });
      assertEquals(resultClosed[0].result, false);
      console.log(`_isOpen (after open): true. _isOpen (after close): false.`);
    });

    st.test("_isCompletedPart should return true if user completed part", async () => {
      console.log("\n--- Query: _isCompletedPart ---");
      const result = await concept._isCompletedPart({ part: part1Id, user: userB });
      assertEquals(result[0].result, true); // UserB completed part1
      const resultFalse = await concept._isCompletedPart({ part: part1Id, user: userC });
      assertEquals(resultFalse[0].result, false); // UserC did not complete part1
      console.log(`_isCompletedPart(${part1Id}, ${userB}): true. _isCompletedPart(${part1Id}, ${userC}): false.`);
    });

    st.test("_isCompletedChallenge should return true if user completed all parts", async () => {
      console.log("\n--- Query: _isCompletedChallenge ---");
      const resultB = await concept._isCompletedChallenge({ challenge: createdChallengeId, user: userB });
      assertEquals(resultB[0].result, true); // UserB completed all parts
      const resultC = await concept._isCompletedChallenge({ challenge: createdChallengeId, user: userC });
      assertEquals(resultC[0].result, false); // UserC did not complete challenge
      console.log(`_isCompletedChallenge(${createdChallengeId}, ${userB}): true. _isCompletedChallenge(${createdChallengeId}, ${userC}): false.`);
    });

    st.test("_getParticipants should return only accepted participants", async () => {
      console.log("\n--- Query: _getParticipants ---");
      const participants = await concept._getParticipants({ challenge: createdChallengeId });
      assertEquals(participants.length, 1);
      assertEquals(participants[0].user, userB); // UserB is accepted, UserC is not
      console.log(`_getParticipants: ${JSON.stringify(participants)}`);
    });

    st.test("_getInvitees should return all invited users", async () => {
      console.log("\n--- Query: _getInvitees ---");
      const invitees = await concept._getInvitees({ challenge: createdChallengeId });
      assertEquals(invitees.length, 2); // userB and userC
      assertExists(invitees.find(p => p.user === userB));
      assertExists(invitees.find(p => p.user === userC));
      console.log(`_getInvitees: ${JSON.stringify(invitees)}`);
    });

    st.test("_getCompleters should return only users who completed the challenge", async () => {
      console.log("\n--- Query: _getCompleters ---");
      const completers = await concept._getCompleters({ challenge: createdChallengeId });
      assertEquals(completers.length, 1);
      assertEquals(completers[0].user, userB);
      console.log(`_getCompleters: ${JSON.stringify(completers)}`);
    });

    st.test("_getChallengeDetails should return correct challenge data", async () => {
      console.log("\n--- Query: _getChallengeDetails ---");
      const details = await concept._getChallengeDetails({ challenge: createdChallengeId });
      assertEquals(details.length, 1);
      assertObjectMatch(details[0], { exercise: "Plank", level: 1, minutes: 2 });
      console.log(`_getChallengeDetails: ${JSON.stringify(details)}`);
    });

    st.test("_getCreator should return the creator of the challenge", async () => {
      console.log("\n--- Query: _getCreator ---");
      const creator = await concept._getCreator({ challenge: createdChallengeId });
      assertEquals(creator.length, 1);
      assertObjectMatch(creator[0], { creator: userA, creatorType: "User" });
      console.log(`_getCreator: ${JSON.stringify(creator)}`);
    });

    st.test("_getPartPoints should return points for the associated challenge part", async () => {
      console.log("\n--- Query: _getPartPoints ---");
      const points = await concept._getPartPoints({ part: part1Id });
      assertEquals(points.length, 1);
      assertExists(points[0].points);
      console.log(`_getPartPoints for ${part1Id}: ${JSON.stringify(points)}`);
    });

    st.test("_getChallengePoints should return bonus points for the challenge", async () => {
      console.log("\n--- Query: _getChallengePoints ---");
      const bonusPoints = await concept._getChallengePoints({ challenge: createdChallengeId });
      assertEquals(bonusPoints.length, 1);
      assertExists(bonusPoints[0].bonusPoints);
      console.log(`_getChallengePoints for ${createdChallengeId}: ${JSON.stringify(bonusPoints)}`);
    });

    st.test("_getChallenges should return challenges accepted by user", async () => {
      console.log("\n--- Query: _getChallenges ---");
      const challengesB = await concept._getChallenges({ user: userB });
      assertEquals(challengesB.length, 1);
      assertEquals(challengesB[0].challenge, createdChallengeId);
      console.log(`_getChallenges for ${userB}: ${JSON.stringify(challengesB)}`);

      const challengesC = await concept._getChallenges({ user: userC });
      assertEquals(challengesC.length, 0); // UserC invited but not accepted
      console.log(`_getChallenges for ${userC}: ${JSON.stringify(challengesC)}`);
    });

    st.test("_getAssociatedChallenge should return challenge for a part", async () => {
      console.log("\n--- Query: _getAssociatedChallenge ---");
      const result = await concept._getAssociatedChallenge({ part: part1Id });
      assertEquals(result.length, 1);
      assertEquals(result[0].challenge, createdChallengeId);
      console.log(`_getAssociatedChallenge for ${part1Id}: ${JSON.stringify(result)}`);
    });
  });

  await t.step("12. Principle Trace: users issue challenges, complete them", async (st) => {
    console.log("\n--- Principle Trace: Users issue challenges to each other, which have associated points; users can then complete those challenges ---");
    // This trace demonstrates the core principle: challenge creation, invitation, acceptance, part completion, and final challenge completion.

    // 1. User A creates a challenge.
    const freshChallengeResult = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 2, exercise: "Running",
      minutes: 30, frequency: 3, duration: 1, // 3 parts for 1 week
    });
    const traceChallengeId = (freshChallengeResult as { challenge: ID }).challenge;
    assertExists(traceChallengeId);
    console.log(`1. Action: ${userA} created challenge ${traceChallengeId}.`);

    const parts = await concept.parts.find({ challenge: traceChallengeId }).toArray();
    assertEquals(parts.length, 3);
    const tracePart1 = parts[0]._id;
    const tracePart2 = parts[1]._id;
    const tracePart3 = parts[2]._id;
    console.log(`   Challenge parts: ${tracePart1}, ${tracePart2}, ${tracePart3}.`);

    let challengeDoc = await concept.challenges.findOne({ _id: traceChallengeId });
    assertEquals(challengeDoc?.open, false);
    console.log(`   Initial state: Challenge is closed.`);

    // 2. User A opens the challenge.
    await concept.openChallenge({ challenge: traceChallengeId });
    challengeDoc = await concept.challenges.findOne({ _id: traceChallengeId });
    assertEquals(challengeDoc?.open, true);
    console.log(`2. Action: ${userA} opened the challenge. State: Challenge ${traceChallengeId} is now open.`);

    // 3. User A invites User B and User C.
    await concept.inviteToChallenge({ challenge: traceChallengeId, users: [userB, userC] });
    challengeDoc = await concept.challenges.findOne({ _id: traceChallengeId });
    assertEquals(challengeDoc?.participants.length, 2);
    assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { accepted: false });
    assertObjectMatch(challengeDoc!.participants.find(p => p.user === userC)!, { accepted: false });
    console.log(`3. Action: ${userA} invited ${userB} and ${userC}. State: Both initially not accepted.`);

    // User C tries to complete parts without accepting -> should fail (demonstrates precondition)
    console.log(`   Attempting for ${userC} to complete a part without accepting (expected failure)...`);
    const cCompleteResult = await concept.completePart({ part: tracePart1, user: userC });
    assertObjectMatch(cCompleteResult, { error: "User is not an accepted participant in this challenge." });
    console.log(`   Result: ${userC} failed to complete part without accepting. (Expected)`);
    let part1Doc = await concept.parts.findOne({ _id: tracePart1 });
    assertEquals(part1Doc?.completers.includes(userC), false);

    // 4. User B accepts the challenge.
    await concept.acceptChallenge({ challenge: traceChallengeId, user: userB });
    challengeDoc = await concept.challenges.findOne({ _id: traceChallengeId });
    assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { accepted: true });
    console.log(`4. Action: ${userB} accepted the challenge. State: ${userB} is now an accepted participant.`);
    const isParticipantB = await concept._isParticipant({ challenge: traceChallengeId, user: userB });
    assertEquals(isParticipantB[0].result, true);

    // 5. User B completes a few parts of the challenge.
    await concept.completePart({ part: tracePart1, user: userB });
    part1Doc = await concept.parts.findOne({ _id: tracePart1 });
    assertEquals(part1Doc?.completers.includes(userB), true);
    console.log(`5. Action: ${userB} completed part ${tracePart1}.`);

    await concept.completePart({ part: tracePart2, user: userB });
    let part2Doc = await concept.parts.findOne({ _id: tracePart2 });
    assertEquals(part2Doc?.completers.includes(userB), true);
    console.log(`   Action: ${userB} completed part ${tracePart2}.`);

    // 6. Check that userB is in `completers` for those parts.
    // 7. Check userB's overall completion status (still false if not all parts done).
    const isCompletedPart1B = await concept._isCompletedPart({ part: tracePart1, user: userB });
    assertEquals(isCompletedPart1B[0].result, true);
    const isCompletedChallengeB_partial = await concept._isCompletedChallenge({ challenge: traceChallengeId, user: userB });
    assertEquals(isCompletedChallengeB_partial[0].result, false);
    console.log(`   Verification: ${userB} completed parts, but challenge not fully completed yet (Expected).`);

    // 8. User B completes all remaining parts.
    await concept.completePart({ part: tracePart3, user: userB });
    let part3Doc = await concept.parts.findOne({ _id: tracePart3 });
    assertEquals(part3Doc?.completers.includes(userB), true);
    console.log(`6. Action: ${userB} completed part ${tracePart3}. All parts now completed by ${userB}.`);

    // 9. Check that userB's overall completion status becomes `true`.
    const isCompletedChallengeB_full = await concept._isCompletedChallenge({ challenge: traceChallengeId, user: userB });
    assertEquals(isCompletedChallengeB_full[0].result, true);
    challengeDoc = await concept.challenges.findOne({ _id: traceChallengeId });
    assertObjectMatch(challengeDoc!.participants.find(p => p.user === userB)!, { completed: true });
    console.log(`7. Verification: Challenge marked completed for ${userB} (Expected).`);

    // 10. User B creates a verification request for a part, with User A as approver.
    const vrCreationResult = await concept.createVerificationRequest({
      part: tracePart1, requester: userB, approver: userA, evidence: file1,
    });
    const traceVrId = (vrCreationResult as { verificationRequest: ID }).verificationRequest;
    assertExists(traceVrId);
    console.log(`8. Action: ${userB} created verification request ${traceVrId} for part ${tracePart1}, approver ${userA}.`);

    let vrDoc = await concept.verificationRequests.findOne({ _id: traceVrId });
    assertEquals(vrDoc?.approved, false);
    console.log(`   Initial state: Verification request is not approved.`);

    // 11. User A verifies the request.
    await concept.verify({ part: tracePart1, requester: userB });
    console.log(`9. Action: ${userA} verified request for part ${tracePart1}, requester ${userB}.`);

    // 12. Check that the verification request is approved.
    vrDoc = await concept.verificationRequests.findOne({ _id: traceVrId });
    assertEquals(vrDoc?.approved, true);
    console.log(`10. Verification: Verification request ${traceVrId} is now approved (Expected).`);
  });

  await client.close();
});
```
