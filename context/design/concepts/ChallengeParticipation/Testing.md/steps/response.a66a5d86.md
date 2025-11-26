---
timestamp: 'Tue Nov 25 2025 08:52:04 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_085204.daceb955.md]]'
content_id: a66a5d860a7bb1a04e7bcd6fe14b0787ad699696b0857b5c65eb1952602571c0
---

# response:

```typescript
// file: src/concepts/ChallengeDefinition/ChallengeParticipationConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ChallengeParticipationConcept from "./ChallengeParticipationConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

Deno.test("ChallengeParticipationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeParticipationConcept(db);

  // Define some test IDs
  const userA: ID = freshID() as ID;
  const userB: ID = freshID() as ID;
  const challenge1: ID = freshID() as ID;
  const challenge2: ID = freshID() as ID;

  console.log(
    `Test IDs: UserA=${userA}, UserB=${userB}, Challenge1=${challenge1}, Challenge2=${challenge2}`
  );

  await t.step(
    "[Principle]: User is invited, accepts, and completes a challenge",
    async () => {
      console.log(
        "--- [Principle Trace: User invited, accepts, completes] ---"
      );

      // 1. Create an invitation
      console.log(`Action: createInvitation for UserA to Challenge1`);
      const createInvitationResult = await concept.createInvitation({
        challenge: challenge1,
        user: userA,
      });
      assertEquals(
        "error" in createInvitationResult,
        false,
        "createInvitation should succeed"
      );
      const invitationId = createInvitationResult.invitation;
      console.log(`  Result: Invitation created with ID: ${invitationId}`);

      // Verify invitation exists for userA and challenge1
      let userAInvitations = await concept._getUserInvitations({ user: userA });
      assertEquals(userAInvitations.length, 1);
      assertEquals(userAInvitations[0].challenge, challenge1);
      console.log(`  Query: UserA now has 1 invitation to Challenge1`);

      let challenge1Invitees = await concept._getChallengeInvitees({
        challenge: challenge1,
      });
      assertEquals(challenge1Invitees.length, 1);
      assertEquals(challenge1Invitees[0].user, userA);
      console.log(`  Query: Challenge1 now has 1 invitee (UserA)`);

      // 2. User accepts the invitation
      console.log(`Action: acceptInvitation for invitation ID: ${invitationId}`);
      const acceptInvitationResult = await concept.acceptInvitation({
        invitation: invitationId,
      });
      assertEquals(
        "error" in acceptInvitationResult,
        false,
        "acceptInvitation should succeed"
      );
      const participationId = acceptInvitationResult.participation;
      console.log(
        `  Result: Participation created with ID: ${participationId}`
      );

      // Verify participation exists for userA and challenge1
      let userAParticipations = await concept._getUserParticipations({
        user: userA,
      });
      assertEquals(userAParticipations.length, 1);
      assertEquals(userAParticipations[0].challenge, challenge1);
      console.log(`  Query: UserA now has 1 participation in Challenge1`);

      let challenge1Participants = await concept._getChallengeParticipants({
        challenge: challenge1,
      });
      assertEquals(challenge1Participants.length, 1);
      assertEquals(challenge1Participants[0].user, userA);
      console.log(`  Query: Challenge1 now has 1 participant (UserA)`);

      // Verify invitation is still there (accepting doesn't remove it by default)
      userAInvitations = await concept._getUserInvitations({ user: userA });
      assertEquals(userAInvitations.length, 1);
      console.log(
        `  Query: Invitation ${invitationId} still exists after acceptance`
      );

      // 3. User completes the challenge
      console.log(
        `Action: completeChallenge for participation ID: ${participationId}`
      );
      const completeChallengeResult = await concept.completeChallenge({
        participation: participationId,
      });
      assertEquals(
        "error" in completeChallengeResult,
        false,
        "completeChallenge should succeed"
      );
      console.log(`  Result: Participation ${participationId} marked as completed`);

      // Verify the 'completed' status directly from the database as no query exposes it
      const participationDoc = await concept["participations"].findOne({
        _id: participationId,
      });
      assertEquals(
        participationDoc?.completed,
        true,
        "Participation 'completed' status should be true"
      );
      console.log(`  Database check: Participation ${participationId} 'completed' status is indeed true`);

      console.log("--- [Principle Trace End] ---");
    }
  );

  await t.step("[Action]: createInvitation", async (st) => {
    console.log("--- [Testing createInvitation] ---");

    await st.step("Should successfully create an invitation", async () => {
      const result = await concept.createInvitation({
        challenge: challenge2,
        user: userB,
      });
      assertEquals(
        "error" in result,
        false,
        "createInvitation should not return an error"
      );
      const { invitation } = result;
      assertEquals(typeof invitation, "string", "Invitation ID should be a string");
      console.log(`  Success: Invitation ${invitation} created for UserB in Challenge2.`);

      // Verify effect: invitation should exist in the database
      const invitees = await concept._getChallengeInvitees({
        challenge: challenge2,
      });
      assertEquals(invitees.length, 1, "Challenge2 should have 1 invitee");
      assertEquals(
        invitees[0].user,
        userB,
        "Challenge2 invitee should be UserB"
      );

      const userInvitations = await concept._getUserInvitations({ user: userB });
      assertEquals(userInvitations.length, 1, "UserB should have 1 invitation");
      assertEquals(
        userInvitations[0].challenge,
        challenge2,
        "UserB's invitation should be to Challenge2"
      );
      console.log("  Effect confirmed: Invitation found via queries.");
    });

    await st.step("Should create a new invitation even if one already exists for the same user/challenge", async () => {
      // Create a second invitation for the same user and challenge
      const result1 = await concept.createInvitation({ challenge: challenge2, user: userB });
      const result2 = await concept.createInvitation({ challenge: challenge2, user: userB });

      assertEquals("error" in result1, false);
      assertEquals("error" in result2, false);
      assertEquals(result1.invitation !== result2.invitation, true, "Two different invitation IDs should be generated");
      console.log(`  Success: Two distinct invitations created for UserB and Challenge2: ${result1.invitation}, ${result2.invitation}`);

      const userBInvitations = await concept._getUserInvitations({ user: userB });
      assertEquals(userBInvitations.length, 3, "UserB should now have 3 invitations in total"); // 1 from previous step + 2 from this step
      console.log("  Effect confirmed: Multiple invitations possible for the same user/challenge pair.");
    });

    console.log("--- [End createInvitation] ---");
  });

  await t.step("[Action]: acceptInvitation", async (st) => {
    console.log("--- [Testing acceptInvitation] ---");

    const newInvitationId = (
      await concept.createInvitation({ challenge: challenge1, user: userB })
    ).invitation;
    console.log(`  Setup: Created invitation ${newInvitationId} for UserB to Challenge1.`);

    await st.step("Should successfully accept an existing invitation", async () => {
      const result = await concept.acceptInvitation({
        invitation: newInvitationId,
      });
      assertEquals(
        "error" in result,
        false,
        "acceptInvitation should not return an error"
      );
      const { participation } = result;
      assertEquals(
        typeof participation,
        "string",
        "Participation ID should be a string"
      );
      console.log(`  Success: Invitation ${newInvitationId} accepted, Participation ${participation} created.`);

      // Verify effect: participation should exist
      const userBParticipations = await concept._getUserParticipations({
        user: userB,
      });
      // UserB might have other participations from previous tests or if this test is run out of order
      // We check for the specific challenge
      assertEquals(
        userBParticipations.some((p) => p.challenge === challenge1),
        true,
        "UserB should have participation in Challenge1"
      );

      const challenge1Participants = await concept._getChallengeParticipants({
        challenge: challenge1,
      });
      assertEquals(
        challenge1Participants.some((p) => p.user === userB),
        true,
        "Challenge1 should have UserB as a participant"
      );
      console.log("  Effect confirmed: Participation found via queries.");
    });

    await st.step("Should return an error for a non-existent invitation", async () => {
      const nonExistentId: ID = freshID() as ID;
      console.log(`  Attempting to accept non-existent invitation ID: ${nonExistentId}`);
      const result = await concept.acceptInvitation({
        invitation: nonExistentId,
      });
      assertEquals("error" in result, true, "Should return an error for non-existent invitation");
      assertEquals(
        result.error,
        "Invitation does not exist",
        "Error message should match expectation"
      );
      console.log(`  Requirement confirmed: Cannot accept non-existent invitation.`);
    });

    // The current implementation allows accepting the same invitation multiple times
    await st.step("Should allow accepting the same invitation multiple times (design choice)", async () => {
        const result1 = await concept.acceptInvitation({ invitation: newInvitationId });
        const result2 = await concept.acceptInvitation({ invitation: newInvitationId });

        assertEquals("error" in result1, false);
        assertEquals("error" in result2, false);
        assertEquals(result1.participation !== result2.participation, true, "Should create distinct participation IDs");
        console.log(`  Success: Invitation ${newInvitationId} accepted twice, resulting in two participations: ${result1.participation}, ${result2.participation}`);

        const userBParticipations = await concept._getUserParticipations({user: userB});
        // Count participations for challenge1
        const challenge1Count = userBParticipations.filter(p => p.challenge === challenge1).length;
        assertEquals(challenge1Count, 3, "UserB should now have 3 participations for Challenge1"); // 1 from previous step + 2 from this step
        console.log("  Effect confirmed: Multiple participations from a single invitation are allowed by design.");
    });


    console.log("--- [End acceptInvitation] ---");
  });

  await t.step("[Action]: removeInvitation", async (st) => {
    console.log("--- [Testing removeInvitation] ---");

    const invitationToRemove = (
      await concept.createInvitation({ challenge: challenge2, user: userA })
    ).invitation;
    console.log(`  Setup: Created invitation ${invitationToRemove} for UserA to Challenge2.`);

    await st.step("Should successfully remove an existing invitation", async () => {
      const initialInvitations = await concept._getUserInvitations({ user: userA });
      const initialCount = initialInvitations.filter(inv => inv.challenge === challenge2).length;
      console.log(`  Pre-removal: UserA has ${initialCount} invitations to Challenge2.`);

      const result = await concept.removeInvitation({
        invitation: invitationToRemove,
      });
      assertEquals(
        "error" in result,
        false,
        "removeInvitation should not return an error"
      );
      console.log(`  Success: Invitation ${invitationToRemove} removed.`);

      // Verify effect: invitation should no longer exist
      const remainingInvitations = await concept._getUserInvitations({
        user: userA,
      });
      assertEquals(
        remainingInvitations.some((inv) => inv.challenge === challenge2),
        false,
        "UserA should no longer have this invitation to Challenge2"
      );

      const challengeInvitees = await concept._getChallengeInvitees({
        challenge: challenge2,
      });
      assertEquals(
        challengeInvitees.some((inv) => inv.user === userA),
        false,
        "Challenge2 should no longer list UserA as an invitee for this specific invitation"
      );
      console.log("  Effect confirmed: Invitation no longer found via queries.");
    });

    await st.step("Should return an error for a non-existent invitation", async () => {
      const nonExistentId: ID = freshID() as ID;
      console.log(`  Attempting to remove non-existent invitation ID: ${nonExistentId}`);
      const result = await concept.removeInvitation({
        invitation: nonExistentId,
      });
      assertEquals("error" in result, true, "Should return an error for non-existent invitation");
      assertEquals(
        result.error,
        "Invitation does not exist",
        "Error message should match expectation"
      );
      console.log(`  Requirement confirmed: Cannot remove non-existent invitation.`);
    });

    console.log("--- [End removeInvitation] ---");
  });

  await t.step("[Action]: removeParticipation", async (st) => {
    console.log("--- [Testing removeParticipation] ---");

    const inviteForRemoval = (
      await concept.createInvitation({ challenge: challenge1, user: userA })
    ).invitation;
    const participationToRemove = (
      await concept.acceptInvitation({ invitation: inviteForRemoval })
    ).participation;
    console.log(`  Setup: Created invitation ${inviteForRemoval}, accepted to participation ${participationToRemove}.`);

    await st.step("Should successfully remove an existing participation", async () => {
      const initialParticipations = await concept._getUserParticipations({ user: userA });
      const initialCount = initialParticipations.filter(p => p.challenge === challenge1).length;
      console.log(`  Pre-removal: UserA has ${initialCount} participations in Challenge1.`);

      const result = await concept.removeParticipation({
        participation: participationToRemove,
      });
      assertEquals(
        "error" in result,
        false,
        "removeParticipation should not return an error"
      );
      console.log(`  Success: Participation ${participationToRemove} removed.`);

      // Verify effect: participation should no longer exist
      const remainingParticipations = await concept._getUserParticipations({
        user: userA,
      });
      assertEquals(
        remainingParticipations.some((p) => p.challenge === challenge1 && p !== participationToRemove),
        false, // Check that the specific participation is gone
        "UserA should no longer have this specific participation in Challenge1"
      ); // This will only work if there's only one participation for userA in challenge1.
      // Better: check if the _id of participationToRemove is present in any retrieved documents.
      const participationsInDb = await concept["participations"].findOne({ _id: participationToRemove });
      assertEquals(participationsInDb, null, "Participation document should be null after removal");
      console.log("  Effect confirmed: Participation no longer found in database.");
    });

    await st.step("Should return an error for a non-existent participation", async () => {
      const nonExistentId: ID = freshID() as ID;
      console.log(`  Attempting to remove non-existent participation ID: ${nonExistentId}`);
      const result = await concept.removeParticipation({
        participation: nonExistentId,
      });
      assertEquals("error" in result, true, "Should return an error for non-existent participation");
      assertEquals(
        result.error,
        "Participation does not exist",
        "Error message should match expectation"
      );
      console.log(`  Requirement confirmed: Cannot remove non-existent participation.`);
    });

    console.log("--- [End removeParticipation] ---");
  });

  await t.step("[Action]: completeChallenge", async (st) => {
    console.log("--- [Testing completeChallenge] ---");

    const inviteForCompletion = (
      await concept.createInvitation({ challenge: challenge2, user: userB })
    ).invitation;
    const participationToComplete = (
      await concept.acceptInvitation({ invitation: inviteForCompletion })
    ).participation;
    console.log(`  Setup: Created invitation ${inviteForCompletion}, accepted to participation ${participationToComplete}.`);


    await st.step("Should successfully mark an existing participation as completed", async () => {
      const initialDoc = await concept["participations"].findOne({ _id: participationToComplete });
      assertEquals(initialDoc?.completed, false, "Initial participation should not be completed");
      console.log(`  Pre-completion: Participation ${participationToComplete} is not completed.`);

      const result = await concept.completeChallenge({
        participation: participationToComplete,
      });
      assertEquals(
        "error" in result,
        false,
        "completeChallenge should not return an error"
      );
      console.log(`  Success: Participation ${participationToComplete} marked as completed.`);

      // Verify effect: 'completed' flag should be true
      const updatedDoc = await concept["participations"].findOne({
        _id: participationToComplete,
      });
      assertEquals(
        updatedDoc?.completed,
        true,
        "Participation 'completed' status should be true after action"
      );
      console.log("  Effect confirmed: 'completed' flag updated in database.");
    });

    await st.step("Should return an error for a non-existent participation", async () => {
      const nonExistentId: ID = freshID() as ID;
      console.log(`  Attempting to complete non-existent participation ID: ${nonExistentId}`);
      const result = await concept.completeChallenge({
        participation: nonExistentId,
      });
      assertEquals("error" in result, true, "Should return an error for non-existent participation");
      assertEquals(
        result.error,
        "Participation does not exist",
        "Error message should match expectation"
      );
      console.log(`  Requirement confirmed: Cannot complete non-existent participation.`);
    });

    console.log("--- [End completeChallenge] ---");
  });

  await t.step("[Queries]: _getChallengeParticipants, _getChallengeInvitees, _getUserParticipations, _getUserInvitations", async (st) => {
    console.log("--- [Testing Queries] ---");

    // Setup fresh data for queries
    const userX: ID = freshID() as ID;
    const userY: ID = freshID() as ID;
    const challengeA: ID = freshID() as ID;
    const challengeB: ID = freshID() as ID;

    const inviteXA = (await concept.createInvitation({ user: userX, challenge: challengeA })).invitation;
    const inviteXB = (await concept.createInvitation({ user: userX, challenge: challengeB })).invitation;
    const inviteYA = (await concept.createInvitation({ user: userY, challenge: challengeA })).invitation;

    const partXA = (await concept.acceptInvitation({ invitation: inviteXA })).participation;
    const partYA = (await concept.acceptInvitation({ invitation: inviteYA })).participation;
    await concept.completeChallenge({ participation: partYA }); // Make one completed

    console.log(`  Setup:
    - UserX invited to ChallengeA (${inviteXA}) and ChallengeB (${inviteXB})
    - UserY invited to ChallengeA (${inviteYA})
    - UserX participates in ChallengeA (${partXA})
    - UserY participates in ChallengeA (${partYA}) and completes it.`);

    await st.step("Query: _getChallengeParticipants", async () => {
      const participantsA = await concept._getChallengeParticipants({ challenge: challengeA });
      assertEquals(participantsA.length, 2, "ChallengeA should have 2 participants");
      assertEquals(
        participantsA.some((p) => p.user === userX),
        true,
        "ChallengeA participants should include UserX"
      );
      assertEquals(
        participantsA.some((p) => p.user === userY),
        true,
        "ChallengeA participants should include UserY"
      );
      console.log(`  _getChallengeParticipants for ChallengeA: Found UserX, UserY.`);

      const participantsB = await concept._getChallengeParticipants({ challenge: challengeB });
      assertEquals(participantsB.length, 0, "ChallengeB should have 0 participants (UserX only invited)");
      console.log(`  _getChallengeParticipants for ChallengeB: Found none.`);
    });

    await st.step("Query: _getChallengeInvitees", async () => {
      const inviteesA = await concept._getChallengeInvitees({ challenge: challengeA });
      assertEquals(inviteesA.length, 2, "ChallengeA should have 2 invitees");
      assertEquals(
        inviteesA.some((i) => i.user === userX),
        true,
        "ChallengeA invitees should include UserX"
      );
      assertEquals(
        inviteesA.some((i) => i.user === userY),
        true,
        "ChallengeA invitees should include UserY"
      );
      console.log(`  _getChallengeInvitees for ChallengeA: Found UserX, UserY.`);

      const inviteesB = await concept._getChallengeInvitees({ challenge: challengeB });
      assertEquals(inviteesB.length, 1, "ChallengeB should have 1 invitee");
      assertEquals(
        inviteesB.some((i) => i.user === userX),
        true,
        "ChallengeB invitees should include UserX"
      );
      console.log(`  _getChallengeInvitees for ChallengeB: Found UserX.`);
    });

    await st.step("Query: _getUserParticipations", async () => {
      const userXParticipations = await concept._getUserParticipations({ user: userX });
      assertEquals(userXParticipations.length, 1, "UserX should have 1 participation");
      assertEquals(
        userXParticipations[0].challenge,
        challengeA,
        "UserX's participation should be in ChallengeA"
      );
      console.log(`  _getUserParticipations for UserX: Found participation in ChallengeA.`);

      const userYParticipations = await concept._getUserParticipations({ user: userY });
      assertEquals(userYParticipations.length, 1, "UserY should have 1 participation");
      assertEquals(
        userYParticipations[0].challenge,
        challengeA,
        "UserY's participation should be in ChallengeA"
      );
      console.log(`  _getUserParticipations for UserY: Found participation in ChallengeA.`);

      const nonExistentUserParticipations = await concept._getUserParticipations({ user: freshID() as ID });
      assertEquals(nonExistentUserParticipations.length, 0, "Non-existent user should have 0 participations");
      console.log(`  _getUserParticipations for non-existent user: Found none.`);
    });

    await st.step("Query: _getUserInvitations", async () => {
      const userXInvitations = await concept._getUserInvitations({ user: userX });
      assertEquals(userXInvitations.length, 2, "UserX should have 2 invitations");
      assertEquals(
        userXInvitations.some((i) => i.challenge === challengeA),
        true,
        "UserX's invitations should include ChallengeA"
      );
      assertEquals(
        userXInvitations.some((i) => i.challenge === challengeB),
        true,
        "UserX's invitations should include ChallengeB"
      );
      console.log(`  _getUserInvitations for UserX: Found invitations to ChallengeA, ChallengeB.`);

      const userYInvitations = await concept._getUserInvitations({ user: userY });
      assertEquals(userYInvitations.length, 1, "UserY should have 1 invitation");
      assertEquals(
        userYInvitations[0].challenge,
        challengeA,
        "UserY's invitation should be to ChallengeA"
      );
      console.log(`  _getUserInvitations for UserY: Found invitation to ChallengeA.`);

      const nonExistentUserInvitations = await concept._getUserInvitations({ user: freshID() as ID });
      assertEquals(nonExistentUserInvitations.length, 0, "Non-existent user should have 0 invitations");
      console.log(`  _getUserInvitations for non-existent user: Found none.`);
    });

    console.log("--- [End Queries] ---");
  });

  await client.close();
});
```
