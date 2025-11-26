---
timestamp: 'Tue Nov 25 2025 08:59:05 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_085905.7af63c42.md]]'
content_id: a0136e20b560c397d4362823da34cae0b89157a0b09029cfde63f1ec4789927e
---

# response:

Okay, let's write the test file for the `ChallengeParticipationConcept`.

I'll follow the instructions provided, including:

* Using `Deno.test` and `testDb`.
* Importing `assertEquals`.
* Structuring tests with `t.step`.
* Testing `requires` (preconditions) and `effects` (postconditions) for each action.
* Modeling a "principle trace" scenario.
* Ensuring error handling (`{ error: string }`) is properly checked.
* Verifying query results.
* Adding comments for legibility and explanation.
* Closing the MongoDB client.

```typescript
// file: src/concepts/ChallengeDefinition/ChallengeParticipationConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ChallengeParticipationConcept from "@concepts/ChallengeDefinition/ChallengeParticipationConcept.ts";
import { Collection } from "npm:mongodb"; // To directly inspect state for specific tests

// Generic types for the concept
type User = ID;
type Challenge = ID;
type Invitation = ID;
type Participation = ID;

// Interface for direct inspection of Participation state
interface ParticipationDoc {
  _id: ID;
  user: User;
  challenge: Challenge;
  completed: boolean;
}

Deno.test("ChallengeParticipationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeParticipationConcept(db);

  // Helper collection for direct state inspection
  const participationsCollection: Collection<ParticipationDoc> = db.collection(
    "ChallengeParticipation.Participations",
  );

  // Define test IDs for users and challenges
  const userAlice: User = freshID() as User;
  const userBob: User = freshID() as User;
  const challengeA: Challenge = freshID() as Challenge;
  const challengeB: Challenge = freshID() as Challenge;

  // # trace: Demonstrating the core principle of invitation, acceptance, and completion.
  await t.step(
    "Principle Trace: User invited, accepts, completes challenge",
    async () => {
      console.log(
        "\n--- Principle Trace: User Alice participates in Challenge A ---",
      );

      // 1. Create an invitation for Alice to Challenge A
      console.log(`Action: createInvitation(challenge: ${challengeA}, user: ${userAlice})`);
      const createInviteResult = await concept.createInvitation({
        challenge: challengeA,
        user: userAlice,
      });
      assertEquals(
        "invitation" in createInviteResult,
        true,
        "Should return an invitation ID",
      );
      const invitationId = (createInviteResult as { invitation: Invitation })
        .invitation;
      console.log(`Effect: Invitation ${invitationId} created.`);

      // Verify Alice is an invitee for Challenge A
      const inviteesA = await concept._getChallengeInvitees({
        challenge: challengeA,
      });
      assertEquals(inviteesA.length, 1, "Challenge A should have 1 invitee");
      assertEquals(
        inviteesA[0].user,
        userAlice,
        "Alice should be the invitee for Challenge A",
      );
      console.log(`Query: Challenge A invitees verified.`);

      // 2. Alice accepts the invitation
      console.log(`Action: acceptInvitation(invitation: ${invitationId})`);
      const acceptInviteResult = await concept.acceptInvitation({
        invitation: invitationId,
      });
      assertEquals(
        "participation" in acceptInviteResult,
        true,
        "Should return a participation ID",
      );
      const participationId = (acceptInviteResult as {
        participation: Participation;
      }).participation;
      console.log(`Effect: Participation ${participationId} created for Alice.`);

      // Verify Alice is now a participant in Challenge A
      const participantsA = await concept._getChallengeParticipants({
        challenge: challengeA,
      });
      assertEquals(
        participantsA.length,
        1,
        "Challenge A should have 1 participant",
      );
      assertEquals(
        participantsA[0].user,
        userAlice,
        "Alice should be a participant in Challenge A",
      );
      console.log(`Query: Challenge A participants verified.`);

      // Verify Alice's participations
      const aliceParticipations = await concept._getUserParticipations({
        user: userAlice,
      });
      assertEquals(
        aliceParticipations.length,
        1,
        "Alice should have 1 participation",
      );
      assertEquals(
        aliceParticipations[0].challenge,
        challengeA,
        "Alice's participation should be for Challenge A",
      );
      console.log(`Query: Alice's participations verified.`);

      // Verify the invitation still exists (current implementation behavior)
      const aliceInvitations = await concept._getUserInvitations({
        user: userAlice,
      });
      assertEquals(
        aliceInvitations.length,
        1,
        "Invitation should still exist after acceptance (current behavior)",
      );
      console.log(
        `Note: Invitation ${invitationId} still exists after acceptance.`,
      );

      // 3. Alice completes Challenge A
      console.log(`Action: completeChallenge(participation: ${participationId})`);
      const completeChallengeResult = await concept.completeChallenge({
        participation: participationId,
      });
      assertEquals(
        completeChallengeResult as Empty,
        {},
        "Should return an empty object on success",
      );
      console.log(`Effect: Participation ${participationId} marked as completed.`);

      // Verify the participation is marked as completed
      const updatedParticipation = await participationsCollection.findOne({
        _id: participationId,
      });
      assertEquals(
        updatedParticipation?.completed,
        true,
        "Participation should be marked as completed",
      );
      console.log(`Verification: Participation ${participationId} status confirmed as completed.`);

      // 4. Remove Alice's participation (cleanup for principle)
      console.log(`Action: removeParticipation(participation: ${participationId})`);
      const removeParticipationResult = await concept.removeParticipation({
        participation: participationId,
      });
      assertEquals(removeParticipationResult as Empty, {}, "Should return an empty object on success");
      console.log(`Effect: Participation ${participationId} removed.`);

      // Verify participation is gone
      const participantsAfterRemove = await concept._getChallengeParticipants({ challenge: challengeA });
      assertEquals(participantsAfterRemove.length, 0, "Challenge A should have no participants after removal");
      console.log(`Verification: Challenge A has no participants.`);

      // Remove the invitation as well (cleanup for principle)
      console.log(`Action: removeInvitation(invitation: ${invitationId})`);
      const removeInvitationResult = await concept.removeInvitation({ invitation: invitationId });
      assertEquals(removeInvitationResult as Empty, {}, "Should return an empty object on success");
      console.log(`Effect: Invitation ${invitationId} removed.`);
      const inviteesAfterRemove = await concept._getChallengeInvitees({ challenge: challengeA });
      assertEquals(inviteesAfterRemove.length, 0, "Challenge A should have no invitees after removal");
      console.log(`Verification: Challenge A has no invitees.`);

      console.log("\n--- Principle Trace Complete ---");
    },
  );

  await t.step("[Action]: createInvitation", async (st) => {
    // **requires** (implicit): valid User and Challenge IDs (enforced by type system, not logic)
    // **effects** creates a new Invitation document linking the user and challenge.

    st.step("should successfully create an invitation", async () => {
      console.log(
        `\nTest: createInvitation(challenge: ${challengeA}, user: ${userBob})`,
      );
      const result = await concept.createInvitation({
        challenge: challengeA,
        user: userBob,
      });
      assertEquals(
        "invitation" in result,
        true,
        "Should return an invitation ID",
      );
      const invitationId = (result as { invitation: Invitation }).invitation;
      console.log(`Effect: Invitation ${invitationId} created.`);

      // Verify existence via query
      const invitees = await concept._getChallengeInvitees({
        challenge: challengeA,
      });
      assertEquals(invitees.length, 1, "Should find 1 invitee for Challenge A");
      assertEquals(
        invitees[0].user,
        userBob,
        "The invitee should be userBob",
      );
      console.log(`Verification: userBob is an invitee for Challenge A.`);
    });
  });

  await t.step("[Action]: acceptInvitation", async (st) => {
    // **requires** invitation with the given ID must exist.
    // **effects** creates a new Participation document for the user/challenge associated with the invitation.

    const inviterId: User = freshID() as User;
    const challengeToAccept: Challenge = freshID() as Challenge;
    let validInvitation: Invitation;

    st.step("Setup: create an invitation to accept", async () => {
      const result = await concept.createInvitation({
        challenge: challengeToAccept,
        user: inviterId,
      });
      validInvitation = (result as { invitation: Invitation }).invitation;
      console.log(
        `\nSetup: Invitation ${validInvitation} created for ${inviterId} to ${challengeToAccept}.`,
      );
    });

    st.step("should successfully accept an existing invitation", async () => {
      console.log(`Test: acceptInvitation(invitation: ${validInvitation})`);
      const result = await concept.acceptInvitation({
        invitation: validInvitation,
      });
      assertEquals(
        "participation" in result,
        true,
        "Should return a participation ID",
      );
      const participationId = (result as {
        participation: Participation;
      }).participation;
      console.log(`Effect: Participation ${participationId} created.`);

      // Verify participation was created
      const participants = await concept._getChallengeParticipants({
        challenge: challengeToAccept,
      });
      assertEquals(
        participants.length,
        1,
        "Challenge should have 1 participant",
      );
      assertEquals(
        participants[0].user,
        inviterId,
        "Participant should be the user from the invitation",
      );
      console.log(
        `Verification: ${inviterId} is a participant in ${challengeToAccept}.`,
      );

      // Verify invitation still exists (current behavior)
      const invitations = await concept._getChallengeInvitees({
        challenge: challengeToAccept,
      });
      assertEquals(
        invitations.length,
        1,
        "Invitation should still exist after acceptance",
      );
      console.log(`Verification: Invitation ${validInvitation} still exists.`);
    });

    st.step("should return an error if the invitation does not exist", async () => {
      const nonExistentInvitation = freshID() as Invitation;
      console.log(
        `Test: acceptInvitation(invitation: ${nonExistentInvitation}) (non-existent)`,
      );
      const result = await concept.acceptInvitation({
        invitation: nonExistentInvitation,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return an error for non-existent invitation",
      );
      assertEquals(
        (result as { error: string }).error,
        "Invitation does not exist",
        "Error message should match expectation",
      );
      console.log(`Effect: Correctly returned error: "${(result as { error: string }).error}".`);
    });
  });

  await t.step("[Action]: removeInvitation", async (st) => {
    // **requires** invitation with the given ID must exist.
    // **effects** deletes the Invitation document.

    const userToRemoveInvite: User = freshID() as User;
    const challengeForRemoval: Challenge = freshID() as Challenge;
    let invitationToRemove: Invitation;

    st.step("Setup: create an invitation to remove", async () => {
      const result = await concept.createInvitation({
        challenge: challengeForRemoval,
        user: userToRemoveInvite,
      });
      invitationToRemove = (result as { invitation: Invitation }).invitation;
      console.log(
        `\nSetup: Invitation ${invitationToRemove} created for ${userToRemoveInvite} to ${challengeForRemoval}.`,
      );
    });

    st.step("should successfully remove an existing invitation", async () => {
      console.log(
        `Test: removeInvitation(invitation: ${invitationToRemove})`,
      );
      const result = await concept.removeInvitation({
        invitation: invitationToRemove,
      });
      assertEquals(result as Empty, {}, "Should return an empty object on success");
      console.log(`Effect: Invitation ${invitationToRemove} removed.`);

      // Verify invitation is gone
      const invitees = await concept._getChallengeInvitees({
        challenge: challengeForRemoval,
      });
      assertEquals(
        invitees.length,
        0,
        "Challenge should have no invitees after removal",
      );
      console.log(`Verification: Invitation ${invitationToRemove} no longer exists.`);
    });

    st.step("should return an error if the invitation does not exist", async () => {
      const nonExistentInvitation = freshID() as Invitation;
      console.log(
        `Test: removeInvitation(invitation: ${nonExistentInvitation}) (non-existent)`,
      );
      const result = await concept.removeInvitation({
        invitation: nonExistentInvitation,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return an error for non-existent invitation",
      );
      assertEquals(
        (result as { error: string }).error,
        "Invitation does not exist",
        "Error message should match expectation",
      );
      console.log(`Effect: Correctly returned error: "${(result as { error: string }).error}".`);
    });
  });

  await t.step("[Action]: removeParticipation", async (st) => {
    // **requires** participation with the given ID must exist.
    // **effects** deletes the Participation document.

    const userToRemovePart: User = freshID() as User;
    const challengeForPartRemoval: Challenge = freshID() as Challenge;
    let participationToRemove: Participation;

    st.step("Setup: create a participation to remove", async () => {
      const inviteResult = await concept.createInvitation({
        challenge: challengeForPartRemoval,
        user: userToRemovePart,
      });
      const inviteId = (inviteResult as { invitation: Invitation }).invitation;
      const acceptResult = await concept.acceptInvitation({
        invitation: inviteId,
      });
      participationToRemove = (acceptResult as {
        participation: Participation;
      }).participation;
      console.log(
        `\nSetup: Participation ${participationToRemove} created for ${userToRemovePart} in ${challengeForPartRemoval}.`,
      );
    });

    st.step("should successfully remove an existing participation", async () => {
      console.log(
        `Test: removeParticipation(participation: ${participationToRemove})`,
      );
      const result = await concept.removeParticipation({
        participation: participationToRemove,
      });
      assertEquals(result as Empty, {}, "Should return an empty object on success");
      console.log(`Effect: Participation ${participationToRemove} removed.`);

      // Verify participation is gone
      const participants = await concept._getChallengeParticipants({
        challenge: challengeForPartRemoval,
      });
      assertEquals(
        participants.length,
        0,
        "Challenge should have no participants after removal",
      );
      console.log(`Verification: Participation ${participationToRemove} no longer exists.`);
    });

    st.step("should return an error if the participation does not exist", async () => {
      const nonExistentParticipation = freshID() as Participation;
      console.log(
        `Test: removeParticipation(participation: ${nonExistentParticipation}) (non-existent)`,
      );
      const result = await concept.removeParticipation({
        participation: nonExistentParticipation,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return an error for non-existent participation",
      );
      assertEquals(
        (result as { error: string }).error,
        "Participation does not exist",
        "Error message should match expectation",
      );
      console.log(`Effect: Correctly returned error: "${(result as { error: string }).error}".`);
    });
  });

  await t.step("[Action]: completeChallenge", async (st) => {
    // **requires** participation with the given ID must exist.
    // **effects** sets the 'completed' field of the Participation document to true.

    const userToComplete: User = freshID() as User;
    const challengeToComplete: Challenge = freshID() as Challenge;
    let participationToComplete: Participation;

    st.step("Setup: create a participation to complete", async () => {
      const inviteResult = await concept.createInvitation({
        challenge: challengeToComplete,
        user: userToComplete,
      });
      const inviteId = (inviteResult as { invitation: Invitation }).invitation;
      const acceptResult = await concept.acceptInvitation({
        invitation: inviteId,
      });
      participationToComplete = (acceptResult as {
        participation: Participation;
      }).participation;
      console.log(
        `\nSetup: Participation ${participationToComplete} created for ${userToComplete} in ${challengeToComplete}. Initially not completed.`,
      );

      // Verify initial state
      const initialParticipation = await participationsCollection.findOne({
        _id: participationToComplete,
      });
      assertEquals(
        initialParticipation?.completed,
        false,
        "Participation should initially not be completed",
      );
    });

    st.step("should successfully mark an existing participation as completed", async () => {
      console.log(
        `Test: completeChallenge(participation: ${participationToComplete})`,
      );
      const result = await concept.completeChallenge({
        participation: participationToComplete,
      });
      assertEquals(result as Empty, {}, "Should return an empty object on success");
      console.log(`Effect: Participation ${participationToComplete} marked as completed.`);

      // Verify updated state directly from collection
      const updatedParticipation = await participationsCollection.findOne({
        _id: participationToComplete,
      });
      assertEquals(
        updatedParticipation?.completed,
        true,
        "Participation should be marked as completed",
      );
      console.log(`Verification: Participation ${participationToComplete} status confirmed as completed.`);
    });

    st.step("should return an error if the participation does not exist", async () => {
      const nonExistentParticipation = freshID() as Participation;
      console.log(
        `Test: completeChallenge(participation: ${nonExistentParticipation}) (non-existent)`,
      );
      const result = await concept.completeChallenge({
        participation: nonExistentParticipation,
      });
      assertEquals(
        "error" in result,
        true,
        "Should return an error for non-existent participation",
      );
      assertEquals(
        (result as { error: string }).error,
        "Participation does not exist",
        "Error message should match expectation",
      );
      console.log(`Effect: Correctly returned error: "${(result as { error: string }).error}".`);
    });
  });

  await t.step("[Queries]: _getChallengeParticipants", async (st) => {
    const queryChallenge: Challenge = freshID() as Challenge;
    const user1: User = freshID() as User;
    const user2: User = freshID() as User;

    st.step("Setup: Create participations for querying", async () => {
      // User1 for queryChallenge
      const invite1 = await concept.createInvitation({
        challenge: queryChallenge,
        user: user1,
      });
      await concept.acceptInvitation({
        invitation: (invite1 as { invitation: Invitation }).invitation,
      });

      // User2 for queryChallenge
      const invite2 = await concept.createInvitation({
        challenge: queryChallenge,
        user: user2,
      });
      await concept.acceptInvitation({
        invitation: (invite2 as { invitation: Invitation }).invitation,
      });

      // Also create a participation for a different challenge to ensure isolation
      const otherChallenge = freshID() as Challenge;
      const userOther = freshID() as User;
      const inviteOther = await concept.createInvitation({
        challenge: otherChallenge,
        user: userOther,
      });
      await concept.acceptInvitation({
        invitation: (inviteOther as { invitation: Invitation }).invitation,
      });

      console.log(
        `\nSetup: Created participations for ${user1}, ${user2} in ${queryChallenge}.`,
      );
    });

    st.step(
      "should return all participants for a given challenge",
      async () => {
        console.log(
          `Test: _getChallengeParticipants(challenge: ${queryChallenge})`,
        );
        const participants = await concept._getChallengeParticipants({
          challenge: queryChallenge,
        });
        assertEquals(
          participants.length,
          2,
          "Should return 2 participants for queryChallenge",
        );
        const participantUsers = participants.map((p) => p.user);
        assertEquals(
          participantUsers.includes(user1),
          true,
          "Should include user1",
        );
        assertEquals(
          participantUsers.includes(user2),
          true,
          "Should include user2",
        );
        console.log(`Effect: Retrieved 2 participants for ${queryChallenge}: ${participantUsers}.`);
      },
    );

    st.step(
      "should return an empty array for a challenge with no participants",
      async () => {
        const emptyChallenge = freshID() as Challenge;
        console.log(
          `Test: _getChallengeParticipants(challenge: ${emptyChallenge}) (empty)`,
        );
        const participants = await concept._getChallengeParticipants({
          challenge: emptyChallenge,
        });
        assertEquals(
          participants.length,
          0,
          "Should return an empty array for a challenge with no participants",
        );
        console.log(`Effect: Retrieved 0 participants for ${emptyChallenge}.`);
      },
    );
  });

  await t.step("[Queries]: _getChallengeInvitees", async (st) => {
    const queryChallenge: Challenge = freshID() as Challenge;
    const userInvited1: User = freshID() as User;
    const userInvited2: User = freshID() as User;

    st.step("Setup: Create invitations for querying", async () => {
      await concept.createInvitation({ challenge: queryChallenge, user: userInvited1 });
      await concept.createInvitation({ challenge: queryChallenge, user: userInvited2 });

      // Also create an invitation for a different challenge to ensure isolation
      const otherChallenge = freshID() as Challenge;
      const userOther = freshID() as User;
      await concept.createInvitation({ challenge: otherChallenge, user: userOther });

      console.log(
        `\nSetup: Created invitations for ${userInvited1}, ${userInvited2} to ${queryChallenge}.`,
      );
    });

    st.step(
      "should return all invitees for a given challenge",
      async () => {
        console.log(
          `Test: _getChallengeInvitees(challenge: ${queryChallenge})`,
        );
        const invitees = await concept._getChallengeInvitees({
          challenge: queryChallenge,
        });
        assertEquals(
          invitees.length,
          2,
          "Should return 2 invitees for queryChallenge",
        );
        const inviteeUsers = invitees.map((i) => i.user);
        assertEquals(
          inviteeUsers.includes(userInvited1),
          true,
          "Should include userInvited1",
        );
        assertEquals(
          inviteeUsers.includes(userInvited2),
          true,
          "Should include userInvited2",
        );
        console.log(`Effect: Retrieved 2 invitees for ${queryChallenge}: ${inviteeUsers}.`);
      },
    );

    st.step(
      "should return an empty array for a challenge with no invitees",
      async () => {
        const emptyChallenge = freshID() as Challenge;
        console.log(
          `Test: _getChallengeInvitees(challenge: ${emptyChallenge}) (empty)`,
        );
        const invitees = await concept._getChallengeInvitees({
          challenge: emptyChallenge,
        });
        assertEquals(
          invitees.length,
          0,
          "Should return an empty array for a challenge with no invitees",
        );
        console.log(`Effect: Retrieved 0 invitees for ${emptyChallenge}.`);
      },
    );
  });

  await t.step("[Queries]: _getUserParticipations", async (st) => {
    const queryUser: User = freshID() as User;
    const challengePart1: Challenge = freshID() as Challenge;
    const challengePart2: Challenge = freshID() as Challenge;

    st.step("Setup: Create participations for querying by user", async () => {
      // User participates in challengePart1
      const invite1 = await concept.createInvitation({
        challenge: challengePart1,
        user: queryUser,
      });
      await concept.acceptInvitation({
        invitation: (invite1 as { invitation: Invitation }).invitation,
      });

      // User participates in challengePart2
      const invite2 = await concept.createInvitation({
        challenge: challengePart2,
        user: queryUser,
      });
      await concept.acceptInvitation({
        invitation: (invite2 as { invitation: Invitation }).invitation,
      });

      // Also create a participation for a different user to ensure isolation
      const otherUser = freshID() as User;
      const otherChallenge = freshID() as Challenge;
      const inviteOther = await concept.createInvitation({
        challenge: otherChallenge,
        user: otherUser,
      });
      await concept.acceptInvitation({
        invitation: (inviteOther as { invitation: Invitation }).invitation,
      });

      console.log(
        `\nSetup: Created participations for ${queryUser} in ${challengePart1}, ${challengePart2}.`,
      );
    });

    st.step(
      "should return all challenges a user is participating in",
      async () => {
        console.log(
          `Test: _getUserParticipations(user: ${queryUser})`,
        );
        const participations = await concept._getUserParticipations({
          user: queryUser,
        });
        assertEquals(
          participations.length,
          2,
          "Should return 2 participations for queryUser",
        );
        const participatedChallenges = participations.map((p) => p.challenge);
        assertEquals(
          participatedChallenges.includes(challengePart1),
          true,
          "Should include challengePart1",
        );
        assertEquals(
          participatedChallenges.includes(challengePart2),
          true,
          "Should include challengePart2",
        );
        console.log(`Effect: Retrieved 2 participations for ${queryUser}: ${participatedChallenges}.`);
      },
    );

    st.step(
      "should return an empty array for a user with no participations",
      async () => {
        const nonExistentUser = freshID() as User;
        console.log(
          `Test: _getUserParticipations(user: ${nonExistentUser}) (empty)`,
        );
        const participations = await concept._getUserParticipations({
          user: nonExistentUser,
        });
        assertEquals(
          participations.length,
          0,
          "Should return an empty array for a user with no participations",
        );
        console.log(`Effect: Retrieved 0 participations for ${nonExistentUser}.`);
      },
    );
  });

  await t.step("[Queries]: _getUserInvitations", async (st) => {
    const queryUser: User = freshID() as User;
    const challengeInvite1: Challenge = freshID() as Challenge;
    const challengeInvite2: Challenge = freshID() as Challenge;

    st.step("Setup: Create invitations for querying by user", async () => {
      await concept.createInvitation({ challenge: challengeInvite1, user: queryUser });
      await concept.createInvitation({ challenge: challengeInvite2, user: queryUser });

      // Also create an invitation for a different user to ensure isolation
      const otherUser = freshID() as User;
      const otherChallenge = freshID() as Challenge;
      await concept.createInvitation({ challenge: otherChallenge, user: otherUser });

      console.log(
        `\nSetup: Created invitations for ${queryUser} to ${challengeInvite1}, ${challengeInvite2}.`,
      );
    });

    st.step(
      "should return all challenges a user is invited to",
      async () => {
        console.log(
          `Test: _getUserInvitations(user: ${queryUser})`,
        );
        const invitations = await concept._getUserInvitations({
          user: queryUser,
        });
        assertEquals(
          invitations.length,
          2,
          "Should return 2 invitations for queryUser",
        );
        const invitedChallenges = invitations.map((i) => i.challenge);
        assertEquals(
          invitedChallenges.includes(challengeInvite1),
          true,
          "Should include challengeInvite1",
        );
        assertEquals(
          invitedChallenges.includes(challengeInvite2),
          true,
          "Should include challengeInvite2",
        );
        console.log(`Effect: Retrieved 2 invitations for ${queryUser}: ${invitedChallenges}.`);
      },
    );

    st.step(
      "should return an empty array for a user with no invitations",
      async () => {
        const nonExistentUser = freshID() as User;
        console.log(
          `Test: _getUserInvitations(user: ${nonExistentUser}) (empty)`,
        );
        const invitations = await concept._getUserInvitations({
          user: nonExistentUser,
        });
        assertEquals(
          invitations.length,
          0,
          "Should return an empty array for a user with no invitations",
        );
        console.log(`Effect: Retrieved 0 invitations for ${nonExistentUser}.`);
      },
    );
  });

  await client.close(); // Close the database connection after all tests
});
```
