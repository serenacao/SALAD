---
timestamp: 'Tue Nov 25 2025 11:13:55 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_111355.d8f5673c.md]]'
content_id: 5b5c05818c591a172ec3519dfa1d4feccf050e595d340a4063961c71c5e81d01
---

# file: src/concepts/ChallengeVerification/ChallengeVerificationConcept.test.ts

```typescript
import {
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import ChallengeVerificationConcept from "./ChallengeProgressConcept.ts"; // Note: file name mismatch with class name, using provided path

Deno.test("ChallengeVerificationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeVerificationConcept(db);

  // Define some constant IDs for testing
  const USER_A: ID = freshID();
  const USER_B: ID = freshID();
  const PART_X: ID = freshID();
  const FILE_Y: ID = freshID();
  const NON_EXISTENT_ID: ID = freshID();

  await t.step("Principle: A user can request verification for a part, and an approver can verify it.", async () => {
    let verificationRequest1: ID;

    await t.step("[Action]: createVerificationRequest", async () => {
      console.log(`Trace: User ${USER_A} requests verification for Part ${PART_X} with evidence ${FILE_Y}, to be approved by ${USER_B}.`);
      const result = await concept.createVerificationRequest({
        part: PART_X,
        requester: USER_A,
        approver: USER_B,
        evidence: FILE_Y,
      });

      assertExists((result as { verificationRequest: ID }).verificationRequest, "Verification request should be created successfully.");
      verificationRequest1 = (result as { verificationRequest: ID }).verificationRequest;
      console.log(`Trace: Verification request ${verificationRequest1} created.`);

      // Verify the initial state in the database
      const requestDetails = await concept._getRequestDetails({ verificationRequests: [verificationRequest1] });
      assertEquals(requestDetails.length, 1, "There should be one request detail.");
      assertObjectMatch(requestDetails[0], {
        part: PART_X,
        requester: USER_A,
        approver: USER_B,
        evidence: FILE_Y,
        approved: false,
      });
      console.log(`Trace: Request ${verificationRequest1} confirmed in DB, not yet approved.`);
    });

    await t.step("[Query]: _getRequesterActiveRequests - User A should have an active request", async () => {
      console.log(`Trace: Querying active requests for requester ${USER_A}.`);
      const requesterActiveRequests = await concept._getRequesterActiveRequests({ user: USER_A });
      assertEquals(requesterActiveRequests.length, 1, "User A should have one active request.");
      assertEquals(requesterActiveRequests[0].verificationRequest, verificationRequest1, "The active request should be the one created.");
      console.log(`Trace: Requester ${USER_A} found to have active request ${verificationRequest1}.`);
    });

    await t.step("[Query]: _getApproverActiveRequests - User B should have an active request awaiting their approval", async () => {
      console.log(`Trace: Querying active requests for approver ${USER_B}.`);
      const approverActiveRequests = await concept._getApproverActiveRequests({ user: USER_B });
      assertEquals(approverActiveRequests.length, 1, "Approver B should have one active request.");
      assertEquals(approverActiveRequests[0].verificationRequest, verificationRequest1, "The active request for approver should be the one created.");
      console.log(`Trace: Approver ${USER_B} found to have active request ${verificationRequest1}.`);
    });
    
    await t.step("[Query]: _isActiveRequest - User A should have an active request (not part-specific)", async () => {
        console.log(`Trace: Checking if user ${USER_A} has an active request for part ${PART_X}.`);
        const isActive = await concept._isActiveRequest({ user: USER_A, part: PART_X });
        assertEquals(isActive.length, 1);
        assertEquals(isActive[0].isRequested, true, "User A should have an active request.");
        console.log(`Trace: Confirmed user ${USER_A} has an active request.`);
    });


    await t.step("[Action]: verify - Approver B verifies the request", async () => {
      console.log(`Trace: Approver ${USER_B} verifies request ${verificationRequest1}.`);
      const result = await concept.verify({ verificationRequest: verificationRequest1 });
      assertEquals(result, {}, "Verification should complete without error.");
      console.log(`Trace: Request ${verificationRequest1} verified successfully.`);

      // Verify state changed in the database
      const requestDetails = await concept._getRequestDetails({ verificationRequests: [verificationRequest1] });
      assertEquals(requestDetails.length, 1, "There should still be one request detail.");
      assertEquals(requestDetails[0].approved, true, "The request should now be approved.");
      console.log(`Trace: Request ${verificationRequest1} confirmed in DB as approved.`);
    });

    await t.step("[Query]: _getRequesterActiveRequests - User A should no longer have an active request", async () => {
      console.log(`Trace: Querying active requests for requester ${USER_A} after verification.`);
      const requesterActiveRequests = await concept._getRequesterActiveRequests({ user: USER_A });
      assertEquals(requesterActiveRequests.length, 0, "User A should have no active requests after verification.");
      console.log(`Trace: Requester ${USER_A} confirmed to have no active requests.`);
    });

    await t.step("[Query]: _getApproverActiveRequests - User B should no longer have an active request awaiting their approval", async () => {
      console.log(`Trace: Querying active requests for approver ${USER_B} after verification.`);
      const approverActiveRequests = await concept._getApproverActiveRequests({ user: USER_B });
      assertEquals(approverActiveRequests.length, 0, "Approver B should have no active requests after verification.");
      console.log(`Trace: Approver ${USER_B} confirmed to have no active requests.`);
    });
    
    await t.step("[Query]: _isActiveRequest - User A should no longer have an active request", async () => {
        console.log(`Trace: Checking if user ${USER_A} has an active request after verification.`);
        const isActive = await concept._isActiveRequest({ user: USER_A, part: PART_X });
        assertEquals(isActive.length, 1);
        assertEquals(isActive[0].isRequested, false, "User A should not have an active request after verification.");
        console.log(`Trace: Confirmed user ${USER_A} has no active request.`);
    });
  });

  await t.step("Action: createVerificationRequest", async (t) => {
    await t.step("Should successfully create a verification request and return its ID", async () => {
      const partId: ID = freshID();
      const requesterId: ID = freshID();
      const approverId: ID = freshID();
      const evidenceId: ID = freshID();

      console.log(`Trace: Creating request for part ${partId}, requester ${requesterId}, approver ${approverId}, evidence ${evidenceId}.`);
      const result = await concept.createVerificationRequest({
        part: partId,
        requester: requesterId,
        approver: approverId,
        evidence: evidenceId,
      });

      assertExists((result as { verificationRequest: ID }).verificationRequest, "The result should contain the verificationRequest ID.");
      const newRequestId: ID = (result as { verificationRequest: ID }).verificationRequest;
      console.log(`Trace: Request created with ID: ${newRequestId}.`);

      // Verify the document was inserted correctly
      const collection = db.collection("ChallengeVerification.VerificationRequests");
      const doc = await collection.findOne({ _id: newRequestId });
      assertExists(doc, "The verification request document should exist in the database.");
      assertObjectMatch(doc, {
        _id: newRequestId,
        part: partId,
        requester: requesterId,
        approver: approverId,
        evidence: evidenceId,
        approved: false,
      }, "The inserted document should match the provided details and be unapproved initially.");
      console.log("Trace: Document verified in DB with correct fields and initial 'approved: false'.");
    });
  });

  await t.step("Action: removeVerificationRequest", async (t) => {
    let testRequestId: ID;
    const requesterId: ID = freshID();
    const approverId: ID = freshID();
    const partId: ID = freshID();
    const evidenceId: ID = freshID();

    await t.step("Setup: Create a request to be removed", async () => {
      const createResult = await concept.createVerificationRequest({
        part: partId,
        requester: requesterId,
        approver: approverId,
        evidence: evidenceId,
      });
      testRequestId = (createResult as { verificationRequest: ID }).verificationRequest;
      assertExists(testRequestId, "Setup: Request should be created successfully.");
      console.log(`Trace: Setup: Created request ${testRequestId} for removal.`);
    });

    await t.step("Should successfully remove an existing verification request", async () => {
      console.log(`Trace: Attempting to remove request ${testRequestId}.`);
      const removeResult = await concept.removeVerificationRequest({ verificationRequest: testRequestId });
      assertEquals(removeResult, {}, "Removal should return an empty object on success.");
      console.log(`Trace: Request ${testRequestId} removed successfully.`);

      // Verify the document is gone
      const collection = db.collection("ChallengeVerification.VerificationRequests");
      const doc = await collection.findOne({ _id: testRequestId });
      assertEquals(doc, null, "The verification request document should no longer exist in the database.");
      console.log("Trace: Document confirmed as removed from DB.");
    });

    await t.step("Should return an error if the verification request does not exist", async () => {
      console.log(`Trace: Attempting to remove non-existent request ${NON_EXISTENT_ID}.`);
      const errorResult = await concept.removeVerificationRequest({ verificationRequest: NON_EXISTENT_ID });
      assertObjectMatch(errorResult, { error: "Verification request does not exist" }, "Should return an error for a non-existent request.");
      console.log(`Trace: Correctly returned error for non-existent request.`);
    });
  });

  await t.step("Action: verify", async (t) => {
    let testRequestId: ID;
    const requesterId: ID = freshID();
    const approverId: ID = freshID();
    const partId: ID = freshID();
    const evidenceId: ID = freshID();

    await t.step("Setup: Create an unapproved request", async () => {
      const createResult = await concept.createVerificationRequest({
        part: partId,
        requester: requesterId,
        approver: approverId,
        evidence: evidenceId,
      });
      testRequestId = (createResult as { verificationRequest: ID }).verificationRequest;
      assertExists(testRequestId, "Setup: Request should be created successfully.");
      console.log(`Trace: Setup: Created unapproved request ${testRequestId} for verification.`);
    });

    await t.step("Should successfully mark an existing verification request as approved", async () => {
      console.log(`Trace: Attempting to verify request ${testRequestId}.`);
      const verifyResult = await concept.verify({ verificationRequest: testRequestId });
      assertEquals(verifyResult, {}, "Verification should return an empty object on success.");
      console.log(`Trace: Request ${testRequestId} verified successfully.`);

      // Verify the 'approved' field is true
      const collection = db.collection("ChallengeVerification.VerificationRequests");
      const doc = await collection.findOne({ _id: testRequestId });
      assertExists(doc, "The verification request document should still exist.");
      assertEquals(doc.approved, true, "The 'approved' field should be true after verification.");
      console.log("Trace: Document confirmed in DB with 'approved: true'.");
    });

    await t.step("Should return an error if the verification request does not exist", async () => {
      console.log(`Trace: Attempting to verify non-existent request ${NON_EXISTENT_ID}.`);
      const errorResult = await concept.verify({ verificationRequest: NON_EXISTENT_ID });
      assertObjectMatch(errorResult, { error: "Verification request does not exist" }, "Should return an error for a non-existent request.");
      console.log(`Trace: Correctly returned error for non-existent request.`);
    });
  });

  await t.step("Query: _getRequestApprover", async (t) => {
    const requesterId: ID = freshID();
    const approverId: ID = freshID();
    const partId: ID = freshID();
    const evidenceId: ID = freshID();
    let testRequestId: ID;

    await t.step("Setup: Create a request", async () => {
      const createResult = await concept.createVerificationRequest({
        part: partId,
        requester: requesterId,
        approver: approverId,
        evidence: evidenceId,
      });
      testRequestId = (createResult as { verificationRequest: ID }).verificationRequest;
      console.log(`Trace: Setup: Created request ${testRequestId}.`);
    });

    await t.step("Should return the approver for an existing request", async () => {
      console.log(`Trace: Getting approver for request ${testRequestId}.`);
      const result = await concept._getRequestApprover({ verificationRequest: testRequestId });
      assertEquals(result.length, 1, "Should return one approver.");
      assertEquals(result[0].approver, approverId, "The returned approver should match the one assigned.");
      console.log(`Trace: Approver ${approverId} found for request ${testRequestId}.`);
    });

    await t.step("Should return an empty array for a non-existent request", async () => {
      console.log(`Trace: Getting approver for non-existent request ${NON_EXISTENT_ID}.`);
      const result = await concept._getRequestApprover({ verificationRequest: NON_EXISTENT_ID });
      assertEquals(result.length, 0, "Should return an empty array for a non-existent request.");
      console.log(`Trace: Correctly returned empty array for non-existent request.`);
    });
  });

  await t.step("Query: _getRequestDetails", async (t) => {
    const r1: ID = freshID();
    const r2: ID = freshID();
    const a1: ID = freshID();
    const a2: ID = freshID();
    const p1: ID = freshID();
    const p2: ID = freshID();
    const e1: ID = freshID();
    const e2: ID = freshID();
    let reqId1: ID, reqId2: ID;

    await t.step("Setup: Create multiple requests", async () => {
      const createResult1 = await concept.createVerificationRequest({ part: p1, requester: r1, approver: a1, evidence: e1 });
      const createResult2 = await concept.createVerificationRequest({ part: p2, requester: r2, approver: a2, evidence: e2 });
      reqId1 = (createResult1 as { verificationRequest: ID }).verificationRequest;
      reqId2 = (createResult2 as { verificationRequest: ID }).verificationRequest;
      await concept.verify({ verificationRequest: reqId2 }); // Approve one request
      console.log(`Trace: Setup: Created request ${reqId1} (unapproved) and ${reqId2} (approved).`);
    });

    await t.step("Should return details for existing requests", async () => {
      console.log(`Trace: Getting details for requests [${reqId1}, ${reqId2}].`);
      const results = await concept._getRequestDetails({ verificationRequests: [reqId1, reqId2] });
      assertEquals(results.length, 2, "Should return details for two requests.");

      const result1 = results.find(d => d.requester === r1);
      const result2 = results.find(d => d.requester === r2);

      assertExists(result1, "Details for request 1 should exist.");
      assertObjectMatch(result1, { part: p1, requester: r1, approver: a1, evidence: e1, approved: false });
      assertExists(result2, "Details for request 2 should exist.");
      assertObjectMatch(result2, { part: p2, requester: r2, approver: a2, evidence: e2, approved: true });
      console.log("Trace: Details for both requests retrieved correctly, including approval status.");
    });

    await t.step("Should handle a mix of existing and non-existent requests", async () => {
      console.log(`Trace: Getting details for requests [${reqId1}, ${NON_EXISTENT_ID}].`);
      const results = await concept._getRequestDetails({ verificationRequests: [reqId1, NON_EXISTENT_ID] });
      assertEquals(results.length, 1, "Should return details only for the existing request.");
      assertObjectMatch(results[0], { part: p1, requester: r1, approver: a1, evidence: e1, approved: false });
      console.log("Trace: Only details for existing request returned, non-existent ignored.");
    });

    await t.step("Should return an empty array for no requests or only non-existent requests", async () => {
      console.log("Trace: Getting details for an empty array.");
      let results = await concept._getRequestDetails({ verificationRequests: [] });
      assertEquals(results.length, 0, "Should return an empty array for an empty input.");
      console.log("Trace: Empty array returned for empty input.");

      console.log(`Trace: Getting details for only non-existent requests [${NON_EXISTENT_ID}].`);
      results = await concept._getRequestDetails({ verificationRequests: [NON_EXISTENT_ID] });
      assertEquals(results.length, 0, "Should return an empty array for only non-existent inputs.");
      console.log("Trace: Empty array returned for only non-existent inputs.");
    });
  });

  await t.step("Query: _getRequesterActiveRequests", async (t) => {
    const user1: ID = freshID();
    const user2: ID = freshID();
    const approver: ID = freshID();
    let reqId1: ID, reqId2: ID, reqId3: ID;

    await t.step("Setup: Create multiple requests for different users and statuses", async () => {
      // User 1: two active requests
      const createResult1 = await concept.createVerificationRequest({ part: freshID(), requester: user1, approver: approver, evidence: freshID() });
      const createResult2 = await concept.createVerificationRequest({ part: freshID(), requester: user1, approver: approver, evidence: freshID() });
      reqId1 = (createResult1 as { verificationRequest: ID }).verificationRequest;
      reqId2 = (createResult2 as { verificationRequest: ID }).verificationRequest;

      // User 1: one approved request (should not be active)
      const createResultApproved = await concept.createVerificationRequest({ part: freshID(), requester: user1, approver: approver, evidence: freshID() });
      const reqIdApproved = (createResultApproved as { verificationRequest: ID }).verificationRequest;
      await concept.verify({ verificationRequest: reqIdApproved });

      // User 2: one active request
      const createResult3 = await concept.createVerificationRequest({ part: freshID(), requester: user2, approver: approver, evidence: freshID() });
      reqId3 = (createResult3 as { verificationRequest: ID }).verificationRequest;

      console.log(`Trace: Setup: User ${user1} has active requests [${reqId1}, ${reqId2}] and an approved request ${reqIdApproved}. User ${user2} has active request ${reqId3}.`);
    });

    await t.step("Should return all active requests for a user", async () => {
      console.log(`Trace: Getting active requests for user ${user1}.`);
      const activeRequests = await concept._getRequesterActiveRequests({ user: user1 });
      assertEquals(activeRequests.length, 2, "User 1 should have two active requests.");
      const returnedIds = activeRequests.map(r => r.verificationRequest).sort();
      assertEquals(returnedIds, [reqId1, reqId2].sort(), "The returned requests should match the active ones created for user 1.");
      console.log(`Trace: User ${user1} correctly returned active requests.`);
    });

    await t.step("Should return a single active request for another user", async () => {
      console.log(`Trace: Getting active requests for user ${user2}.`);
      const activeRequests = await concept._getRequesterActiveRequests({ user: user2 });
      assertEquals(activeRequests.length, 1, "User 2 should have one active request.");
      assertEquals(activeRequests[0].verificationRequest, reqId3, "The returned request should match the active one for user 2.");
      console.log(`Trace: User ${user2} correctly returned active request.`);
    });

    await t.step("Should return an empty array for a user with no active requests", async () => {
      console.log(`Trace: Getting active requests for non-existent user ${NON_EXISTENT_ID}.`);
      const activeRequests = await concept._getRequesterActiveRequests({ user: NON_EXISTENT_ID });
      assertEquals(activeRequests.length, 0, "Non-existent user should have no active requests.");
      console.log(`Trace: Non-existent user correctly returned no active requests.`);
    });
  });

  await t.step("Query: _getApproverActiveRequests", async (t) => {
    const requester1: ID = freshID();
    const requester2: ID = freshID();
    const approver1: ID = freshID();
    const approver2: ID = freshID();
    let reqIdA1: ID, reqIdA2: ID, reqIdA3: ID;

    await t.step("Setup: Create multiple requests for different approvers and statuses", async () => {
      // Approver 1: two active requests
      const createResult1 = await concept.createVerificationRequest({ part: freshID(), requester: requester1, approver: approver1, evidence: freshID() });
      const createResult2 = await concept.createVerificationRequest({ part: freshID(), requester: requester2, approver: approver1, evidence: freshID() });
      reqIdA1 = (createResult1 as { verificationRequest: ID }).verificationRequest;
      reqIdA2 = (createResult2 as { verificationRequest: ID }).verificationRequest;

      // Approver 1: one approved request (should not be active)
      const createResultApproved = await concept.createVerificationRequest({ part: freshID(), requester: requester1, approver: approver1, evidence: freshID() });
      const reqIdApproved = (createResultApproved as { verificationRequest: ID }).verificationRequest;
      await concept.verify({ verificationRequest: reqIdApproved });

      // Approver 2: one active request
      const createResult3 = await concept.createVerificationRequest({ part: freshID(), requester: requester2, approver: approver2, evidence: freshID() });
      reqIdA3 = (createResult3 as { verificationRequest: ID }).verificationRequest;

      console.log(`Trace: Setup: Approver ${approver1} has active requests [${reqIdA1}, ${reqIdA2}] and an approved request ${reqIdApproved}. Approver ${approver2} has active request ${reqIdA3}.`);
    });

    await t.step("Should return all active requests for an approver", async () => {
      console.log(`Trace: Getting active requests for approver ${approver1}.`);
      const activeRequests = await concept._getApproverActiveRequests({ user: approver1 });
      assertEquals(activeRequests.length, 2, "Approver 1 should have two active requests.");
      const returnedIds = activeRequests.map(r => r.verificationRequest).sort();
      assertEquals(returnedIds, [reqIdA1, reqIdA2].sort(), "The returned requests should match the active ones for approver 1.");
      console.log(`Trace: Approver ${approver1} correctly returned active requests.`);
    });

    await t.step("Should return a single active request for another approver", async () => {
      console.log(`Trace: Getting active requests for approver ${approver2}.`);
      const activeRequests = await concept._getApproverActiveRequests({ user: approver2 });
      assertEquals(activeRequests.length, 1, "Approver 2 should have one active request.");
      assertEquals(activeRequests[0].verificationRequest, reqIdA3, "The returned request should match the active one for approver 2.");
      console.log(`Trace: Approver ${approver2} correctly returned active request.`);
    });

    await t.step("Should return an empty array for an approver with no active requests", async () => {
      console.log(`Trace: Getting active requests for non-existent approver ${NON_EXISTENT_ID}.`);
      const activeRequests = await concept._getApproverActiveRequests({ user: NON_EXISTENT_ID });
      assertEquals(activeRequests.length, 0, "Non-existent approver should have no active requests.");
      console.log(`Trace: Non-existent approver correctly returned no active requests.`);
    });
  });

  await t.step("Query: _isActiveRequest", async (t) => {
    const user1: ID = freshID();
    const user2: ID = freshID();
    const part1: ID = freshID();
    const part2: ID = freshID();
    const approver: ID = freshID();
    let reqIdActive: ID;

    await t.step("Setup: Create an active request for user1/part1 and an approved one", async () => {
      const createResultActive = await concept.createVerificationRequest({ part: part1, requester: user1, approver: approver, evidence: freshID() });
      reqIdActive = (createResultActive as { verificationRequest: ID }).verificationRequest;
      
      const createResultApproved = await concept.createVerificationRequest({ part: part2, requester: user1, approver: approver, evidence: freshID() });
      const reqIdApproved = (createResultApproved as { verificationRequest: ID }).verificationRequest;
      await concept.verify({ verificationRequest: reqIdApproved });
      
      // Also create an active request for a different part for user1, to test behavior.
      await concept.createVerificationRequest({ part: freshID(), requester: user1, approver: approver, evidence: freshID() });

      console.log(`Trace: Setup: User ${user1} has an active request ${reqIdActive} for part ${part1}, and another active request for a different part. Also, an approved request for part ${part2}.`);
    });

    await t.step("Should return true if the user has any active (unapproved) request (regardless of the specific part input)", async () => {
      // The current implementation checks if *any* request for the user is active, not specific to the part.
      console.log(`Trace: Checking if user ${user1} has an active request for part ${part1} (should be true due to any active request).`);
      let result = await concept._isActiveRequest({ user: user1, part: part1 });
      assertEquals(result.length, 1);
      assertEquals(result[0].isRequested, true, "User 1 should have an active request.");
      console.log("Trace: Confirmed active status for user1.");

      console.log(`Trace: Checking if user ${user1} has an active request for non-associated part ${freshID()} (should still be true).`);
      result = await concept._isActiveRequest({ user: user1, part: freshID() }); // Check with a different part ID
      assertEquals(result.length, 1);
      assertEquals(result[0].isRequested, true, "User 1 should still have an active request even for a different part, as long as one exists.");
      console.log("Trace: Confirmed active status for user1 even with unrelated part ID.");
    });

    await t.step("Should return false if the user has no active requests", async () => {
      console.log(`Trace: Checking if user ${user2} has an active request.`);
      const result = await concept._isActiveRequest({ user: user2, part: part1 });
      assertEquals(result.length, 1);
      assertEquals(result[0].isRequested, false, "User 2 should not have an active request.");
      console.log("Trace: Confirmed inactive status for user2.");

      // Verify for a user who only has approved requests
      const userWithOnlyApproved: ID = freshID();
      const createResultOnlyApproved = await concept.createVerificationRequest({ part: freshID(), requester: userWithOnlyApproved, approver: approver, evidence: freshID() });
      await concept.verify({ verificationRequest: (createResultOnlyApproved as { verificationRequest: ID }).verificationRequest });
      console.log(`Trace: Checking if user ${userWithOnlyApproved} has an active request (should be false).`);
      const resultOnlyApproved = await concept._isActiveRequest({ user: userWithOnlyApproved, part: freshID() });
      assertEquals(resultOnlyApproved.length, 1);
      assertEquals(resultOnlyApproved[0].isRequested, false, "User with only approved requests should not show as having an active request.");
      console.log("Trace: Confirmed inactive status for user with only approved requests.");
    });
  });

  await client.close();
});
```
