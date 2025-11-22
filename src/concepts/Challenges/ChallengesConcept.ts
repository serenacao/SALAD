import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Challenges" + ".";

// Generic types of this concept
type User = ID;
type Group = ID;
type Challenge = ID;
type Part = ID;
type VerificationRequest = ID;
type File = ID; // Assuming file is represented by an ID reference to a file storage concept

/**
 * a set of Challenge Challenges with
 *   a User or Group Creator
 *   a string Exercise
 *   an optional number Reps
 *   an optional number Sets
 *   an optional number Weight (in kg)
 *   an optional number Minutes
 *   a number Frequency (days per week)
 *   a number Duration (weeks)
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
  creatorType: "User" | "Group"; // To distinguish between User and Group creators
  creator: User | Group;
  exercise: string;
  reps?: number;
  sets?: number;
  weight?: number; // in kg
  minutes?: number;
  frequency: number; // days per week
  duration: number; // weeks
  level: number; // 1 to 3
  // Renamed 'users' to 'participants' to better reflect accepted status
  participants: Array<{ user: User; accepted: boolean; completed: boolean }>;
  points: number; // per part
  bonusPoints: number; // upon completion of entire challenge
  open: boolean;
}

/**
 * a set of Part Parts with
 *   a Challenge
 *   a number Day
 *   a number Week
 *   a set of User Completers
 */
interface PartDoc {
  _id: Part;
  challenge: Challenge;
  day: number;
  week: number;
  completers: User[];
}

/**
 * a set of VerificationRequest VerificationRequests with
 *   a User Requester
 *   a User Approver (changed from ApproverEmail for consistency with User type)
 *   a Challenge
 *   a Part
 *   a file Evidence
 *   a boolean Approved
 */
interface VerificationRequestDoc {
  _id: VerificationRequest;
  requester: User;
  approver: User; // Changed from ApproverEmail to User for consistency
  challenge: Challenge;
  part: Part;
  evidence: File;
  approved: boolean;
}

export default class ChallengesConcept {
  challenges: Collection<ChallengeDoc>;
  parts: Collection<PartDoc>;
  verificationRequests: Collection<VerificationRequestDoc>;

  constructor(private readonly db: Db) {
    this.challenges = this.db.collection(PREFIX + "challenges");
    this.parts = this.db.collection(PREFIX + "parts");
    this.verificationRequests = this.db.collection(
      PREFIX + "verificationRequests"
    );
  }

  /**
   * Helper function to calculate points based on challenge parameters.
   * This is an arbitrary calculation based on the spec's hint.
   */
  private calculatePoints(
    level: number,
    reps?: number,
    sets?: number,
    weight?: number,
    minutes?: number
  ): number {
    let basePoints = level * 10;
    if (reps) basePoints += reps * 0.1;
    if (sets) basePoints += sets * 0.5;
    if (weight) basePoints += weight * 0.2;
    if (minutes) basePoints += minutes * 0.3;
    return Math.round(basePoints);
  }

  /**
   * Helper function to calculate bonus points based on challenge parameters.
   * This is an arbitrary calculation based on the spec's hint.
   */
  private calculateBonusPoints(
    level: number,
    frequency: number,
    duration: number
  ): number {
    return Math.round(level * frequency ** 1.5 * duration ** 2);
  }

