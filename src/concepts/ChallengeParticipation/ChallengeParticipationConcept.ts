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
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Empty | { error: string }> {
    const participationDoc = await this.participations.findOne({
      user: user,
      challenge: challenge,
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

  async _getInvitationUser({
    invitation,
  }: {
    invitation: Invitation;
  }): Promise<Array<{ user: User }>> {
    const invitationDoc = await this.invitations.findOne({ _id: invitation });
    if (!invitationDoc) {
      return [];
    }
    return [{ user: invitationDoc.user }];
  }

  async _getInvitationChallenge({
    invitation,
  }: {
    invitation: Invitation;
  }): Promise<Array<{ challenge: User }>> {
    const invitationDoc = await this.invitations.findOne({ _id: invitation });
    if (!invitationDoc) {
      return [];
    }
    return [{ challenge: invitationDoc.challenge }];
  }

  async _getParticipationUser({
    participation,
  }: {
    participation: Participation;
  }): Promise<Array<{ user: User }>> {
    const participationDoc = await this.participations.findOne({
      _id: participation,
    });
    if (!participationDoc) {
      return [];
    }
    return [{ user: participationDoc.user }];
  }

  async _getParticipationChallenge({
    participation,
  }: {
    participation: Participation;
  }): Promise<Array<{ challenge: User }>> {
    const participationDoc = await this.participations.findOne({
      _id: participation,
    });
    if (!participationDoc) {
      return [];
    }
    return [{ challenge: participationDoc.challenge }];
  }
  async _getChallengeParticipations({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ participation: Participation; user: User }>> {
    const participations = await this.participations
      .find({ challenge: challenge })
      .toArray();
    const users: Array<{ user: User; participation: Participation }> = [];
    participations.forEach((doc) => {
      users.push({ user: doc.user, participation: doc._id });
    });
    return users;
  }

  async _getChallengeInvitations({
    challenge,
  }: {
    challenge: Challenge;
  }): Promise<Array<{ user: User; invitation: Invitation }>> {
    const invitations = await this.invitations
      .find({ challenge: challenge })
      .toArray();
    const users: Array<{ user: User; invitation: Invitation }> = [];
    invitations.forEach((doc) => {
      users.push({ user: doc.user, invitation: doc._id });
    });
    return users;
  }

  async _getUserParticipations({
    user,
  }: {
    user: User;
  }): Promise<Array<{ participation: Participation; challenge: Challenge }>> {
    const participations = await this.participations
      .find({ user: user })
      .toArray();
    const challenges: Array<{
      participation: Participation;
      challenge: Challenge;
    }> = [];
    participations.forEach((doc) => {
      challenges.push({ participation: doc._id, challenge: doc.challenge });
    });
    return challenges;
  }

  async _getUserInvitations({
    user,
  }: {
    user: User;
  }): Promise<Array<{ invitation: Invitation; challenge: Challenge }>> {
    const invitations = await this.invitations.find({ user: user }).toArray();
    const challenges: Array<{ challenge: Challenge; invitation: Invitation }> =
      [];
    invitations.forEach((doc) => {
      challenges.push({ challenge: doc.challenge, invitation: doc._id });
    });
    return challenges;
  }

  async _getInvitation({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ invitation: Invitation }>> {
    const invitationDoc = await this.invitations.findOne({
      user: user,
      challenge: challenge,
    });
    if (invitationDoc) {
      return [{ invitation: invitationDoc._id }];
    } else {
      return [];
    }
  }

  async _getParticipation({
    user,
    challenge,
  }: {
    user: User;
    challenge: Challenge;
  }): Promise<Array<{ participation: Invitation }>> {
    const participationDoc = await this.participations.findOne({
      user: user,
      challenge: challenge,
    });
    if (participationDoc) {
      return [{ participation: participationDoc._id }];
    } else {
      return [];
    }
  }
}
