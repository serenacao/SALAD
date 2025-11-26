---
timestamp: 'Tue Nov 25 2025 10:05:18 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251125_100518.bbe073d5.md]]'
content_id: 6809eee583f7034eaa927f4b338d77dc0698dd7451006b4dc556598b2d597005
---

# response:

```typescript
// src/concepts/ChallengeVerification/ChallengeVerificationConcept.test.ts
import { Collection, Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";
import ChallengeVerificationConcept from "./ChallengeVerificationConcept.ts";

// Generic types of this concept (re-declared for clarity in test scope)
type User = ID;
type Part = ID;
type File = ID;
type VerificationRequest = ID;

interface VerificationRequestDoc {
  _id: VerificationRequest;
  evidence: File;
  requester: User;
  approver: User;
  part: Part;
  approved: boolean;
}

Deno.test("ChallengeVerificationConcept", async (t) => {
  let db: Db;
  let client: MongoClient;
  let concept: ChallengeVerificationConcept;
  let verificationRequestsCollection: Collection<VerificationRequestDoc>;

  // Constants for testing
  const MOCK_USER_REQUESTER: User = freshID() as User;
  const MOCK_USER_APPROVER: User = freshID() as User;
  const MOCK_PART: Part = freshID() as Part;
  const MOCK_EVIDENCE: File = freshID() as File;

  // Setup/teardown for each test step
  Deno.test.beforeEach(async () => {
    [db, client] = await testDb();
    concept = new ChallengeVerificationConcept(db);
    // Directly access the collection for internal state verification, using the prefixed name
    verificationRequestsCollection = db.collection("ChallengeVerification.VerificationRequests");
  });

  Deno.test.afterEach(async () => {
    await client.close();
  });

  await t.step("Action: createVerificationRequest", async (t) => {
    await t.step("Should successfully create a new verification request", async () => {
      console.log("Trace: Attempting to create a verification request.");
      const result = await concept.createVerificationRequest({
        part: MOCK_PART,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });

      // Confirm 'requires' (inputs are valid, no error expected) and 'effects' (returns ID)
      if ("error" in result) {
        throw new Error(`Creation failed with error: ${result.error}`);
      }
      const newVerificationRequestId: VerificationRequest = result.verificationRequest;
      console.log(`- Created verification request with ID: ${newVerificationRequestId}`);

      // Confirm 'effects': Check if the document exists in the database with correct initial state
      const doc = await verificationRequestsCollection.findOne({ _id: newVerificationRequestId });
      assertEquals(doc?._id, newVerificationRequestId, "The created request should exist in the database.");
      assertEquals(doc?.part, MOCK_PART, "Part should match.");
      assertEquals(doc?.requester, MOCK_USER_REQUESTER, "Requester should match.");
      assertEquals(doc?.approver, MOCK_USER_APPROVER, "Approver should match.");
      assertEquals(doc?.evidence, MOCK_EVIDENCE, "Evidence should match.");
      assertEquals(doc?.approved, false, "Request should initially be unapproved.");
      console.log("- Verified request details and initial 'approved: false' status in the database.");
    });
  });

  await t.step("Action: verify", async (t) => {
    let createdRequestId: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create a request to be verified in subsequent tests
      const createResult = await concept.createVerificationRequest({
        part: MOCK_PART,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult) throw new Error("Setup failed: Could not create verification request.");
      createdRequestId = createResult.verificationRequest;
      console.log(`Setup: Created request ${createdRequestId} (initially unapproved) for verification tests.`);
    });

    await t.step("Should successfully approve an existing verification request", async () => {
      console.log(`Trace: Attempting to verify request ${createdRequestId}.`);
      const result: Empty | { error: string } = await concept.verify({ verificationRequest: createdRequestId });

      // Confirm 'effects': Returns empty object on success
      if ("error" in result) {
        throw new Error(`Verification failed with error: ${result.error}`);
      }
      assertEquals(Object.keys(result).length, 0, "Verify should return an empty object on success.");
      console.log("- Verified returned empty object.");

      // Confirm 'effects': Check if the document's 'approved' field is true
      const doc = await verificationRequestsCollection.findOne({ _id: createdRequestId });
      assertEquals(doc?.approved, true, "The request should now be approved.");
      console.log("- Verified request 'approved' status updated to 'true' in the database.");
    });

    await t.step("Should return an error for a non-existent verification request", async () => {
      const nonExistentId: VerificationRequest = freshID() as VerificationRequest;
      console.log(`Trace: Attempting to verify a non-existent request: ${nonExistentId}.`);
      const result: Empty | { error: string } = await concept.verify({ verificationRequest: nonExistentId });

      // Confirm 'requires': Should return an error if request does not exist
      if (!("error" in result)) {
        throw new Error("Verification of non-existent request should have returned an error.");
      }
      assertEquals(result.error, "Verification request does not exist", "Error message should match expectation for non-existent request.");
      console.log("- Verified that an error was returned for a non-existent request.");
    });
  });

  await t.step("Action: removeVerificationRequest", async (t) => {
    let createdRequestId: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create a request to be removed in subsequent tests
      const createResult = await concept.createVerificationRequest({
        part: MOCK_PART,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult) throw new Error("Setup failed: Could not create verification request.");
      createdRequestId = createResult.verificationRequest;
      console.log(`Setup: Created request ${createdRequestId} for removal tests.`);
    });

    await t.step("Should successfully remove an existing verification request", async () => {
      console.log(`Trace: Attempting to remove request ${createdRequestId}.`);
      const result: Empty | { error: string } = await concept.removeVerificationRequest({ verificationRequest: createdRequestId });

      // Confirm 'effects': Returns empty object on success
      if ("error" in result) {
        throw new Error(`Removal failed with error: ${result.error}`);
      }
      assertEquals(Object.keys(result).length, 0, "Remove should return an empty object on success.");
      console.log("- Verified returned empty object.");

      // Confirm 'effects': Check if the document no longer exists in the database
      const doc = await verificationRequestsCollection.findOne({ _id: createdRequestId });
      assertEquals(doc, null, "The request should no longer exist in the database after removal.");
      console.log("- Verified request is absent from the database.");
    });

    await t.step("Should return an error for a non-existent verification request", async () => {
      const nonExistentId: VerificationRequest = freshID() as VerificationRequest;
      console.log(`Trace: Attempting to remove a non-existent request: ${nonExistentId}.`);
      const result: Empty | { error: string } = await concept.removeVerificationRequest({ verificationRequest: nonExistentId });

      // Confirm 'requires': Should return an error if request does not exist
      if (!("error" in result)) {
        throw new Error("Removal of non-existent request should have returned an error.");
      }
      assertEquals(result.error, "Verification request does not exist", "Error message should match expectation for non-existent request.");
      console.log("- Verified that an error was returned for a non-existent request.");
    });
  });

  await t.step("Query: _getRequestApprover", async (t) => {
    let createdRequestId: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create a request to query its approver
      const createResult = await concept.createVerificationRequest({
        part: MOCK_PART,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult) throw new Error("Setup failed: Could not create verification request.");
      createdRequestId = createResult.verificationRequest;
      console.log(`Setup: Created request ${createdRequestId} with approver ${MOCK_USER_APPROVER} for query tests.`);
    });

    await t.step("Should return the approver for an existing request", async () => {
      console.log(`Trace: Querying approver for request ${createdRequestId}.`);
      const result = await concept._getRequestApprover({ verificationRequest: createdRequestId });

      assertEquals(result.length, 1, "Should return exactly one approver.");
      assertEquals(result[0].approver, MOCK_USER_APPROVER, "Approver should match the created request's approver.");
      console.log("- Verified approver matches the expected user.");
    });

    await t.step("Should return an empty array for a non-existent request", async () => {
      const nonExistentId: VerificationRequest = freshID() as VerificationRequest;
      console.log(`Trace: Querying approver for non-existent request ${nonExistentId}.`);
      const result = await concept._getRequestApprover({ verificationRequest: nonExistentId });

      assertEquals(result.length, 0, "Should return an empty array for a non-existent request.");
      console.log("- Verified empty array for non-existent request.");
    });
  });

  await t.step("Query: _getRequestDetails", async (t) => {
    const MOCK_PART_2: Part = freshID() as Part;
    const MOCK_USER_REQUESTER_2: User = freshID() as User;
    const MOCK_USER_APPROVER_2: User = freshID() as User;

    let requestId1: VerificationRequest;
    let requestId2: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create two requests, one approved, one unapproved
      const createResult1 = await concept.createVerificationRequest({
        part: MOCK_PART,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult1) throw new Error("Setup failed.");
      requestId1 = createResult1.verificationRequest;
      await concept.verify({ verificationRequest: requestId1 }); // Approve the first request

      const createResult2 = await concept.createVerificationRequest({
        part: MOCK_PART_2,
        requester: MOCK_USER_REQUESTER_2,
        approver: MOCK_USER_APPROVER_2,
        evidence: freshID() as File,
      });
      if ("error" in createResult2) throw new Error("Setup failed.");
      requestId2 = createResult2.verificationRequest; // This one remains unapproved

      console.log(`Setup: Created requests ${requestId1} (approved) and ${requestId2} (unapproved).`);
    });

    await t.step("Should return details for multiple existing requests", async () => {
      console.log(`Trace: Querying details for requests: [${requestId1}, ${requestId2}].`);
      const result = await concept._getRequestDetails({ verificationRequests: [requestId1, requestId2] });

      assertEquals(result.length, 2, "Should return details for both requests.");
      assertObjectMatch(result[0], {
        part: MOCK_PART,
        approver: MOCK_USER_APPROVER,
        requester: MOCK_USER_REQUESTER,
        approved: true, // requestId1 was approved in beforeEach
      }, "Details for first (approved) request should match.");
      assertObjectMatch(result[1], {
        part: MOCK_PART_2,
        approver: MOCK_USER_APPROVER_2,
        requester: MOCK_USER_REQUESTER_2,
        approved: false, // requestId2 remains unapproved
      }, "Details for second (unapproved) request should match.");
      console.log("- Verified details for multiple requests, including their approval status.");
    });

    await t.step("Should handle a mix of existing and non-existent requests", async () => {
      const nonExistentId: VerificationRequest = freshID() as VerificationRequest;
      console.log(`Trace: Querying details for requests: [${requestId1}, ${nonExistentId}].`);
      const result = await concept._getRequestDetails({ verificationRequests: [requestId1, nonExistentId] });

      assertEquals(result.length, 1, "Should return details only for the existing request, skipping non-existent ones.");
      assertObjectMatch(result[0], {
        part: MOCK_PART,
        approver: MOCK_USER_APPROVER,
        requester: MOCK_USER_REQUESTER,
        approved: true,
      }, "Details for the existing request should match.");
      console.log("- Verified handling of mixed existing and non-existent requests, non-existent ones are ignored.");
    });

    await t.step("Should return an empty array for an empty input array", async () => {
      console.log("Trace: Querying details for an empty array of requests.");
      const result = await concept._getRequestDetails({ verificationRequests: [] });
      assertEquals(result.length, 0, "Should return an empty array when no requests are provided.");
      console.log("- Verified empty array for empty input.");
    });
  });

  await t.step("Query: _getRequesterActiveRequests", async (t) => {
    const MOCK_USER_REQUESTER_ACTIVE: User = freshID() as User;
    const MOCK_USER_REQUESTER_INACTIVE: User = freshID() as User; // Has approved requests
    const MOCK_USER_REQUESTER_NO_REQUESTS: User = freshID() as User;

    let activeRequestId1: VerificationRequest;
    let activeRequestId2: VerificationRequest;
    let approvedRequestId: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create requests for different scenarios
      // 1. Requester with active (unapproved) requests
      const createResult1 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER_ACTIVE,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult1) throw new Error("Setup failed.");
      activeRequestId1 = createResult1.verificationRequest;

      const createResult2 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER_ACTIVE,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult2) throw new Error("Setup failed.");
      activeRequestId2 = createResult2.verificationRequest;

      // 2. Requester with an approved request (should not be considered 'active')
      const createResult3 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER_INACTIVE,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult3) throw new Error("Setup failed.");
      approvedRequestId = createResult3.verificationRequest;
      await concept.verify({ verificationRequest: approvedRequestId });

      console.log(`Setup: Active requests for ${MOCK_USER_REQUESTER_ACTIVE}: [${activeRequestId1}, ${activeRequestId2}].`);
      console.log(`Setup: Approved request for ${MOCK_USER_REQUESTER_INACTIVE}: ${approvedRequestId}.`);
    });

    await t.step("Should return all active (unapproved) requests for a requester", async () => {
      console.log(`Trace: Querying active requests for requester ${MOCK_USER_REQUESTER_ACTIVE}.`);
      const result = await concept._getRequesterActiveRequests({ user: MOCK_USER_REQUESTER_ACTIVE });

      assertEquals(result.length, 2, "Should return two active requests for the requester.");
      const requestIds = result.map(r => r.verificationRequest);
      assertEquals(requestIds.includes(activeRequestId1), true, "First active request should be present.");
      assertEquals(requestIds.includes(activeRequestId2), true, "Second active request should be present.");
      console.log("- Verified all active requests are returned.");
    });

    await t.step("Should return an empty array if requester has no active (only approved) requests", async () => {
      console.log(`Trace: Querying active requests for requester ${MOCK_USER_REQUESTER_INACTIVE} (only approved requests).`);
      const result = await concept._getRequesterActiveRequests({ user: MOCK_USER_REQUESTER_INACTIVE });

      assertEquals(result.length, 0, "Should return an empty array for requester with only approved requests.");
      console.log("- Verified empty array for requester with no active requests.");
    });

    await t.step("Should return an empty array for a requester with no requests at all", async () => {
      console.log(`Trace: Querying active requests for non-existent requester ${MOCK_USER_REQUESTER_NO_REQUESTS}.`);
      const result = await concept._getRequesterActiveRequests({ user: MOCK_USER_REQUESTER_NO_REQUESTS });

      assertEquals(result.length, 0, "Should return an empty array for a non-existent requester.");
      console.log("- Verified empty array for non-existent requester.");
    });
  });

  await t.step("Query: _getApproverActiveRequests", async (t) => {
    const MOCK_USER_APPROVER_ACTIVE: User = freshID() as User;
    const MOCK_USER_APPROVER_INACTIVE: User = freshID() as User; // Has approved requests
    const MOCK_USER_APPROVER_NO_REQUESTS: User = freshID() as User;

    let activeRequestId1: VerificationRequest;
    let activeRequestId2: VerificationRequest;
    let approvedRequestId: VerificationRequest;

    t.beforeEach(async () => {
      // Setup: Create requests for different scenarios
      // 1. Approver with active (unapproved) requests pending their approval
      const createResult1 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER_ACTIVE,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult1) throw new Error("Setup failed.");
      activeRequestId1 = createResult1.verificationRequest;

      const createResult2 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER_ACTIVE,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult2) throw new Error("Setup failed.");
      activeRequestId2 = createResult2.verificationRequest;

      // 2. Approver with an approved request (should not be considered 'active')
      const createResult3 = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_REQUESTER,
        approver: MOCK_USER_APPROVER_INACTIVE,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in createResult3) throw new Error("Setup failed.");
      approvedRequestId = createResult3.verificationRequest;
      await concept.verify({ verificationRequest: approvedRequestId });

      console.log(`Setup: Active requests for ${MOCK_USER_APPROVER_ACTIVE}: [${activeRequestId1}, ${activeRequestId2}].`);
      console.log(`Setup: Approved request for ${MOCK_USER_APPROVER_INACTIVE}: ${approvedRequestId}.`);
    });

    await t.step("Should return all active (unapproved) requests for an approver", async () => {
      console.log(`Trace: Querying active requests for approver ${MOCK_USER_APPROVER_ACTIVE}.`);
      const result = await concept._getApproverActiveRequests({ user: MOCK_USER_APPROVER_ACTIVE });

      assertEquals(result.length, 2, "Should return two active requests for the approver.");
      const requestIds = result.map(r => r.verificationRequest);
      assertEquals(requestIds.includes(activeRequestId1), true, "First active request should be present.");
      assertEquals(requestIds.includes(activeRequestId2), true, "Second active request should be present.");
      console.log("- Verified all active requests are returned.");
    });

    await t.step("Should return an empty array if approver has no active (only approved) requests", async () => {
      console.log(`Trace: Querying active requests for approver ${MOCK_USER_APPROVER_INACTIVE} (only approved requests).`);
      const result = await concept._getApproverActiveRequests({ user: MOCK_USER_APPROVER_INACTIVE });

      assertEquals(result.length, 0, "Should return an empty array for approver with only approved requests.");
      console.log("- Verified empty array for approver with no active requests.");
    });

    await t.step("Should return an empty array for an approver with no requests at all", async () => {
      console.log(`Trace: Querying active requests for non-existent approver ${MOCK_USER_APPROVER_NO_REQUESTS}.`);
      const result = await concept._getApproverActiveRequests({ user: MOCK_USER_APPROVER_NO_REQUESTS });

      assertEquals(result.length, 0, "Should return an empty array for a non-existent approver.");
      console.log("- Verified empty array for non-existent approver.");
    });
  });

  await t.step("Query: _isActiveRequest (Note: 'part' parameter is not currently used in implementation)", async (t) => {
    const MOCK_USER_HAS_ACTIVE: User = freshID() as User;
    const MOCK_USER_NO_ACTIVE: User = freshID() as User; // Has approved request
    const MOCK_USER_NO_REQUESTS: User = freshID() as User;
    const MOCK_PART_FOR_QUERY: Part = freshID() as Part; // This part will be passed, but the current implementation doesn't filter by it.

    t.beforeEach(async () => {
      // Setup:
      // 1. User with an active (unapproved) request
      await concept.createVerificationRequest({
        part: freshID() as Part, // A specific part, but _isActiveRequest doesn't use its 'part' parameter to filter by it.
        requester: MOCK_USER_HAS_ACTIVE,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });

      // 2. User with an approved request (not considered 'active')
      const approvedResult = await concept.createVerificationRequest({
        part: freshID() as Part,
        requester: MOCK_USER_NO_ACTIVE,
        approver: MOCK_USER_APPROVER,
        evidence: MOCK_EVIDENCE,
      });
      if ("error" in approvedResult) throw new Error("Setup failed.");
      await concept.verify({ verificationRequest: approvedResult.verificationRequest });

      console.log(`Setup: ${MOCK_USER_HAS_ACTIVE} has an active request.`);
      console.log(`Setup: ${MOCK_USER_NO_ACTIVE} has an approved request (not active).`);
    });

    await t.step("Should return true if the user has any active request (regardless of the 'part' parameter)", async () => {
      console.log(`Trace: Checking for active request for user ${MOCK_USER_HAS_ACTIVE} for arbitrary part ${MOCK_PART_FOR_QUERY}.`);
      const result = await concept._isActiveRequest({ user: MOCK_USER_HAS_ACTIVE, part: MOCK_PART_FOR_QUERY });

      assertEquals(result.length, 1, "Should return one result object.");
      assertEquals(result[0].isRequested, true, "Should indicate an active request exists for the user.");
      console.log("- Verified that `isRequested` is true because the user has any active request.");
    });

    await t.step("Should return false if the user has no active requests (even if they have approved ones, 'part' parameter ignored)", async () => {
      console.log(`Trace: Checking for active request for user ${MOCK_USER_NO_ACTIVE} (has only approved requests) for arbitrary part ${MOCK_PART_FOR_QUERY}.`);
      const result = await concept._isActiveRequest({ user: MOCK_USER_NO_ACTIVE, part: MOCK_PART_FOR_QUERY });

      assertEquals(result.length, 1, "Should return one result object.");
      assertEquals(result[0].isRequested, false, "Should indicate no active request exists for the user.");
      console.log("- Verified that `isRequested` is false because the user has no *unapproved* requests.");
    });

    await t.step("Should return false if the user has no requests at all", async () => {
      console.log(`Trace: Checking for active request for non-existent user ${MOCK_USER_NO_REQUESTS} for arbitrary part ${MOCK_PART_FOR_QUERY}.`);
      const result = await concept._isActiveRequest({ user: MOCK_USER_NO_REQUESTS, part: MOCK_PART_FOR_QUERY });

      assertEquals(result.length, 1, "Should return one result object.");
      assertEquals(result[0].isRequested, false, "Should indicate no active request exists for a non-existent user.");
      console.log("- Verified that `isRequested` is false for a user with no requests.");
    });
  });

  await t.step("Principle Trace: Requester submits, Approver verifies", async (t) => {
    const PRINCIPLE_REQUESTER: User = freshID() as User;
    const PRINCIPLE_APPROVER: User = freshID() as User;
    const PRINCIPLE_PART: Part = freshID() as Part;
    const PRINCIPLE_EVIDENCE: File = freshID() as File;
    let createdRequestId: VerificationRequest;

    console.log("\nPrinciple: A user (requester) can submit a request to another user (approver) to verify a specific part with evidence. The approver can then approve this request, changing its status from active to approved.");

    await t.step("Step 1: Requester creates a verification request", async () => {
      console.log(`Trace: ${PRINCIPLE_REQUESTER} creates a verification request for part ${PRINCIPLE_PART}, to be approved by ${PRINCIPLE_APPROVER}, with evidence ${PRINCIPLE_EVIDENCE}.`);
      const createResult = await concept.createVerificationRequest({
        part: PRINCIPLE_PART,
        requester: PRINCIPLE_REQUESTER,
        approver: PRINCIPLE_APPROVER,
        evidence: PRINCIPLE_EVIDENCE,
      });

      if ("error" in createResult) throw new Error(`Principle Step 1 failed: ${createResult.error}`);
      createdRequestId = createResult.verificationRequest;
      console.log(`- Request ${createdRequestId} created successfully.`);

      // Verify initial state: The request should be active for both requester and approver, and unapproved.
      const requesterActive = await concept._getRequesterActiveRequests({ user: PRINCIPLE_REQUESTER });
      assertEquals(requesterActive.length, 1, "Requester should have 1 active request pending approval.");
      assertEquals(requesterActive[0].verificationRequest, createdRequestId, "The active request ID should match the one just created.");

      const approverActive = await concept._getApproverActiveRequests({ user: PRINCIPLE_APPROVER });
      assertEquals(approverActive.length, 1, "Approver should have 1 active request pending their action.");
      assertEquals(approverActive[0].verificationRequest, createdRequestId, "The pending request ID should match the one just created.");

      const isActiveForRequester = await concept._isActiveRequest({ user: PRINCIPLE_REQUESTER, part: PRINCIPLE_PART });
      assertEquals(isActiveForRequester[0].isRequested, true, "Requester should show an active request existence.");

      const requestDetails = await concept._getRequestDetails({ verificationRequests: [createdRequestId] });
      assertEquals(requestDetails[0].approved, false, "The newly created request should initially be unapproved.");
      console.log("- Confirmed initial state: Request is active for requester and approver, and its status is unapproved.");
    });

    await t.step("Step 2: Approver verifies the request", async () => {
      console.log(`Trace: ${PRINCIPLE_APPROVER} proceeds to verify request ${createdRequestId}.`);
      const verifyResult: Empty | { error: string } = await concept.verify({ verificationRequest: createdRequestId });

      if ("error" in verifyResult) throw new Error(`Principle Step 2 failed: ${verifyResult.error}`);
      assertEquals(Object.keys(verifyResult).length, 0, "The verify action should return an empty object on successful completion.");
      console.log("- Request successfully verified by the approver.");

      // Verify final state: The request should no longer be 'active' for either, and its 'approved' status should be true.
      const requesterActive = await concept._getRequesterActiveRequests({ user: PRINCIPLE_REQUESTER });
      assertEquals(requesterActive.length, 0, "Requester should now have 0 active requests, as it has been approved.");

      const approverActive = await concept._getApproverActiveRequests({ user: PRINCIPLE_APPROVER });
      assertEquals(approverActive.length, 0, "Approver should now have 0 active requests for this particular item, as it's processed.");

      const isActiveForRequester = await concept._isActiveRequest({ user: PRINCIPLE_REQUESTER, part: PRINCIPLE_PART });
      assertEquals(isActiveForRequester[0].isRequested, false, "Requester should no longer show this specific request as active.");

      const requestDetails = await concept._getRequestDetails({ verificationRequests: [createdRequestId] });
      assertEquals(requestDetails[0].approved, true, "The request's 'approved' status should now be true.");
      console.log("- Confirmed final state: Request is no longer considered active for either party, and its status is approved.");
    });
  });
});
```