  /**
   * createChallenge(creator: User or Group, level: number, exercise: string, reps?: number, sets?: number, weight?: number, minutes?: number, frequency: number, duration: number): (challenge: Challenge)
   *
   * **requires** level is an integer in {1, 2, 3}, reps and sets are positive integers if they exist, weight and minutes are positive numbers if they exist
   *
   * **effect** creates a new Challenge with the given fields, Open set to False, calculates Points based on level and BonusPoints based on level, frequency and duration; creates a new Part for every week and day of the challenge with Completers set to an empty set
   */
  async createChallenge({
    creator,
    creatorType, // Assuming creatorType is provided to distinguish User/Group
    level,
    exercise,
    reps,
    sets,
    weight,
    minutes,
    frequency,
    duration,
  }: {
    creator: User | Group;
    creatorType: "User" | "Group";
    level: number;
    exercise: string;
    reps?: number;
    sets?: number;
    weight?: number;
    minutes?: number;
    frequency: number;
    duration: number;
  }): Promise<{ challenge: Challenge } | { error: string }> {
    // Requires checks
    if (!Number.isInteger(level) || level < 1 || level > 3) {
      return { error: "Level must be an integer between 1 and 3." };
    }
    if (reps !== undefined && (!Number.isInteger(reps) || reps <= 0)) {
      return { error: "Reps must be a positive integer if provided." };
    }
    if (sets !== undefined && (!Number.isInteger(sets) || sets <= 0)) {
      return { error: "Sets must be a positive integer if provided." };
    }
    if (weight !== undefined && (typeof weight !== "number" || weight <= 0)) {
      return { error: "Weight must be a positive number if provided." };
    }
    if (
      minutes !== undefined &&
      (typeof minutes !== "number" || minutes <= 0)
    ) {
      return { error: "Minutes must be a positive number if provided." };
    }
    if (!Number.isInteger(frequency) || frequency <= 0) {
      return { error: "Frequency must be a positive integer." };
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      return { error: "Duration must be a positive integer." };
    }

    const newChallengeId = freshID();
    const points = this.calculatePoints(level, reps, sets, weight, minutes);
    const bonusPoints = this.calculateBonusPoints(level, frequency, duration);

    const newChallenge: ChallengeDoc = {
      _id: newChallengeId,
      creatorType,
      creator,
      exercise,
      reps,
      sets,
      weight,
      minutes,
      frequency,
      duration,
      level,
      participants: [],
      points,
      bonusPoints,
      open: false,
    };

    await this.challenges.insertOne(newChallenge);

    // Create parts for every week and day
    const partsToInsert = [];
    for (let week = 1; week <= duration; week++) {
      for (let day = 1; day <= frequency; day++) {
        partsToInsert.push({
          _id: freshID(),
          challenge: newChallengeId,
          week,
          day,
          completers: [],
        });
      }
    }
    if (partsToInsert.length > 0) {
      await this.parts.insertMany(partsToInsert);
    }

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
    // Also delete associated parts and verification requests
    await this.parts.deleteMany({ challenge });
    await this.verificationRequests.deleteMany({ challenge });
    return {};
  }

