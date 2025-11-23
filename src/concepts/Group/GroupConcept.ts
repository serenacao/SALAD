import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db, ListSearchIndexesCursor } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { startRequestingServer } from "../Requesting/RequestingConcept.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Group" + ".";

export type User = ID;
export type Group = ID;
export type MembershipRequest = ID;

/**
 * State: a set of Group Groups with
 *  a string Name
 *  a user Leader
 *  a boolean privateGroup
 *  a set of User Members
 */
interface GroupDoc {
  _id: Group;
  name: string;
  leader: User;
  privateGroup: boolean;
}

interface MembershipDoc {
  _id: ID;
  member: User;
  group: Group;
}

/**
 * State: a set of MembershipRequest MembershipRequests
 *  a User Requester
 *  a Group
 */
interface MembershipRequestDoc {
  _id: MembershipRequest;
  requester: User;
  group: Group;
}

/**
 * @concept Group
 * @purposeto form larger networks of users
 */
export default class GroupConcept {
  private groups: Collection<GroupDoc>;
  private membershipRequests: Collection<MembershipRequestDoc>;
  private memberships: Collection<MembershipDoc>;

  constructor(private readonly db: Db) {
    this.groups = this.db.collection(PREFIX + "Groups");
    this.membershipRequests = this.db.collection(PREFIX + "MembershipRequests");
    this.memberships = this.db.collection(PREFIX + "Memberships");
  }

  async create({
    leader,
    name,
    privateGroup,
  }: {
    leader: User;
    name: string;
    privateGroup: boolean;
  }): Promise<{ group: Group } | { error: string }> {
    if (name === "") {
      return { error: "Name cannot be empty" };
    }
    const groupID = freshID();
    await this.groups.insertOne({
      _id: groupID,
      leader: leader,
      name: name,
      privateGroup: privateGroup,
    });
    return { group: groupID };
  }

  async request({
    user,
    group,
  }: {
    user: User;
    group: Group;
  }): Promise<{ membershipRequest: MembershipRequest } | { error: string }> {
    const matchingGroup = await this.groups.findOne({ _id: group });
    if (!matchingGroup) {
      return { error: "Group does not exist" };
    }

    const matchingMembership = await this.memberships.findOne({
      member: user,
      group: group,
    });
    if (matchingMembership) {
      return { error: "User is already a member of the group" };
    }
    const membershipRequestID = freshID();
    await this.membershipRequests.insertOne({
      _id: membershipRequestID,
      requester: user,
      group: group,
    });
    return { membershipRequest: membershipRequestID };
  }

  async accept({
    membershipRequest,
  }: {
    membershipRequest: MembershipRequest;
  }): Promise<Empty | { error: string }> {
    const matchingRequest = await this.membershipRequests.findOne({
      _id: membershipRequest,
    });

    if (!matchingRequest) {
      return { error: "Request does not exist" };
    }
    const user = matchingRequest.requester;
    const group = matchingRequest.group;
    const matchingGroup = await this.memberships.insertOne({
      _id: freshID(),
      member: user,
      group: group,
    });

    await this.membershipRequests.deleteOne({ _id: membershipRequest });

    return {};
  }

  async deny({
    membershipRequest,
  }: {
    membershipRequest: MembershipRequest;
  }): Promise<Empty | { error: string }> {
    const matchingRequest = await this.membershipRequests.findOne({
      _id: membershipRequest,
    });

    if (!matchingRequest) {
      return { error: "Request does not exist" };
    }

    await this.membershipRequests.deleteOne({ _id: membershipRequest });

    return {};
  }

  async removeMember({
    user,
    group,
  }: {
    user: User;
    group: Group;
  }): Promise<Empty | { error: string }> {
    const matchingGroup = await this.groups.findOne({ _id: group });
    if (!matchingGroup) {
      return { error: "Group does not exist" };
    }

    const matchingMembership = await this.memberships.findOne({
      member: user,
      group: group,
    });
    if (!matchingMembership) {
      return { error: "User is not a member of the group" };
    }

    await this.memberships.deleteOne({ _id: matchingMembership._id });
    return {};
  }

