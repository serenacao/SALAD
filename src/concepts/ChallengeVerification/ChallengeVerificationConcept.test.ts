// ---- FIXED TEST FILE FOR NEW IMPLEMENTATION ----

import { Collection, ObjectId } from "npm:mongodb";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import ChallengeVerificationConcept from "./ChallengeVerificationConcept.ts";
import { assert } from "node:console";

// Generic types for readability
type User = ID;
type Part = ID;
type File = ID;
type Challenge = ID;
type VerificationRequest = ID;

Deno.test("ChallengeVerificationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ChallengeVerificationConcept(db);

  const user1: User = freshID();
  const user2: User = freshID();
  const approver1: User = freshID();
  const challenge: Challenge = freshID();
  const part1: Part = freshID();
  const part2: Part = freshID();
  const evidence1: File = freshID();
  const evidence2: File = freshID();
  let vr1: VerificationRequest = "" as VerificationRequest;
  let vr2: VerificationRequest = "" as VerificationRequest;

  //
  // CREATE REQUEST
  //
  await t.step("createVerificationRequest", async (t) => {
    await t.step("Creates first request", async () => {
      const result = await concept.createVerificationRequest({
        challenge,
        part: part1,
        requester: user1,
        approver: approver1,
        evidence: evidence1,
      });

      assertExists(
        (result as { verificationRequest: VerificationRequest })
          .verificationRequest
      );

      const id = (result as { verificationRequest: VerificationRequest })
        .verificationRequest;

      vr1 = id;

      const doc = await db
        .collection("ChallengeVerification.VerificationRequests")
        .findOne({ _id: id });

      assertExists(doc);
      assertEquals(doc?.approved, false);
      assertEquals(doc?.part, part1);
      assertEquals(doc?.requester, user1);
    });

    await t.step("Creates second request (different part)", async () => {
      const result = await concept.createVerificationRequest({
        challenge,
        part: part2,
        requester: user1,
        approver: approver1,
        evidence: evidence2,
      });

      assertExists(
        (result as { verificationRequest: VerificationRequest })
          .verificationRequest
      );

      const id = (result as { verificationRequest: VerificationRequest })
        .verificationRequest;

      vr2 = id;

      const doc = await db
        .collection("ChallengeVerification.VerificationRequests")
        .findOne({ _id: id });

      assertExists(doc);
      assertEquals(doc?.part, part2);
    });

    await t.step(
      "Duplicate request with same requester+part should be rejected",
      async () => {
        const result = await concept.createVerificationRequest({
          challenge,
          part: part1,
          requester: user1,
          approver: approver1,
          evidence: freshID(),
        });

        assertEquals(
          (result as { error: string }).error,
          "Verification request already exists"
        );
      }
    );
  });

  // VERIFY
  //
  await t.step("verify", async (t) => {
    await t.step("Approves existing request", async () => {
      const r = await concept.verify({ verificationRequest: vr1 });
      assertEquals(r, {});

      const doc = await db
        .collection("ChallengeVerification.VerificationRequests")
        .findOne({ _id: vr1 });

      assertEquals(doc?.approved, true);
    });

    await t.step(
      "Re-verifying an approved request still succeeds",
      async () => {
        const r = await concept.verify({ verificationRequest: vr1 });
        assertEquals(r, {});
      }
    );

    await t.step("Verifying nonexistent request returns error", async () => {
      const fake: VerificationRequest = freshID();
      const r = await concept.verify({ verificationRequest: fake });

      assertEquals(
        (r as { error: string }).error,
        "Verification request does not exist"
      );
    });
  });

  //
  // REMOVE
  //
  await t.step("removeVerificationRequest", async (t) => {
    await t.step("Removes existing request", async () => {
      const r = await concept.removeVerificationRequest({
        verificationRequest: vr2,
      });
      assertEquals(r, {});

      const doc = await db
        .collection("ChallengeVerification.VerificationRequests")
        .findOne({ _id: vr2 });
      assertEquals(doc, null);
    });

    await t.step("Removing nonexistent request returns error", async () => {
      const fake: VerificationRequest = freshID();
      const r = await concept.removeVerificationRequest({
        verificationRequest: fake,
      });
      assertEquals(
        (r as { error: string }).error,
        "Verification request does not exist"
      );
    });
  });

  //
  // GET APPROVER
  //
  await t.step("_getRequestApprover", async () => {
    const result = await concept._getRequestApprover({
      verificationRequest: vr1,
    });

    assertEquals(result.length, 1);
    assertEquals(result[0].approver, approver1);

    const nonexistent = await concept._getRequestApprover({
      verificationRequest: freshID(),
    });
    assertEquals(nonexistent.length, 0);
  });

  //
  // GET DETAILS
  //
  await t.step("_getRequestDetails", async () => {
    const result = await concept._getRequestDetails({
      verificationRequests: [vr1, freshID()],
    });

    assertEquals(result.length, 1);
    assertEquals(result[0].approved, true);
  });

  //
  // _getRequesterActiveRequests
  //
  await t.step("_getRequesterActiveRequests", async (t) => {
    // Only vr1 exists (and is approved)
    const r1 = await concept._getRequesterActiveRequests({
      user: user1,
      challenge,
    });
    assertEquals(r1.length, 0);

    // Create one unapproved request for user2
    const req = await concept.createVerificationRequest({
      challenge,
      part: freshID(),
      requester: user2,
      approver: approver1,
      evidence: freshID(),
    });

    const vr_new = (req as { verificationRequest: VerificationRequest })
      .verificationRequest;

    const r2 = await concept._getRequesterActiveRequests({
      user: user2,
      challenge,
    });

    assertEquals(r2.length, 1);
    assertEquals(r2[0].verificationRequest, vr_new);
  });

  //
  // _getApproverActiveRequests
  //
  await t.step("_getApproverActiveRequests", async () => {
    const act = await concept._getApproverActiveRequests({
      user: approver1,
    });

    // should include exactly the above unapproved request
    assertEquals(act.length, 1);
  });

  //
  // _isActiveRequest — new behavior: checks *part-specific*, not global
  //
  await t.step("_isActiveRequest", async (t) => {
    const newPart = freshID();

    const req = await concept.createVerificationRequest({
      challenge,
      part: newPart,
      requester: user1,
      approver: approver1,
      evidence: freshID(),
    });

    const vrNew = (req as { verificationRequest: VerificationRequest })
      .verificationRequest;

    await t.step("True only for same part", async () => {
      const r = await concept._isActiveRequest({
        part: newPart,
        user: user1,
      });
      assertEquals(r, [{ isRequested: true }]);
    });

    await t.step("False for different part", async () => {
      const r = await concept._isActiveRequest({
        part: freshID(),
        user: user1,
      });
      assertEquals(r, [{ isRequested: false }]);
    });
  });

  await client.close();
});