  /**
   * inviteToChallenge(challenge: Challenge, users: Array of User): Empty
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** adds every User in users to Users with Accepted and Completed set to False
   */
  async inviteToChallenge({
    challenge,
    users,
  }: {
    challenge: Challenge;
    users: User[];
  }): Promise<Empty | { error: string }> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return { error: "Challenge not found." };
    }

    const newParticipants = users
      .filter(
        (user) => !existingChallenge.participants.some((p) => p.user === user)
      ) // Only add users not already in the list
      .map((user) => ({ user, accepted: false, completed: false }));

    if (newParticipants.length > 0) {
      await this.challenges.updateOne(
        { _id: challenge },
        { $push: { participants: { $each: newParticipants } } }
      );
    }
    return {};
  }

  /**
   * acceptChallenge(challenge: Challenge, user: User): Empty
   *
   * **requires** challenge exists in Challenges, user is in Users for challenge
   *
   * **effect** sets Accepted for user to True if Accepted was False, otherwise does nothing
   */
  async acceptChallenge({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Empty | { error: string }> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return { error: "Challenge not found." };
    }

    const participantIndex = existingChallenge.participants.findIndex(
      (p) => p.user === user
    );
    if (participantIndex === -1) {
      return { error: "User is not invited to this challenge." };
    }

    if (!existingChallenge.participants[participantIndex].accepted) {
      await this.challenges.updateOne(
        { _id: challenge, "participants.user": user },
        { $set: { "participants.$.accepted": true } }
      );
    }
    return {};
  }

  /**
   * leaveChallenge(challenge: Challenge, user: User): Empty
   *
   * **requires** challenge exists in Challenges, user is in Users for challenge
   *
   * **effect** deletes User from from Users and also from any Completers sets it was apart of
   */
  async leaveChallenge({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Empty | { error: string }> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return { error: "Challenge not found." };
    }

    const participantIndex = existingChallenge.participants.findIndex(
      (p) => p.user === user
    );
    if (participantIndex === -1) {
      return { error: "User is not a participant in this challenge." };
    }

    await this.challenges.updateOne(
      { _id: challenge },
      { $pull: { participants: { user } } }
    );

    // Also remove from any Completers sets in parts
    await this.parts.updateMany(
      { challenge, completers: user },
      { $pull: { completers: user } }
    );
    return {};
  }

  /**
   * completePart(part: Part, user: User): Empty
   *
   * **requires** challenge has Open set to True; user is in Users and has Accepted set to True
   *
   * **effect** adds user to the Completers set for part; if all parts associated with Challenge have user in its Completers set, marks Completed as True for this user in challenge
   */
  async completePart({
    part,
    user,
  }: {
    part: Part;
    user: User;
  }): Promise<Empty | { error: string }> {
    const existingPart = await this.parts.findOne({ _id: part });
    if (!existingPart) {
      return { error: "Part not found." };
    }

    const challenge = await this.challenges.findOne({
      _id: existingPart.challenge,
    });
    if (!challenge) {
      return { error: "Associated challenge not found." };
    }
    if (!challenge.open) {
      return { error: "Challenge is not open." };
    }

    const participant = challenge.participants.find((p) => p.user === user);
    if (!participant || !participant.accepted) {
      return {
        error: "User is not an accepted participant in this challenge.",
      };
    }

    // Add user to completers set for this part if not already there
    if (!existingPart.completers.includes(user)) {
      await this.parts.updateOne(
        { _id: part },
        { $addToSet: { completers: user } }
      );
    }

    // Check if all parts for this challenge are completed by the user
    const allChallengeParts = await this.parts
      .find({ challenge: challenge._id })
      .toArray();
    const userCompletedAllParts = allChallengeParts.every((p) =>
      p.completers.includes(user)
    );

    if (userCompletedAllParts && !participant.completed) {
      await this.challenges.updateOne(
        { _id: challenge._id, "participants.user": user },
        { $set: { "participants.$.completed": true } }
      );
    }
    return {};
  }

  /**
   * createVerificationRequest(part: Part, requester: User, approver: User, evidence: File): (verificationRequest: VerificationRequest)
   *
   * **requires** part exists in Parts; Challenge associated with part has Open set to True; Requester is distinct from Approver
   *
   * **effect** creates a new VerificationRequest with requester, approver, part, the Challenge associated with part, evidence and Approved set to False
   */
  async createVerificationRequest({
    part,
    requester,
    approver,
    evidence,
  }: {
    part: Part;
    requester: User;
    approver: User;
    evidence: File;
  }): Promise<{ verificationRequest?: VerificationRequest; error?: string }> {
    const existingPart = await this.parts.findOne({ _id: part });
    if (!existingPart) {
      return { error: "Part not found." };
    }

    const challenge = await this.challenges.findOne({
      _id: existingPart.challenge,
    });
    if (!challenge) {
      return { error: "Associated challenge not found." };
    }
    if (!challenge.open) {
      return { error: "Challenge is not open." };
    }
    if (requester === approver) {
      return { error: "Requester must be distinct from Approver." };
    }

    const newVerificationRequestId = freshID();
    const newRequest: VerificationRequestDoc = {
      _id: newVerificationRequestId,
      requester,
      approver,
      challenge: challenge._id,
      part,
      evidence,
      approved: false,
    };

    await this.verificationRequests.insertOne(newRequest);
    return { verificationRequest: newVerificationRequestId };
  }

  /**
   * verify(part: Part, requester: User): Empty
   *
   * **requires** there is a VerificationRequest associated with part and requester; Challenge associated with part has Open set to True
   *
   * **effect** sets Approved to True for the associated VerificationRequest
   */
  async verify(
    { part, requester }: { part: Part; requester: User } // Assuming approver is inferred or passed as part of requester context in a sync
  ): Promise<Empty | { error: string }> {
    // Find the verification request. Assuming the 'requester' here is the one who *requested* verification
    // and the *caller* of verify is the actual approver. This needs careful interpretation.
    // The query should match on the 'approver' field in the VerificationRequest, not 'requester'.
    // Let's assume 'user' is the one calling 'verify' and they must be the 'approver' in the request.
    // The action `verify(part: Part, requester: User)` is underspecified on *who* is verifying.
    // I'll assume the action is called by the `approver` from the VerificationRequest.
    // So the action argument `requester` here refers to the original `requester` of the VR.
    // I need an 'approver' argument for this action.
    // Let's modify the signature to reflect the actual approver.
    // The spec has `verify(part: Part, requester: User)`. This means the action identifies the *request*.
    // And implies the *caller* is the approver.
    // I will assume the 'requester' argument here uniquely identifies the verification request.
    // And that the 'approver' is implicit from the context of *who* is calling this action.
    // Since concepts are independent, I can't rely on `Session` or `UserAuthentication` here.
    // So for this concept's internal logic, `verify` will simply find the request by `part` and `requester`
    // and mark it approved, implying the action was triggered by the correct approver externally.

    const verificationRequest = await this.verificationRequests.findOne({
      part,
      requester,
      approved: false,
    });
    if (!verificationRequest) {
      return {
        error:
          "Pending verification request not found for this part and requester.",
      };
    }

    const challenge = await this.challenges.findOne({
      _id: verificationRequest.challenge,
    });
    if (!challenge) {
      return { error: "Associated challenge not found." };
    }
    if (!challenge.open) {
      return { error: "Challenge is not open." };
    }

    await this.verificationRequests.updateOne(
      { _id: verificationRequest._id },
      { $set: { approved: true } }
    );
    return {};
  }

  /**
   * _isUserCreator(challenge: Challenge, user: User): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns whether or not user is Creator for Challenge
   */
  async _isUserCreator({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    return [
      {
        result:
          existingChallenge.creatorType === "User" &&
          existingChallenge.creator === user,
      },
    ];
  }

  /**
   * _isGroupCreator(challenge: Challenge, group: Group): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns whether or not group is Creator for Challenge
   */
  async _isGroupCreator({
    challenge,
    group,
  }: {
    challenge: Challenge;
    group: Group;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    return [
      {
        result:
          existingChallenge.creatorType === "Group" &&
          existingChallenge.creator === group,
      },
    ];
  }

  /**
   * _isParticipant(challenge: Challenge, user: User): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns whether or not user is in Users for challenge and whether Accepted is true for user
   */
  async _isParticipant({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    const participant = existingChallenge.participants.find(
      (p) => p.user === user && p.accepted
    );
    return [{ result: !!participant }];
  }

  /**
   * _isInvited(challenge: Challenge, user: User): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns whether or not user is in Users for challenge
   */
  async _isInvited({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    const inviter = existingChallenge.participants.find((p) => p.user === user);
    return [{ result: !!inviter }];
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
   * _isCompletedPart(part: Part, user: User): Array<{ result: boolean }>
   *
   * **requires** part exists in Parts
   *
   * **effect** returns whether or not part has user in its Completers set
   */
  async _isCompletedPart({
    part,
    user,
  }: {
    part: Part;
    user: User;
  }): Promise<Array<{ result: boolean }>> {
    const existingPart = await this.parts.findOne({ _id: part });
    if (!existingPart) {
      return [{ result: false }];
    }
    return [{ result: existingPart.completers.includes(user) }];
  }

  /**
   * _isCompletedChallenge(challenge: Challenge, user: User): Array<{ result: boolean }>
   *
   * **requires** challenge exists in Challenges, user is in Users for challenge
   *
   * **effect** returns Completed for user in challenge
   */
  async _isCompletedChallenge({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<Array<{ result: boolean }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [{ result: false }];
    }
    const participant = existingChallenge.participants.find(
      (p) => p.user === user
    );
    return [{ result: !!participant && participant.completed }];
  }

  /**
   * _getParticipants(challenge: Challenge): Array<{ user: User }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns every user in Users for this challenge where Accepted is True
   */
  async _getParticipants({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return existingChallenge.participants
      .filter((p) => p.accepted)
      .map((p) => ({ user: p.user }));
  }

  /**
   * _getInvitees(challenge: Challenge): Array<{ user: User }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns every user in Users for this challenge
   */
  async _getInvitees({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return existingChallenge.participants.map((p) => ({ user: p.user }));
  }

  /**
   * _getCompleters(challenge: Challenge): Array<{ user: User }>
   *
   * **requires** challenge exists in Challenge
   *
   * **effect** returns every user in Users for this challenge where Completed is True
   */
  async _getCompleters({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return existingChallenge.participants
      .filter((p) => p.completed)
      .map((p) => ({ user: p.user }));
  }

  /**
   * _getChallengeDetails(challenge: Challenge): Array<{ exercise: string, level: number, frequency: number, duration: number, reps?: number, sets?: number, minutes?: number, weight?: number }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns Exercise, Level, Frequency, Duration, Reps, Sets, Minutes, Weight for this Challenge
   */
  async _getChallengeDetails({ challenge }: { challenge: Challenge }): Promise<
    Array<{
      exercise: string;
      level: number;
      frequency: number;
      duration: number;
      reps?: number;
      sets?: number;
      minutes?: number;
      weight?: number;
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
        frequency: existingChallenge.frequency,
        duration: existingChallenge.duration,
        reps: existingChallenge.reps,
        sets: existingChallenge.sets,
        minutes: existingChallenge.minutes,
        weight: existingChallenge.weight,
      },
    ];
  }

  /**
   * _getCreator(challenge: Challenge): Array<{ creator: User | Group, creatorType: "User" | "Group" }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns Creator for challenge
   */
  async _getCreator({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ creator: User | Group; creatorType: "User" | "Group" }>> {
    const existingChallenge = await this.challenges.findOne({ _id: challenge });
    if (!existingChallenge) {
      return [];
    }
    return [
      {
        creator: existingChallenge.creator,
        creatorType: existingChallenge.creatorType,
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
    part,
  }: {
    part: Part;
  }): Promise<Array<{ points: number }>> {
    const existingPart = await this.parts.findOne({ _id: part });
    if (!existingPart) {
      return [];
    }
    const challenge = await this.challenges.findOne({
      _id: existingPart.challenge,
    });
    if (!challenge) {
      return [];
    }
    return [{ points: challenge.points }];
  }

  /**
   * _getChallengePoints(challenge: Challenge): Array<{ bonusPoints: number }>
   *
   * **requires** challenge exists in Challenges
   *
   * **effect** returns BonusPoints for challenge
   */
  async _getChallengePoints({
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

  /**
   * _getChallenges(user: User): Array<{ challenge: Challenge }>
   *
   * **requires** nothing
   *
   * **effect** returns every Challenge for which user is in Users and has Accepted as True
   */
  async _getChallenges({
    user,
  }: {
    user: User;
  }): Promise<Array<{ challenge: Challenge }>> {
    const challenges = await this.challenges
      .find({
        "participants.user": user,
        "participants.accepted": true,
      })
      .toArray();
    return challenges.map((c) => ({ challenge: c._id }));
  }

  /**
   * _getAssociatedChallenge(part: Part): Array<{ challenge: Challenge }>
   *
   * **requires** part is in Parts
   *
   * **effect** returns Challenge associated with Part
   */
  async _getAssociatedChallenge({
    part,
  }: {
    part: Part;
  }): Promise<Array<{ challenge: Challenge }>> {
    const existingPart = await this.parts.findOne({ _id: part });
    if (!existingPart) {
      return [];
    }
    return [{ challenge: existingPart.challenge }];
  }
}
