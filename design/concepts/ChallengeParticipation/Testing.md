[@implementation](Implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# Test: write tests for ChallengeParticipation concept, based on the instructions for testing a concept and the current implementation.

# response:

```typescript
// file: src/concepts/ChallengeDefinition/ChallengeParticipationConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ChallengeParticipationConcept from "./ChallengeParticipationConcept.ts";

Deno.test("ChallengeParticipationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeParticipationConcept(db);

  const userA = freshID() as ID;
  const userB = freshID() as ID;
  const challenge1 = freshID() as ID;
  const challenge2 = freshID() as ID;

  await t.step("[Action]: createInvitation - Successful creation", async () => {
    // **requires** (implicit: no prior invitation for the exact user/challenge, though the concept allows duplicates)
    // **effects** creates a new InvitationDoc; returns the invitation ID.

    const result = await concept.createInvitation({
      challenge: challenge1,
      user: userA,
    });
    assertEquals(typeof result, "object");
    assertEquals("invitation" in result, true, "Should return an invitation ID");

    const invitationId = (result as { invitation: ID }).invitation;
    const foundInvitation = await concept["invitations"].findOne({
      _id: invitationId,
    });
    assertEquals(foundInvitation?.user, userA, "Invitation user should match");
    assertEquals(
      foundInvitation?.challenge,
      challenge1,
      "Invitation challenge should match",
    );

    const userInvitations = await concept._getUserInvitations({ user: userA });
    assertEquals(
      userInvitations.some((inv) => inv.challenge === challenge1),
      true,
      "User A should have an invitation for challenge 1",
    );
  });

  await t.step("[Action]: createInvitation - Multiple invitations", async () => {
    // Test creating multiple invitations, including duplicates (which the current implementation allows)
    const result1 = await concept.createInvitation({
      challenge: challenge1,
      user: userB,
    });
    const result2 = await concept.createInvitation({
      challenge: challenge1,
      user: userA,
    }); // Duplicate, but allowed by current implementation

    assertEquals("invitation" in result1, true);
    assertEquals("invitation" in result2, true);

    const userAInvitations = await concept._getUserInvitations({ user: userA });
    assertEquals(
      userAInvitations.filter((inv) => inv.challenge === challenge1).length,
      2,
      "User A should have two invitations for challenge 1 (due to re-creation)",
    );
    const userBInvitations = await concept._getUserInvitations({ user: userB });
    assertEquals(
      userBInvitations.some((inv) => inv.challenge === challenge1),
      true,
      "User B should have an invitation for challenge 1",
    );
  });

  let invitationIdA: ID;
  let invitationIdB: ID;
  await t.step("[Action]: acceptInvitation - Successful acceptance", async () => {
    // Create an invitation first
    const createResult = await concept.createInvitation({
      challenge: challenge2,
      user: userA,
    });
    assertEquals("invitation" in createResult, true);
    invitationIdA = (createResult as { invitation: ID }).invitation;

    // **requires** invitation must exist
    // **effects** creates a new ParticipationDoc; returns the participation ID.

    const acceptResult = await concept.acceptInvitation({
      invitation: invitationIdA,
    });
    assertEquals(typeof acceptResult, "object");
    assertEquals(
      "participation" in acceptResult,
      true,
      "Should return a participation ID",
    );

    const participationId = (acceptResult as { participation: ID })
      .participation;
    const foundParticipation = await concept["participations"].findOne({
      _id: participationId,
    });
    assertEquals(foundParticipation?.user, userA, "Participation user should match");
    assertEquals(
      foundParticipation?.challenge,
      challenge2,
      "Participation challenge should match",
    );
    assertEquals(foundParticipation?.completed, false, "Participation should not be completed initially");

    const userParticipations = await concept._getUserParticipations({ user: userA });
    assertEquals(
      userParticipations.some((part) => part.challenge === challenge2),
      true,
      "User A should have a participation for challenge 2",
    );

    // Verify invitation still exists (current implementation detail)
    const originalInvitation = await concept["invitations"].findOne({
      _id: invitationIdA,
    });
    assertEquals(originalInvitation?._id, invitationIdA, "Original invitation should still exist");
  });

  await t.step("[Action]: acceptInvitation - Non-existent invitation", async () => {
    const nonExistentInvitation = freshID() as ID;
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
    );
  });

  await t.step("[Action]: removeInvitation - Successful removal", async () => {
    // Create an invitation to remove
    const createResult = await concept.createInvitation({
      challenge: challenge2,
      user: userB,
    });
    assertEquals("invitation" in createResult, true);
    invitationIdB = (createResult as { invitation: ID }).invitation;

    // **requires** invitation must exist
    // **effects** deletes the specified invitation.

    const removeResult = await concept.removeInvitation({
      invitation: invitationIdB,
    });
    assertEquals(typeof removeResult, "object");
    assertEquals(Object.keys(removeResult).length, 0, "Should return an empty object");

    const foundInvitation = await concept["invitations"].findOne({
      _id: invitationIdB,
    });
    assertEquals(foundInvitation, null, "Invitation should be deleted");

    const userBInvitations = await concept._getUserInvitations({ user: userB });
    assertEquals(
      userBInvitations.some((inv) => inv.challenge === challenge2),
      false,
      "User B should no longer have an invitation for challenge 2",
    );
  });

  await t.step("[Action]: removeInvitation - Non-existent invitation", async () => {
    const nonExistentInvitation = freshID() as ID;
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
    );
  });

  let participationIdC: ID;
  await t.step("[Action]: removeParticipation - Successful removal", async () => {
    // Create invitation and accept to get a participation
    const createInvResult = await concept.createInvitation({
      challenge: challenge1,
      user: userB,
    });
    const invId = (createInvResult as { invitation: ID }).invitation;
    const acceptPartResult = await concept.acceptInvitation({ invitation: invId });
    participationIdC = (acceptPartResult as { participation: ID }).participation;

    // **requires** participation must exist
    // **effects** deletes the specified participation.

    const removeResult = await concept.removeParticipation({
      participation: participationIdC,
    });
    assertEquals(typeof removeResult, "object");
    assertEquals(Object.keys(removeResult).length, 0, "Should return an empty object");

    const foundParticipation = await concept["participations"].findOne({
      _id: participationIdC,
    });
    assertEquals(foundParticipation, null, "Participation should be deleted");

    const userBParticipations = await concept._getUserParticipations({ user: userB });
    assertEquals(
      userBParticipations.some((part) => part.challenge === challenge1),
      false,
      "User B should no longer have a participation for challenge 1",
    );
  });

  await t.step("[Action]: removeParticipation - Non-existent participation", async () => {
    const nonExistentParticipation = freshID() as ID;
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
    );
  });

  let participationIdD: ID;
  await t.step("[Action]: completeChallenge - Successful completion", async () => {
    // Create and accept an invitation
    const createInvResult = await concept.createInvitation({
      challenge: challenge2,
      user: userB,
    });
    const invId = (createInvResult as { invitation: ID }).invitation;
    const acceptPartResult = await concept.acceptInvitation({ invitation: invId });
    participationIdD = (acceptPartResult as { participation: ID }).participation;

    // **requires** participation must exist
    // **effects** updates the `completed` status of the specified participation to `true`.

    const completeResult = await concept.completeChallenge({
      participation: participationIdD,
    });
    assertEquals(typeof completeResult, "object");
    assertEquals(Object.keys(completeResult).length, 0, "Should return an empty object");

    const foundParticipation = await concept["participations"].findOne({
      _id: participationIdD,
    });
    assertEquals(foundParticipation?.completed, true, "Participation should be marked as completed");
  });

  await t.step("[Action]: completeChallenge - Non-existent participation", async () => {
    const nonExistentParticipation = freshID() as ID;
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
    );
  });

  await t.step("[Query]: _getChallengeParticipants", async () => {
    const participants = await concept._getChallengeParticipants({
      challenge: challenge1,
    });
    // User A created an invitation, then accepted it for challenge2, but not challenge1 directly.
    // User A also has two invitations to challenge 1. User B had one invitation to challenge 1.
    // A participation for challenge 1 was created for user B and then removed.
    // Let's re-establish some participations for clearer testing.

    await concept["participations"].deleteMany({}); // Clear previous participations
    await concept["invitations"].deleteMany({}); // Clear previous invitations

    // User A participates in challenge 1
    const inv1A = (await concept.createInvitation({ challenge: challenge1, user: userA })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv1A.invitation });

    // User B participates in challenge 1
    const inv1B = (await concept.createInvitation({ challenge: challenge1, user: userB })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv1B.invitation });

    // User A participates in challenge 2
    const inv2A = (await concept.createInvitation({ challenge: challenge2, user: userA })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv2A.invitation });

    const c1Participants = await concept._getChallengeParticipants({ challenge: challenge1 });
    assertEquals(c1Participants.length, 2, "Challenge 1 should have 2 participants");
    assertEquals(
      c1Participants.some((p) => p.user === userA),
      true,
      "User A should be a participant in challenge 1",
    );
    assertEquals(
      c1Participants.some((p) => p.user === userB),
      true,
      "User B should be a participant in challenge 1",
    );

    const c2Participants = await concept._getChallengeParticipants({ challenge: challenge2 });
    assertEquals(c2Participants.length, 1, "Challenge 2 should have 1 participant");
    assertEquals(
      c2Participants.some((p) => p.user === userA),
      true,
      "User A should be a participant in challenge 2",
    );

    const nonExistentChallengeParticipants = await concept._getChallengeParticipants({ challenge: freshID() as ID });
    assertEquals(nonExistentChallengeParticipants.length, 0, "Non-existent challenge should have 0 participants");
  });

  await t.step("[Query]: _getChallengeInvitees", async () => {
    await concept["invitations"].deleteMany({}); // Clear previous invitations
    await concept["participations"].deleteMany({}); // Clear previous participations

    // Invite User A to Challenge 1
    await concept.createInvitation({ challenge: challenge1, user: userA });
    // Invite User B to Challenge 1
    await concept.createInvitation({ challenge: challenge1, user: userB });
    // Invite User A to Challenge 2
    await concept.createInvitation({ challenge: challenge2, user: userA });

    const c1Invitees = await concept._getChallengeInvitees({ challenge: challenge1 });
    assertEquals(c1Invitees.length, 2, "Challenge 1 should have 2 invitees");
    assertEquals(
      c1Invitees.some((i) => i.user === userA),
      true,
      "User A should be an invitee for challenge 1",
    );
    assertEquals(
      c1Invitees.some((i) => i.user === userB),
      true,
      "User B should be an invitee for challenge 1",
    );

    const c2Invitees = await concept._getChallengeInvitees({ challenge: challenge2 });
    assertEquals(c2Invitees.length, 1, "Challenge 2 should have 1 invitee");
    assertEquals(
      c2Invitees.some((i) => i.user === userA),
      true,
      "User A should be an invitee for challenge 2",
    );

    const nonExistentChallengeInvitees = await concept._getChallengeInvitees({ challenge: freshID() as ID });
    assertEquals(nonExistentChallengeInvitees.length, 0, "Non-existent challenge should have 0 invitees");
  });

  await t.step("[Query]: _getUserParticipations", async () => {
    await concept["participations"].deleteMany({}); // Clear previous participations
    await concept["invitations"].deleteMany({}); // Clear previous invitations

    // User A participates in Challenge 1
    const inv1A = (await concept.createInvitation({ challenge: challenge1, user: userA })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv1A.invitation });

    // User A participates in Challenge 2
    const inv2A = (await concept.createInvitation({ challenge: challenge2, user: userA })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv2A.invitation });

    // User B participates in Challenge 1
    const inv1B = (await concept.createInvitation({ challenge: challenge1, user: userB })) as { invitation: ID };
    await concept.acceptInvitation({ invitation: inv1B.invitation });

    const userAParticipations = await concept._getUserParticipations({ user: userA });
    assertEquals(userAParticipations.length, 2, "User A should have 2 participations");
    assertEquals(
      userAParticipations.some((p) => p.challenge === challenge1),
      true,
      "User A should participate in challenge 1",
    );
    assertEquals(
      userAParticipations.some((p) => p.challenge === challenge2),
      true,
      "User A should participate in challenge 2",
    );

    const userBParticipations = await concept._getUserParticipations({ user: userB });
    assertEquals(userBParticipations.length, 1, "User B should have 1 participation");
    assertEquals(
      userBParticipations.some((p) => p.challenge === challenge1),
      true,
      "User B should participate in challenge 1",
    );

    const nonExistentUserParticipations = await concept._getUserParticipations({ user: freshID() as ID });
    assertEquals(nonExistentUserParticipations.length, 0, "Non-existent user should have 0 participations");
  });

  await t.step("[Query]: _getUserInvitations", async () => {
    await concept["invitations"].deleteMany({}); // Clear previous invitations
    await concept["participations"].deleteMany({}); // Clear previous participations

    // Invite User A to Challenge 1
    await concept.createInvitation({ challenge: challenge1, user: userA });
    // Invite User A to Challenge 2
    await concept.createInvitation({ challenge: challenge2, user: userA });
    // Invite User B to Challenge 1
    await concept.createInvitation({ challenge: challenge1, user: userB });

    const userAInvitations = await concept._getUserInvitations({ user: userA });
    assertEquals(userAInvitations.length, 2, "User A should have 2 invitations");
    assertEquals(
      userAInvitations.some((i) => i.challenge === challenge1),
      true,
      "User A should be invited to challenge 1",
    );
    assertEquals(
      userAInvitations.some((i) => i.challenge === challenge2),
      true,
      "User A should be invited to challenge 2",
    );

    const userBInvitations = await concept._getUserInvitations({ user: userB });
    assertEquals(userBInvitations.length, 1, "User B should have 1 invitation");
    assertEquals(
      userBInvitations.some((i) => i.challenge === challenge1),
      true,
      "User B should be invited to challenge 1",
    );

    const nonExistentUserInvitations = await concept._getUserInvitations({ user: freshID() as ID });
    assertEquals(nonExistentUserInvitations.length, 0, "Non-existent user should have 0 invitations");
  });

  await t.step("[Trace]: Fulfilling the Principle - User Invitation and Completion", async () => {
    // Principle: If a user invites another user to a challenge, and the invited user accepts,
    // then that user becomes a participant in the challenge and can later mark it as completed.

    await concept["participations"].deleteMany({});
    await concept["invitations"].deleteMany({});

    console.log("\n--- Principle Trace Start ---");

    const inviter = freshID() as ID;
    const invitedUser = freshID() as ID;
    const challenge = freshID() as ID;

    console.log(`Step 1: Inviter (${inviter}) invites Invited User (${invitedUser}) to Challenge (${challenge}).`);
    const createInvResult = await concept.createInvitation({
      challenge: challenge,
      user: invitedUser,
    });
    assertEquals("invitation" in createInvResult, true, "Invitation should be created successfully");
    const invitationId = (createInvResult as { invitation: ID }).invitation;
    console.log(`   - Invitation ID: ${invitationId}`);

    let invitedUserInvitations = await concept._getUserInvitations({ user: invitedUser });
    assertEquals(invitedUserInvitations.length, 1, "Invited user should have 1 invitation");
    assertEquals(
      invitedUserInvitations[0].challenge,
      challenge,
      "Invitation should be for the correct challenge",
    );
    console.log(`   - Verified invited user has the invitation.`);

    console.log(`Step 2: Invited User (${invitedUser}) accepts the invitation (${invitationId}).`);
    const acceptPartResult = await concept.acceptInvitation({
      invitation: invitationId,
    });
    assertEquals("participation" in acceptPartResult, true, "Participation should be created successfully");
    const participationId = (acceptPartResult as { participation: ID }).participation;
    console.log(`   - Participation ID: ${participationId}`);

    let invitedUserParticipations = await concept._getUserParticipations({ user: invitedUser });
    assertEquals(invitedUserParticipations.length, 1, "Invited user should have 1 participation");
    assertEquals(
      invitedUserParticipations[0].challenge,
      challenge,
      "Participation should be for the correct challenge",
    );
    console.log(`   - Verified invited user is now a participant.`);

    let challengeParticipants = await concept._getChallengeParticipants({ challenge: challenge });
    assertEquals(challengeParticipants.length, 1, "Challenge should have 1 participant");
    assertEquals(
      challengeParticipants[0].user,
      invitedUser,
      "Participant should be the invited user",
    );
    console.log(`   - Verified challenge has the invited user as a participant.`);

    let currentParticipationState = await concept["participations"].findOne({ _id: participationId });
    assertEquals(currentParticipationState?.completed, false, "Participation should initially be incomplete");
    console.log(`   - Verified participation is initially not completed.`);

    console.log(`Step 3: Invited User (${invitedUser}) completes the challenge participation (${participationId}).`);
    const completeResult = await concept.completeChallenge({
      participation: participationId,
    });
    assertEquals(Object.keys(completeResult).length, 0, "Challenge completion should return empty object");
    console.log(`   - Challenge marked as complete.`);

    currentParticipationState = await concept["participations"].findOne({ _id: participationId });
    assertEquals(currentParticipationState?.completed, true, "Participation should be marked as completed");
    console.log(`   - Verified participation is now completed.`);

    console.log("--- Principle Trace End ---");
  });

  await client.close();
});
```