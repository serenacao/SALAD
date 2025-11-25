import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeDefinition" + ".";

// Generic types of this concept
type User = ID;
type Challenge = ID;
type File = ID; // Assuming file is represented by an ID reference to a file storage concept
export type AnaerobicInfo = {
  _type: "AnaerobicInfo";
  weight?: number; //kg
  sets: number;
  reps: number;
};

export type RepAerobicInfo = {
  _type: "RepAerobicInfo";
  repSpeed: number; //reps per minute
  minutes: number;
};

export type DistanceAerobicInfo = {
  _type: "DistanceAerobicInfo";
  distanceSpeed: number; //km per hour
  minutes: number;
};

/**
 * a set of Challenge Challenges with
 *   a User or Group Creator
 *   a string Exercise
 *   a RepAerobicInfo, DistanceAerobicInfo or AnaerobicInfo Info
 *   a number DaysPerWeek (days per week)
 *   a number Weeks (weeks)
 *   a number Level (1 to 3)
 *   a set of Users with
 *     a boolean Accepted
 *     a boolean Completed
 *   a number Points (per part)
 *   a number BonusPoints (upon completion of entire challenge)
 *   a boolean Open
 */
interface ChallengeDoc {
  _id: Challenge;

  creator: User;
  exercise: string;
  info: AnaerobicInfo | RepAerobicInfo | DistanceAerobicInfo;
  daysPerWeek: number; // days per week
  weeks: number; // weeks
  level: number; // 1 to 3
  partPoints: number; // per part
  bonusPoints: number; // upon completion of entire challenge
  open: boolean;
}

export default class ChallengesConcept {
  challenges: Collection<ChallengeDoc>;

  constructor(private readonly db: Db) {
    this.challenges = this.db.collection(PREFIX + "Challenges");
  }

  /**
   * Helper function to calculate points based on challenge info.
   * This is an arbitrary calculation based on the spec's hint.
   */
  private calculatePartPoints(
    level: number,
    info: RepAerobicInfo | DistanceAerobicInfo | AnaerobicInfo
  ): number {
    let basePoints = level * 10;
    if (info._type === "RepAerobicInfo") {
      return (basePoints += this.calculateRepAerobicPartPoints(info));
    } else if (info._type === "DistanceAerobicInfo") {
      return (basePoints += this.calculateDistanceAerobicPartPoints(info));
    } else {
      return (basePoints += this.calculateAnaerobicPartPoints(info));
    }
  }

  private calculateRepAerobicPartPoints(info: RepAerobicInfo): number {
    const points = info.repSpeed * info.minutes;
    return points;
  }

  private calculateDistanceAerobicPartPoints(
    info: DistanceAerobicInfo
  ): number {
    const points = (info.distanceSpeed / 100) * info.minutes;
    return points;
  }

  private calculateAnaerobicPartPoints(info: AnaerobicInfo): number {
    let points = info.reps * info.sets;
    if (info.weight) {
      points *= info.weight / 10;
    }
    return points;
  }

  /**
   * Helper function to calculate bonus points based on challenge info.
   * This is an arbitrary calculation based on the spec's hint.
   */
  private calculateBonusPoints(
    level: number,
    daysPerWeek: number,
    weeks: number
  ): number {
    return Math.round(level * daysPerWeek ** 1.5 * weeks ** 2);
  }

  /**
   * createChallenge(creator: User, level: number, exercise: string, reps?: number, sets?: number, weight?: number, minutes?: number, daysPerWeek: number, weeks: number): (challenge: Challenge)
   *
   * **requires** level is an integer in {1, 2, 3}, reps and sets are positive integers if they exist, weight and minutes are positive numbers if they exist
   *
   * **effect** creates a new Challenge with the given fields, Open set to False, calculates Points based on level and BonusPoints based on level, daysPerWeek and weeks; creates a new Part for every week and day of the challenge with Completers set to an empty set
   */
  async createChallenge({
    creator,
    exercise,
    level,
    info,
    daysPerWeek,
    weeks,
  }: {
    creator: User;
    level: number;
    exercise: string;
    info: RepAerobicInfo | DistanceAerobicInfo | AnaerobicInfo;
    daysPerWeek: number;
    weeks: number;
  }): Promise<{ challenge: Challenge } | { error: string }> {
    // Requires checks
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      return { error: "Level must be an integer between 1 and 3." };
    }
    if (!Number.isInteger(daysPerWeek) || daysPerWeek <= 0) {
      return { error: "DaysPerWeek must be a positive integer." };
    }
    if (!Number.isInteger(weeks) || weeks <= 0) {
      return { error: "Weeks must be a positive integer." };
    }

