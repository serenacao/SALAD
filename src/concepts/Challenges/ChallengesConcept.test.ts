import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ChallengesConcept from "@concepts/Challenges/ChallengesConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("Challenges Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengesConcept(db);

  // Helper IDs for testing
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const groupX = "group:X-Fitness" as ID;
  const testFileId = "file:evidence123" as ID;

  // --- Action: createChallenge ---
  await t.step("[Action: createChallenge] - Valid challenge creation by user", async () => {
    console.log(`\n--- Test: createChallenge (valid user) ---`);
    const result = await concept.createChallenge({
      creator: userA,
      creatorType: "User",
      level: 1,
      exercise: "Pushups",
      reps: 10,
      sets: 3,
      frequency: 3,
      duration: 2,
    });

    console.log(`Action result: ${JSON.stringify(result)}`);
    assertNotEquals((result as { error?: string }).error, "Level must be an integer between 1 and 3.", "Should not return an error for valid level.");
    assertExists((result as { challenge: ID }).challenge, "Should return a challenge ID.");
    const challengeId = (result as { challenge: ID }).challenge;
    console.log(`Created challenge with ID: ${challengeId}`);

    // Verify effects: Challenge exists and initial state
    const challengeDetails = await concept._getChallengeDetails({ challenge: challengeId });
    assertEquals(challengeDetails.length, 1, "Challenge details should be retrievable.");
    assertEquals(challengeDetails[0].exercise, "Pushups", "Exercise should match.");
    assertEquals(challengeDetails[0].level, 1, "Level should match.");

    const isOpen = await concept._isOpen({ challenge: challengeId });
    assertEquals(isOpen[0].result, false, "Challenge should initially be closed (open: false).");

    const creator = await concept._getCreator({ challenge: challengeId });
    assertEquals(creator[0].creator, userA, "Creator should be User A.");
    assertEquals(creator[0].creatorType, "User", "Creator type should be User.");

    // Verify parts were created
    const partsCount = await db.collection("Challenges.parts").countDocuments({ challenge: challengeId });
    assertEquals(partsCount, 3 * 2, "Should create 3*2 = 6 parts."); // frequency * duration = 3 * 2

    console.log(`Confirmed challenge properties, initial state, and part creation.`);
  });

  await t.step("[Action: createChallenge] - Valid challenge creation by group with optional fields", async () => {
    console.log(`\n--- Test: createChallenge (valid group with optional fields) ---`);
    const result = await concept.createChallenge({
      creator: groupX,
      creatorType: "Group",
      level: 3,
      exercise: "Running",
      minutes: 30,
      frequency: 5,
      duration: 4,
    });
    console.log(`Action result: ${JSON.stringify(result)}`);
    assertNotEquals((result as { error?: string }).error, "Should not return an error for valid parameters.");
    assertExists((result as { challenge: ID }).challenge, "Should return a challenge ID.");
    const challengeId = (result as { challenge: ID }).challenge;
    console.log(`Created challenge with ID: ${challengeId}`);

    const creator = await concept._getCreator({ challenge: challengeId });
    assertEquals(creator[0].creator, groupX, "Creator should be Group X.");
    assertEquals(creator[0].creatorType, "Group", "Creator type should be Group.");

    const details = await concept._getChallengeDetails({ challenge: challengeId });
    assertEquals(details[0].minutes, 30, "Minutes should be set.");
    assertEquals(details[0].weight, null, "Weight should not be set if 0 (not positive).");

    const partsCount = await db.collection("Challenges.parts").countDocuments({ challenge: challengeId });
    assertEquals(partsCount, 5 * 4, "Should create 5*4 = 20 parts.");
    console.log(`Confirmed challenge properties and part creation for group challenge.`);
  });

  await t.step("[Action: createChallenge] - Invalid parameters (requires check)", async () => {
    console.log(`\n--- Test: createChallenge (invalid parameters) ---`);
    const invalidLevel = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 4, exercise: "Invalid", frequency: 1, duration: 1,
    });
    assertEquals(invalidLevel, { error: "Level must be an integer between 1 and 3." }, "Should reject invalid level.");
    console.log(`Rejected invalid level: ${JSON.stringify(invalidLevel)}`);

    const invalidReps = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 1, exercise: "Invalid", reps: -5, frequency: 1, duration: 1,
    });
    assertEquals(invalidReps, { error: "Reps must be a positive integer if provided." }, "Should reject invalid reps.");
    console.log(`Rejected invalid reps: ${JSON.stringify(invalidReps)}`);

    const invalidWeight = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 1, exercise: "Invalid", weight: -10, frequency: 1, duration: 1,
    });
    assertEquals(invalidWeight, { error: "Weight must be a positive number if provided." }, "Should reject invalid weight.");
    console.log(`Rejected invalid weight: ${JSON.stringify(invalidWeight)}`);

    console.log(`Confirmed 'createChallenge' enforces its 'requires' conditions.`);
  });

  // Re-create a challenge for further tests
  const createRes = await concept.createChallenge({
    creator: userA, creatorType: "User", level: 2, exercise: "Squats", reps: 10, sets: 3, frequency: 2, duration: 1,
  });
  const challenge1Id = (createRes as { challenge: ID }).challenge;

  // --- Action: openChallenge ---
  await t.step("[Action: openChallenge] - Open an existing challenge", async () => {
    console.log(`\n--- Test: openChallenge ---`);
    let isOpen = await concept._isOpen({ challenge: challenge1Id });
    assertEquals(isOpen[0].result, false, "Challenge should initially be closed.");

    const result = await concept.openChallenge({ challenge: challenge1Id });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    isOpen = await concept._isOpen({ challenge: challenge1Id });
    assertEquals(isOpen[0].result, true, "Challenge should now be open.");
    console.log(`Confirmed 'openChallenge' changes the 'open' status.`);
  });

  await t.step("[Action: openChallenge] - Try to open a non-existent challenge (requires check)", async () => {
    console.log(`\n--- Test: openChallenge (non-existent) ---`);
    const nonExistentId = freshID();
    const result = await concept.openChallenge({ challenge: nonExistentId });
    assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge.");
    console.log(`Rejected opening non-existent challenge: ${JSON.stringify(result)}`);
  });

  // --- Action: closeChallenge ---
  await t.step("[Action: closeChallenge] - Close an existing challenge", async () => {
    console.log(`\n--- Test: closeChallenge ---`);
    let isOpen = await concept._isOpen({ challenge: challenge1Id });
    assertEquals(isOpen[0].result, true, "Challenge should currently be open.");

    const result = await concept.closeChallenge({ challenge: challenge1Id });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    isOpen = await concept._isOpen({ challenge: challenge1Id });
    assertEquals(isOpen[0].result, false, "Challenge should now be closed.");
    console.log(`Confirmed 'closeChallenge' changes the 'open' status.`);
  });

  await t.step("[Action: closeChallenge] - Try to close a non-existent challenge (requires check)", async () => {
    console.log(`\n--- Test: closeChallenge (non-existent) ---`);
    const nonExistentId = freshID();
    const result = await concept.closeChallenge({ challenge: nonExistentId });
    assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge.");
    console.log(`Rejected closing non-existent challenge: ${JSON.stringify(result)}`);
  });

  // Ensure challenge1Id is open for next steps
  await concept.openChallenge({ challenge: challenge1Id });

  // --- Action: inviteToChallenge ---
  await t.step("[Action: inviteToChallenge] - Invite users to a challenge", async () => {
    console.log(`\n--- Test: inviteToChallenge ---`);
    const result = await concept.inviteToChallenge({ challenge: challenge1Id, users: [userB, userC] });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    const invitees = await concept._getInvitees({ challenge: challenge1Id });
    assertEquals(invitees.map(i => i.user).sort(), [userB, userC].sort(), "Both users should be invited.");

    const isParticipantB = await concept._isParticipant({ challenge: challenge1Id, user: userB });
    assertEquals(isParticipantB[0].result, false, "User B should be invited but not yet accepted/participant.");
    console.log(`Confirmed users are added to invitees with accepted: false.`);
  });

  await t.step("[Action: inviteToChallenge] - Invite same users again (no duplicate entries)", async () => {
    console.log(`\n--- Test: inviteToChallenge (duplicates) ---`);
    const result = await concept.inviteToChallenge({ challenge: challenge1Id, users: [userB] });
    assertEquals(result, {}, "Should return empty object.");

    const invitees = await concept._getInvitees({ challenge: challenge1Id });
    assertEquals(invitees.map(i => i.user).sort(), [userB, userC].sort(), "Should not add duplicate invitees.");
    console.log(`Confirmed inviting same user again does not create duplicates.`);
  });

  await t.step("[Action: inviteToChallenge] - Invite to non-existent challenge (requires check)", async () => {
    console.log(`\n--- Test: inviteToChallenge (non-existent) ---`);
    const nonExistentId = freshID();
    const result = await concept.inviteToChallenge({ challenge: nonExistentId, users: [userA] });
    assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge.");
    console.log(`Rejected inviting to non-existent challenge: ${JSON.stringify(result)}`);
  });

  // --- Action: acceptChallenge ---
  await t.step("[Action: acceptChallenge] - User accepts challenge", async () => {
    console.log(`\n--- Test: acceptChallenge ---`);
    const result = await concept.acceptChallenge({ challenge: challenge1Id, user: userB });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    const isParticipantB = await concept._isParticipant({ challenge: challenge1Id, user: userB });
    assertEquals(isParticipantB[0].result, true, "User B should now be an accepted participant.");

    const isParticipantC = await concept._isParticipant({ challenge: challenge1Id, user: userC });
    assertEquals(isParticipantC[0].result, false, "User C should still not be an accepted participant.");
    console.log(`Confirmed user B accepted the challenge.`);
  });

  await t.step("[Action: acceptChallenge] - User not invited to challenge (requires check)", async () => {
    console.log(`\n--- Test: acceptChallenge (user not invited) ---`);
    const nonInvitedUser = "user:David" as ID;
    const result = await concept.acceptChallenge({ challenge: challenge1Id, user: nonInvitedUser });
    assertEquals(result, { error: "User is not invited to this challenge." }, "Should reject non-invited user.");
    console.log(`Rejected accepting by non-invited user: ${JSON.stringify(result)}`);
  });

  // --- Action: leaveChallenge ---
  await t.step("[Action: leaveChallenge] - User leaves challenge", async () => {
    console.log(`\n--- Test: leaveChallenge ---`);
    const result = await concept.leaveChallenge({ challenge: challenge1Id, user: userC });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    const invitees = await concept._getInvitees({ challenge: challenge1Id });
    assertEquals(invitees.map(i => i.user), [userB], "User C should be removed from invitees.");

    // userB remains as participant
    const isParticipantB = await concept._isParticipant({ challenge: challenge1Id, user: userB });
    assertEquals(isParticipantB[0].result, true, "User B should still be an accepted participant.");
    console.log(`Confirmed user C left the challenge.`);
  });

  await t.step("[Action: leaveChallenge] - User not participating (requires check)", async () => {
    console.log(`\n--- Test: leaveChallenge (user not participating) ---`);
    const nonParticipantUser = "user:Eve" as ID;
    const result = await concept.leaveChallenge({ challenge: challenge1Id, user: nonParticipantUser });
    assertEquals(result, { error: "User is not a participant in this challenge." }, "Should reject non-participating user.");
    console.log(`Rejected leaving by non-participating user: ${JSON.stringify(result)}`);
  });

  // --- Action: completePart ---
  await t.step("[Action: completePart] - User completes a part", async () => {
    console.log(`\n--- Test: completePart ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const dummy = allParts[0]._id;
    const firstPartId: ID = dummy.toString() as ID;

    const result = await concept.completePart({ part: firstPartId, user: userB });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    const isCompletedPart = await concept._isCompletedPart({ part: firstPartId, user: userB });
    assertEquals(isCompletedPart[0].result, true, "User B should have completed the first part.");

    const isCompletedChallenge = await concept._isCompletedChallenge({ challenge: challenge1Id, user: userB });
    assertEquals(isCompletedChallenge[0].result, false, "User B should not have completed the whole challenge yet.");
    console.log(`Confirmed user B completed a single part.`);
  });

  await t.step("[Action: completePart] - User completes all parts, challenge completed", async () => {
    console.log(`\n--- Test: completePart (all parts completed) ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();

    // Complete all remaining parts
    for (let i = 1; i < allParts.length; i++) {
      console.log(`Completing part ${allParts[i]._id} for user B.`);
      await concept.completePart({ part: allParts[i]._id.toString() as ID, user: userB });
    }

    // Verify all parts are completed
    for (const part of allParts) {
      const isCompleted = await concept._isCompletedPart({ part: part._id.toString() as ID, user: userB });
      assertEquals(isCompleted[0].result, true, `User B should have completed part ${part._id}.`);
    }

    const isCompletedChallenge = await concept._isCompletedChallenge({ challenge: challenge1Id, user: userB });
    assertEquals(isCompletedChallenge[0].result, true, "User B should have completed the entire challenge.");
    console.log(`Confirmed user B completed all parts and the entire challenge.`);
  });

  await t.step("[Action: completePart] - Challenge not open (requires check)", async () => {
    console.log(`\n--- Test: completePart (challenge not open) ---`);
    await concept.closeChallenge({ challenge: challenge1Id });
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const firstPartId = allParts[0]._id; // Use an existing part

    const result = await concept.completePart({ part: firstPartId.toString() as ID, user: userB });
    assertEquals(result, { error: "Challenge is not open." }, "Should reject completion if challenge is closed.");
    console.log(`Rejected completing part in a closed challenge: ${JSON.stringify(result)}`);

    await concept.openChallenge({ challenge: challenge1Id }); // Re-open for future tests
  });

  await t.step("[Action: completePart] - User not accepted participant (requires check)", async () => {
    console.log(`\n--- Test: completePart (user not accepted) ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const firstPartId = allParts[0]._id; // Use an existing part

    // User C was invited but left, not accepted
    const result = await concept.completePart({ part: firstPartId.toString() as ID, user: userC });
    assertEquals(result, { error: "User is not an accepted participant in this challenge." }, "Should reject non-accepted participant.");
    console.log(`Rejected completing part by non-accepted participant: ${JSON.stringify(result)}`);
  });

  // --- Action: createVerificationRequest ---
  await t.step("[Action: createVerificationRequest] - Create a valid verification request", async () => {
    console.log(`\n--- Test: createVerificationRequest ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const partToVerifyId = allParts[0]._id;

    const result = await concept.createVerificationRequest({
      part: partToVerifyId.toString() as ID,
      requester: userB,
      approver: userA,
      evidence: testFileId,
    });
    console.log(`Action result: ${JSON.stringify(result)}`);
    assertExists((result as { verificationRequest: ID }).verificationRequest, "Should return a verification request ID.");
    const vrId = (result as { verificationRequest: ID }).verificationRequest;
    console.log(`Created verification request with ID: ${vrId}`);

    const vrDoc = await db.collection("Challenges.verificationRequests").findOne({ _id: vrId });
    assertExists(vrDoc, "Verification request document should exist.");
    assertEquals(vrDoc?.requester, userB, "Requester should be User B.");
    assertEquals(vrDoc?.approver, userA, "Approver should be User A.");
    assertEquals(vrDoc?.approved, false, "Request should initially be unapproved.");
    console.log(`Confirmed verification request creation.`);
  });

  await t.step("[Action: createVerificationRequest] - Requester is same as approver (requires check)", async () => {
    console.log(`\n--- Test: createVerificationRequest (requester = approver) ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const partToVerifyId = allParts[0]._id;

    const result = await concept.createVerificationRequest({
      part: partToVerifyId.toString() as ID,
      requester: userA,
      approver: userA,
      evidence: testFileId,
    });
    assertEquals(result, { error: "Requester must be distinct from Approver." }, "Should reject requester == approver.");
    console.log(`Rejected verification request where requester equals approver: ${JSON.stringify(result)}`);
  });

  // --- Action: verify ---
  await t.step("[Action: verify] - Approve a verification request", async () => {
    console.log(`\n--- Test: verify ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const partToVerifyId = allParts[0]._id; // The part for which VR was created by userB for userA

    // Assume userA is the one triggering this action implicitly or explicitly.
    // The spec's `verify(part: Part, requester: User)` implies `requester` is the original requester.
    // We confirm this logic.
    const result = await concept.verify({ part: partToVerifyId.toString() as ID, requester: userB });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    const vrDoc = await db.collection("Challenges.verificationRequests").findOne({
      part: partToVerifyId,
      requester: userB,
    });
    assertExists(vrDoc, "Verification request document should still exist.");
    assertEquals(vrDoc?.approved, true, "Request should now be approved.");
    console.log(`Confirmed verification request was approved.`);
  });

  await t.step("[Action: verify] - Try to verify non-existent or already approved request (requires check)", async () => {
    console.log(`\n--- Test: verify (non-existent/approved) ---`);
    const allParts = await db.collection("Challenges.parts").find({ challenge: challenge1Id }).toArray();
    const partToVerifyId = allParts[0]._id;

    // Already approved request
    const alreadyApprovedResult = await concept.verify({ part: partToVerifyId.toString() as ID, requester: userB });
    assertEquals(alreadyApprovedResult, { error: "Pending verification request not found for this part and requester." }, "Should reject verifying an already approved request.");
    console.log(`Rejected verifying already approved request: ${JSON.stringify(alreadyApprovedResult)}`);

    // Non-existent request
    const nonExistentResult = await concept.verify({ part: partToVerifyId.toString() as ID, requester: "user:NonExistent" as ID });
    assertEquals(nonExistentResult, { error: "Pending verification request not found for this part and requester." }, "Should reject verifying non-existent request.");
    console.log(`Rejected verifying non-existent request: ${JSON.stringify(nonExistentResult)}`);
  });

  // --- Principle Test: User A issues challenge to User B, User B completes it, User A approves ---
  await t.step("[Principle Trace] - Users issue and complete challenges", async () => {
    console.log(`\n--- Principle Trace: Users issue and complete challenges ---`);

    // 1. User A creates a challenge.
    const challengeRes = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 1, exercise: "Jump Ropes",
      frequency: 1, duration: 1, // Simple 1-part challenge for principle
    });
    const principleChallengeId = (challengeRes as { challenge: ID }).challenge;
    console.log(`1. User A created challenge: ${principleChallengeId}`);
    const initialChallengeDetails = await concept._getChallengeDetails({ challenge: principleChallengeId });
    assertEquals(initialChallengeDetails[0].exercise, "Jump Ropes", "Principle challenge created correctly.");
    assertEquals((await concept._isOpen({ challenge: principleChallengeId }))[0].result, false, "Principle challenge starts closed.");

    // 2. User A opens the challenge.
    await concept.openChallenge({ challenge: principleChallengeId });
    console.log(`2. User A opened the challenge.`);
    assertEquals((await concept._isOpen({ challenge: principleChallengeId }))[0].result, true, "Principle challenge is now open.");

    // 3. User A invites User B and User C to the challenge.
    await concept.inviteToChallenge({ challenge: principleChallengeId, users: [userB, userC] });
    console.log(`3. User A invited User B and User C.`);
    assertEquals((await concept._getInvitees({ challenge: principleChallengeId })).map(i => i.user).sort(), [userB, userC].sort(), "User B and C invited.");

    // 4. User B accepts the challenge. User C does not.
    await concept.acceptChallenge({ challenge: principleChallengeId, user: userB });
    console.log(`4. User B accepted the challenge. User C did not.`);
    assertEquals((await concept._isParticipant({ challenge: principleChallengeId, user: userB }))[0].result, true, "User B is participant.");
    assertEquals((await concept._isParticipant({ challenge: principleChallengeId, user: userC }))[0].result, false, "User C is not participant.");

    // 5. User B completes the single part of the challenge.
    const principleParts = await db.collection("Challenges.parts").find({ challenge: principleChallengeId }).toArray();
    assertEquals(principleParts.length, 1, "Principle challenge should have 1 part.");
    const principlePartId = principleParts[0]._id;
    await concept.completePart({ part: principlePartId.toString() as ID, user: userB });
    console.log(`5. User B completed the part: ${principlePartId}`);
    assertEquals((await concept._isCompletedPart({ part: principlePartId.toString() as ID, user: userB }))[0].result, true, "User B completed the part.");

    // 6. This triggers completion of the entire challenge for User B.
    assertEquals((await concept._isCompletedChallenge({ challenge: principleChallengeId, user: userB }))[0].result, true, "User B completed the entire challenge.");
    console.log(`6. User B's overall challenge status is now 'completed'.`);

    // 7. User B creates a verification request for the part, User A is the approver.
    const vrRes = await concept.createVerificationRequest({
      part: principlePartId.toString() as ID, requester: userB, approver: userA, evidence: testFileId,
    });
    const principleVrId = (vrRes as { verificationRequest: ID }).verificationRequest;
    console.log(`7. User B created verification request ${principleVrId} for User A.`);
    const initialVrState = await db.collection("Challenges.verificationRequests").findOne({ _id: principleVrId });
    assertEquals(initialVrState?.approved, false, "Verification request is initially not approved.");

    // 8. User A verifies the request.
    await concept.verify({ part: principlePartId.toString() as ID, requester: userB });
    console.log(`8. User A verified the request.`);
    const finalVrState = await db.collection("Challenges.verificationRequests").findOne({ _id: principleVrId });
    assertEquals(finalVrState?.approved, true, "Verification request is now approved.");

    // 9. User C tries to complete a part (should fail as not accepted).
    const userCFailsToComplete = await concept.completePart({ part: principlePartId.toString() as ID, user: userC });
    assertEquals(userCFailsToComplete, { error: "User is not an accepted participant in this challenge." }, "User C cannot complete a part because not accepted.");
    console.log(`9. User C attempted to complete part but failed as expected.`);

    // 10. User B leaves the challenge.
    await concept.leaveChallenge({ challenge: principleChallengeId, user: userB });
    console.log(`10. User B left the challenge.`);
    assertEquals((await concept._isInvited({ challenge: principleChallengeId, user: userB }))[0].result, false, "User B is no longer invited/participating.");

    console.log(`Principle trace complete. All steps align with expected behavior and state changes.`);
  });

  // --- Action: deleteChallenge ---
  await t.step("[Action: deleteChallenge] - Delete an existing challenge and its associated data", async () => {
    console.log(`\n--- Test: deleteChallenge ---`);
    // Create a new challenge to delete
    const createResToDelete = await concept.createChallenge({
      creator: userA, creatorType: "User", level: 1, exercise: "Cleanup", frequency: 1, duration: 1,
    });
    
    console.log('\nCreated a new challenge', createResToDelete);
    const challengeToDeleteId = (createResToDelete as { challenge: ID }).challenge;
    await concept.openChallenge({challenge: challengeToDeleteId});
    const partsForDeleteChallenge = await db.collection("Challenges.parts").find({ challenge: challengeToDeleteId }).toArray();
    const partToDeleteId = partsForDeleteChallenge[0]._id;
    const verificationRequest = await concept.createVerificationRequest({
      part: partToDeleteId.toString() as ID, requester: userB, approver: userA, evidence: testFileId,
    });
    console.log('\nCreated a new verification Request', verificationRequest);

    // Ensure challenge and associated data exists
    assertExists(await db.collection("Challenges.challenges").findOne({ _id: challengeToDeleteId }), "Challenge should exist before deletion.");
    assertEquals(await db.collection("Challenges.parts").countDocuments({ challenge: challengeToDeleteId }), 1, "Part should exist before deletion.");
    assertEquals(await db.collection("Challenges.verificationRequests").countDocuments({ challenge: challengeToDeleteId }), 1, "Verification request should exist before deletion.");

    const result = await concept.deleteChallenge({ challenge: challengeToDeleteId });
    assertEquals(result, {}, "Should return empty object for successful operation.");
    console.log(`Action result: ${JSON.stringify(result)}`);

    // Verify effects: Challenge, parts, and verification requests are deleted
    assertEquals(await db.collection("Challenges.challenges").findOne({ _id: challengeToDeleteId }), null, "Challenge should be deleted.");
    assertEquals(await db.collection("Challenges.parts").countDocuments({ challenge: challengeToDeleteId }), 0, "Associated part should be deleted.");
    assertEquals(await db.collection("Challenges.verificationRequests").countDocuments({ challenge: challengeToDeleteId }), 0, "Associated verification request should be deleted.");
    console.log(`Confirmed 'deleteChallenge' removes the challenge and all associated parts and verification requests.`);
  });

  await t.step("[Action: deleteChallenge] - Try to delete a non-existent challenge (requires check)", async () => {
    console.log(`\n--- Test: deleteChallenge (non-existent) ---`);
    const nonExistentId = freshID();
    const result = await concept.deleteChallenge({ challenge: nonExistentId });
    assertEquals(result, { error: "Challenge not found." }, "Should return error for non-existent challenge.");
    console.log(`Rejected deleting non-existent challenge: ${JSON.stringify(result)}`);
  });
 
  await client.close();
}); 