  async deleteGroup({
    group,
  }: {
    group: Group;
  }): Promise<Empty | { error: string }> {
    const matchingGroup = await this.groups.findOne({ _id: group });
    if (!matchingGroup) {
      return { error: "Group does not exist" };
    }

    await this.groups.deleteOne({ _id: group });
    await this.memberships.deleteMany({ group: group });
    await this.membershipRequests.deleteMany({ group: group });
    return {};
  }

  async _getGroups({
    user,
  }: {
    user: User;
  }): Promise<Array<{ group: Group; name: string; leader: User }>> {
    const membershipDocs = await this.memberships
      .find({ member: user })
      .toArray();
    const output: Array<{ group: Group; name: string; leader: User }> = [];

    const groupDocs = await Promise.all(
      membershipDocs.map((doc) => this.groups.findOne({ _id: doc.group }))
    );

    groupDocs.forEach((doc) => {
      if (doc) {
        output.push({ group: doc._id, name: doc.name, leader: doc.leader });
      }
    });
    return output;
  }

  async _getMembers({
    group,
  }: {
    group: Group;
  }): Promise<Array<{ member: User }>> {
    const membershipDocs = await this.memberships
      .find({ group: group })
      .toArray();
    const members: Array<{ member: Group }> = [];
    membershipDocs.forEach((doc) => {
      members.push({ member: doc.member });
    });
    return members;
  }

  async _getLeader({
    group,
  }: {
    group: Group;
  }): Promise<Array<{ leader: User }>> {
    const groupDoc = await this.groups.findOne({ _id: group });
    if (!groupDoc) {
      return [];
    }
    return [{ leader: groupDoc.leader }];
  }

  async _getName({
    group,
  }: {
    group: Group;
  }): Promise<Array<{ name: string }>> {
    const groupDoc = await this.groups.findOne({ _id: group });
    if (!groupDoc) {
      return [];
    }
    return [{ name: groupDoc.name }];
  }

  async _isPrivate({
    group,
  }: {
    group: Group;
  }): Promise<Array<{ isPrivate: boolean }>> {
    const groupDoc = await this.groups.findOne({ _id: group });
    if (!groupDoc) {
      return [];
    }
    return [{ isPrivate: groupDoc.privateGroup }];
  }

  async _getPublicGroups({}: {}): Promise<
    Array<{ group: Group; name: string; leader: User }>
  > {
    const groupDocs = await this.groups.find({ privateGroup: false }).toArray();

    const groups: Array<{ group: Group; name: string; leader: User }> = [];

    groupDocs.forEach((doc) => {
      groups.push({ group: doc._id, name: doc.name, leader: doc.leader });
    });

    return groups;
  }

  async _getGroupRequests({
    group,
  }: {
    group: Group;
  }): Promise<
    Array<{ membershipRequest: MembershipRequest; requester: User }>
  > {
    const requestDocs = await this.membershipRequests
      .find({ group: group })
      .toArray();

    const requests: Array<{
      membershipRequest: MembershipRequest;
      requester: User;
    }> = [];

    requestDocs.forEach((doc) => {
      requests.push({
        membershipRequest: doc._id,
        requester: doc.requester,
      });
    });

    return requests;
  }

  async _getUserRequests({
    user,
  }: {
    user: User;
  }): Promise<Array<{ membershipRequest: MembershipRequest; group: Group }>> {
    const requestDocs = await this.membershipRequests
      .find({ requester: user })
      .toArray();

    const requests: Array<{
      membershipRequest: MembershipRequest;
      group: Group;
    }> = [];

    requestDocs.forEach((doc) => {
      requests.push({
        membershipRequest: doc._id,
        group: doc.group,
      });
    });

    return requests;
  }

  async _getRequestDetails({
    membershipRequest,
  }: {
    membershipRequest: MembershipRequest;
  }): Promise<Array<{ user: User; group: Group }>> {
    const requestDoc = await this.membershipRequests.findOne({
      _id: membershipRequest,
    });
    if (!requestDoc) {
      return [];
    }
    return [{ user: requestDoc.requester, group: requestDoc.group }];
  }
}