    for (const [key, value] of Object.entries(info)) {
      if (key === "reps" || key === "sets") {
        if (typeof value !== "number") {
          return { error: "Reps and sets must be numbers." };
        }

        if (!Number.isInteger(value) || value <= 0) {
          return { error: "Reps and sets must be positive integers." };
        }
      } else if (key !== "_type") {
        if (typeof value !== "number") {
          return { error: "Info fields must be numbers." };
        }

        if (value <= 0) {
          return { error: "Info fields should be positive." };
        }
      }
    }

    const newChallengeId = freshID();
    const partPoints = this.calculatePartPoints(level, info);
    const bonusPoints = this.calculateBonusPoints(level, daysPerWeek, weeks);

    const newChallenge: ChallengeDoc = {
      _id: newChallengeId,
      creator,
      exercise,
      info,
      daysPerWeek,
      weeks,
      level,
      partPoints,
      bonusPoints,
      open: false,
    };

    await this.challenges.insertOne(newChallenge);

    return { challenge: newChallengeId };
  }
  /**
   * openChallenge(challenge: Challenge): Empty
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** sets Open for challenge to True if it was False, otherwise does nothing
   */
  async openChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return { error: "Challenge not found." };
    }

    if (!existingChallenge.open) {
      await this.challenges.updateOne(
        { _id: challenge },
        { $set: { open: true } }
      );
    }
    return {};
  }

  /**
   * closeChallenge(challenge: Challenge): Empty
   *
   * **requires** challenge exists in Challenge
   *
   * **effect** sets Open for challenge to False if it was True, otherwise does nothing
   */
  async closeChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return { error: "Challenge not found." };
    }

    if (existingChallenge.open) {
      await this.challenges.updateOne(
        { _id: challenge },
        { $set: { open: false } }
      );
    }
    return {};
  }

  /**
   * deleteChallenge(challenge: Challenge): Empty
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** deletes challenge from Challenges
   */
  async deleteChallenge({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const result = await this.challenges.deleteOne({ _id: challenge });
    if (result.deletedCount === 0) {
      return { error: "Challenge not found." };
    }
    return {};
  }

  /**
   * _isOpen(challenge: Challenge): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns whether or not challenge has Open set to True
   */
  async _isOpen({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    return [{ result: existingChallenge.open }];
  }

  /**
   * _getChallengeDetails(challenge: Challenge): Array<{ exercise: string, level: number, daysPerWeek: number, weeks: number, reps?: number, sets?: number, minutes?: number, weight?: number }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns Exercise, Level, DaysPerWeek, Weeks, Reps, Sets, Minutes, Weight for this Challenge
   */
  async _getChallengeDetails({ challenge }: { challenge: Challenge }): Promise<
    Array<{
      exercise: string;
      level: number;
      daysPerWeek: number;
      weeks: number;
      info: AnaerobicInfo | RepAerobicInfo | DistanceAerobicInfo;
    }>
  > {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return [
      {
        exercise: existingChallenge.exercise,
        level: existingChallenge.level,
        daysPerWeek: existingChallenge.daysPerWeek,
        weeks: existingChallenge.weeks,
        info: existingChallenge.info,
      },
    ];
  }

  /**
   * _getCreator(challenge: Challenge): Array<{ creator: User }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns Creator for challenge
   */
  async _getCreator({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ creator: User }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return [
      {
        creator: existingChallenge.creator,
      },
    ];
  }

  /**
   * _getPartPoints(part: Part): Array<{ points: number }>
   *
   * **requires** part exists in Parts
   *
   * **effect** returns Points for the Challenge associated with part
   */
  async _getPartPoints({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ points: number }>> {
    const challengeDoc = await this.challenges.findOne({
      _id: challenge,
    });
    if (!challengeDoc) {
      return [];
    }
    return [{ points: challengeDoc.partPoints }];
  }

  /**
   * _getBonusPoints(challenge: Challenge): Array<{ bonusPoints: number }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns BonusPoints for challenge
   */
  async _getBonusPoints({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ bonusPoints: number }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return [{ bonusPoints: existingChallenge.bonusPoints }];
  }
}
