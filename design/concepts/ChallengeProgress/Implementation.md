# file: src/concepts/ChallengeProgress/ChallengeProgressConcept.ts
```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeProgress" + ".";

// Generic types of this concept
type User = ID;
type Challenge = ID;
type Part = ID;
type Completion = ID;

interface PartDoc {
  _id: Part;
  challenge: Challenge;
  day: number;
  week: number;
}

interface CompletionDoc {
  _id: Completion;
  part: Part;
  user: User;
  challenge: Challenge;
}

interface UploadedChallengeDoc {
  _id: Challenge;
}

export default class ChallengeProgressConcept {
  private parts: Collection<PartDoc>;
  private completions: Collection<CompletionDoc>;
  private uploadedChallenges: Collection<UploadedChallengeDoc>;

  constructor(private readonly db: Db) {
    this.parts = this.db.collection(PREFIX + "Parts");
    this.completions = this.db.collection(PREFIX + "Completions");
    this.uploadedChallenges = this.db.collection(PREFIX + "UploadedChallenges");
  }

  async uploadChallenge({
    challenge,
    daysOfWeek,
    weeks,
  }: {
    challenge: Challenge;
    daysOfWeek: number;
    weeks: number;
  }): Promise<Empty | { error: string }> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (uploadedChallenge) {
      return { error: "Challenge already uploaded" };
    }

    await this.uploadedChallenges.insertOne({_id: challenge})

    const partDocs: Array<PartDoc> = [];
    for (let week = 1; week <= weeks; week++) {
      for (let day = 1; day <= daysOfWeek; day++) {
        const partDoc = {
          _id: freshID(),
          week: week,
          day: day,
          challenge: challenge,
        };
        partDocs.push(partDoc);
      }
    }
    await this.parts.insertMany(partDocs);
    return {};
  }

  async removeChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return { error: "Challenge is not uploaded" };
    }
    await this.uploadedChallenges.deleteOne({ _id: challenge });

    await this.parts.deleteMany({ challenge: challenge });

    await this.completions.deleteOne({ challenge: challenge });
    return {};
  }

  async completePart({
    part,
    user,
  }: {
    part: Part;
    user: User;
  }): Promise<Empty | { error: string }> {
    const partDoc = await this.parts.findOne({ _id: part });
    if (!partDoc) {
      return { error: "Part does not exist" };
    }
    
    const completionDoc: CompletionDoc = {
      _id: freshID(),
      part: part,
      user: user,
      challenge: partDoc.challenge,
    };

    await this.completions.insertOne(completionDoc);
    return {};
  }

  async _getPartDayWeek({
    parts,
  }: {
    parts: Array<Part>;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const partDocs = await Promise.all(
      parts.map((part) => this.parts.findOne({ _id: part }))
    );

    const output: Array<{ part: Part; day: number; week: number }> = [];

    for (const doc of partDocs) {
    if (!doc) continue;
      output.push({ part: doc._id, day: doc.day, week: doc.week });
    }

    return output;
  }

  async _getParts({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }
    const parts = await this.parts.find({ challenge: challenge }).toArray();
    const output: Array<{ part: Part; day: number; week: number }> = [];
    parts.forEach((doc) => {
      output.push({ part: doc._id, day: doc.day, week: doc.week });
    });
    return output;
  }

  async _getCompletedParts({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ part: Part; day: number; week: number }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }
    const completions = await this.completions
      .find({ challenge: challenge, user: user })
      .toArray();
    const parts: Array<Part> = completions.map((doc) => doc.part);

    return this._getPartDayWeek({ parts: parts });
  }

  async _allPartsCompleted({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ allPartsCompleted: boolean }>> {
    const uploadedChallenge = await this.uploadedChallenges.findOne({
      _id: challenge,
    });
    if (!uploadedChallenge) {
      return [];
    }
    const completions = await this.completions
      .find({ challenge: challenge, user: user })
      .toArray();
    const parts = await this.parts.find({ challenge: challenge }).toArray();
    return [{ allPartsCompleted: completions.length === parts.length }];
  }
}
```