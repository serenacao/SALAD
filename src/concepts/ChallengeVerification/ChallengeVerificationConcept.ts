import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeVerification" + ".";

// Generic types of this concept
type User = ID;
type Part = ID;
type Challenge = ID;
type File = ID;
type VerificationRequest = ID;

interface VerificationRequestDoc {
  _id: VerificationRequest;
  evidence: File;
  requester: User;
  approver: User;
  part: Part;
  challenge: Challenge;
  approved: boolean;
}

export default class ChallengeVerificationConcept {
  private verificationRequests: Collection<VerificationRequestDoc>;

  constructor(private readonly db: Db) {
    this.verificationRequests = this.db.collection(
      PREFIX + "VerificationRequests"
    );
  }

  async createVerificationRequest({
    challenge,
    part,
    requester,
    approver,
    evidence,
  }: {
    challenge: Challenge;
    part: Part;
    requester: User;
    approver: User;
    evidence: File;
  }): Promise<
    { verificationRequest: VerificationRequest } | { error: string }
  > {
    const matchingRequest = await this.verificationRequests.findOne({
      part: part,
      requester: requester,
    });
    if (matchingRequest) {
      return { error: "Verification request already exists" };
    }

    if (requester === approver) {
      return { error: "Requester cannot be the same as approver" };
    }
    const verificationRequest: VerificationRequest = freshID();
    const verificationRequestDoc = {
      _id: verificationRequest,
      evidence: evidence,
      requester: requester,
      approver: approver,
      part: part,
      challenge: challenge,
      approved: false,
    };
    await this.verificationRequests.insertOne(verificationRequestDoc);
    return { verificationRequest: verificationRequest };
  }

  async removeVerificationRequest({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Empty | { error: string }> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return { error: "Verification request does not exist" };
    }
    await this.verificationRequests.deleteOne({ _id: verificationRequest });

    return {};
  }

  async verify({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Empty | { error: string }> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return { error: "Verification request does not exist" };
    }
    await this.verificationRequests.updateOne(
      { _id: verificationRequest },
      { $set: { approved: true } }
    );

    return {};
  }

  async removeChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    await this.verificationRequests.deleteMany({ challenge: challenge });
    return {};
  }

  async _getRequestApprover({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Array<{ approver: User }>> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return [];
    }
    return [{ approver: verificationRequestDoc.approver }];
  }

  async _getRequestRequester({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Array<{ requester: User }>> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return [];
    }
    return [{ requester: verificationRequestDoc.requester }];
  }

  async _getRequestPart({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Array<{ part: Part }>> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return [];
    }
    return [{ part: verificationRequestDoc.part }];
  }

  async _getRequestChallenge({
    verificationRequest,
  }: {
    verificationRequest: VerificationRequest;
  }): Promise<Array<{ challenge: Challenge }>> {
    const verificationRequestDoc = await this.verificationRequests.findOne({
      _id: verificationRequest,
    });
    if (!verificationRequestDoc) {
      return [];
    }
    return [{ challenge: verificationRequestDoc.challenge }];
  }

  async _getRequestDetails({
    verificationRequests,
  }: {
    verificationRequests: Array<VerificationRequest>;
  }): Promise<
    Array<{
      part: Part;
      evidence: File;
      approver: User;
      requester: User;
      approved: boolean;
      challenge: Challenge;
    }>
  > {
    const requestDocs = await Promise.all(
      verificationRequests.map((doc) =>
        this.verificationRequests.findOne({ _id: doc })
      )
    );

    const output: Array<{
      part: Part;
      evidence: File;
      approver: User;
      requester: User;
      approved: boolean;
      challenge: Challenge;
    }> = [];
    requestDocs.forEach((doc) => {
      if (!doc) {
        return [];
      }
      output.push({
        part: doc.part,
        evidence: doc.evidence,
        approver: doc.approver,
        requester: doc.requester,
        approved: doc.approved,
        challenge: doc.challenge,
      });
    });
    return output;
  }

  async _getRequesterActiveRequests({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ verificationRequest: VerificationRequest; part: Part }>> {
    const requests = await this.verificationRequests
      .find({ requester: user, challenge: challenge, approved: false })
      .toArray();
    const output: Array<{
      verificationRequest: VerificationRequest;
      part: Part;
    }> = [];
    requests.forEach((doc) =>
      output.push({ verificationRequest: doc._id, part: doc.part })
    );
    return output;
  }

  async _getApproverActiveRequests({
    user,
  }: {
    user: User;
  }): Promise<Array<{ verificationRequest: VerificationRequest }>> {
    const requests = await this.verificationRequests
      .find({ approver: user, approved: false })
      .toArray();
    const output: Array<{ verificationRequest: VerificationRequest }> = [];
    requests.forEach((doc) => output.push({ verificationRequest: doc._id }));
    return output;
  }

  async _isActiveRequest({
    part,
    user,
  }: {
    part: Part;
    user: User;
  }): Promise<Array<{ isRequested: boolean }>> {
    const request = await this.verificationRequests.findOne({
      requester: user,
      part: part,
      approved: false,
    });
    if (!request) {
      return [{ isRequested: false }];
    }
    return [{ isRequested: true }];
  }
}
