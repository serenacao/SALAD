[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

# file: src/concepts/ChallengeDefinition/ChallengeParticipationConcept.ts
``` typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeParticipation" + ".";

// Generic types of this concept
type User = ID;
type Challenge = ID;
type Invitation = ID;
type Participation = ID;

interface ParticipationDoc {
  _id: ID;
  user: User;
  challenge: Challenge;
  completed: boolean;
}

interface InvitationDoc {
  _id: ID;
  user: User;
  challenge: Challenge;
}

export default class ChallengeParticipationConcept {
  private participations: Collection<ParticipationDoc>;
  private invitations: Collection<InvitationDoc>;

  constructor(private readonly db: Db) {
    this.participations = this.db.collection(PREFIX + "Participations");
    this.invitations = this.db.collection(PREFIX + "Invitations");
  }

  async createInvitation({
    challenge,
    user,
  }: {
    challenge: Challenge;
    user: User;
  }): Promise<{ invitation: Invitation } | { error: string }> {
    const invitation = freshID();
    const invitationDoc: InvitationDoc = {
      _id: invitation,
      user: user,
      challenge: challenge,
    };

    await this.invitations.insertOne(invitationDoc);

    return { invitation: invitation };
  }

  async acceptInvitation({
    invitation,
  }: {
    invitation: Invitation;
  }): Promise<{ participation: Participation } | { error: string }> {
    const invitationDoc = await this.invitations.findOne({ _id: invitation });
    if (!invitationDoc) {
      return { error: "Invitation does not exist" };
    }
    const participation = freshID();
    const participationDoc: ParticipationDoc = {
      _id: participation,
      user: invitationDoc.user,
      challenge: invitationDoc.challenge,
      completed: false,
    };

    await this.participations.insertOne(participationDoc);

    return { participation: participation };
  }

  async removeInvitation({
    invitation,
  }: {
    invitation: Invitation;
  }): Promise<Empty | { error: string }> {
    const invitationDoc = await this.invitations.findOne({ _id: invitation });
    if (!invitationDoc) {
      return { error: "Invitation does not exist" };
    }
    await this.invitations.deleteOne({ _id: invitationDoc._id });
    return {};
  }

  async removeParticipation({
    participation,
  }: {
    participation: Participation;
  }): Promise<Empty | { error: string }> {
    const participationDoc = await this.participations.findOne({
      _id: participation,
    });
    if (!participationDoc) {
      return { error: "Participation does not exist" };
    }
    await this.participations.deleteOne({ _id: participationDoc._id });
    return {};
  }

  async completeChallenge({
    participation,
  }: {
    participation: Participation;
  }): Promise<Empty | { error: string }> {
    const participationDoc = await this.participations.findOne({
      _id: participation,
    });
    if (!participationDoc) {
      return { error: "Participation does not exist" };
    }
    await this.participations.updateOne(
      { _id: participationDoc._id },
      { $set: { completed: true } }
    );
    return {};
  }

  async _getChallengeParticipants({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User }>> {
    const participations = await this.participations
      .find({ challenge: challenge })
      .toArray();
    const users: Array<{ user: User }> = [];
    participations.forEach((doc) => {
      users.push({ user: doc.user });
    });
    return users;
  }

  async _getChallengeInvitees({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User }>> {
    const invitations = await this.invitations
      .find({ challenge: challenge })
      .toArray();
    const users: Array<{ user: User }> = [];
    invitations.forEach((doc) => {
      users.push({ user: doc.user });
    });
    return users;
  }

  async _getUserParticipations({
    user,
  }: {
    user: User;
  }): Promise<Array<{ challenge: Challenge }>> {
    const participations = await this.participations
      .find({ user: user })
      .toArray();
    const challenges: Array<{ challenge: Challenge }> = [];
    participations.forEach((doc) => {
      challenges.push({ challenge: doc.challenge });
    });
    return challenges;
  }

  async _getUserInvitations({
    user,
  }: {
    user: User;
  }): Promise<Array<{ challenge: Challenge }>> {
    const invitations = await this.invitations.find({ user: user }).toArray();
    const challenges: Array<{ challenge: Challenge }> = [];
    invitations.forEach((doc) => {
      challenges.push({ challenge: doc.challenge });
    });
    return challenges;
  }
}
```