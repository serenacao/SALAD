import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeVerification" + ".";

// Generic types of this concept
type User = ID;
type Part = ID;
type File = ID;
type VerificationRequest = ID;

interface VerificationRequestDoc {
  _id: VerificationRequest;
  file: File;
  requester: User;
  approver: User;
  part: Part;
}

export default class ChallengeParticipationConcept {
  private verificationRequests: Collection<VerificationRequestDoc>;

  constructor(private readonly db: Db) {
    this.verificationRequests = this.db.collection(
      PREFIX + "VerificationRequests"
    );
  }
}
