import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db, ListSearchIndexesCursor } from "npm:mongodb";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Group" + ".";

export type User = ID;
export type Group = ID;
export type GroupRequest = ID;

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
 * State: a set of GroupRequest GroupRequests
 *  a User Requester
 *  a Group
 */
interface GroupRequestDoc {
  _id: GroupRequest;
  requester: User;
  group: Group;
}

/**
 * @concept Group
 * @purposeto form larger networks of users
 */
export default class GroupConcept {
  private groups: Collection<GroupDoc>;
  private groupRequests: Collection<GroupRequestDoc>;
  private memberships: Collection<MembershipDoc>;

  constructor(private readonly db: Db) {
    this.groups = this.db.collection(PREFIX + "Groups");
    this.groupRequests = this.db.collection(PREFIX + "GroupRequests");
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
  }): Promise<{ groupRequest: GroupRequest } | { error: string }> {
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
    const groupRequestID = freshID();
    await this.groupRequests.insertOne({
      _id: groupRequestID,
      requester: user,
      group: group,
    });
    return { groupRequest: groupRequestID };
  }

  async accept({
    groupRequest,
  }: {
    groupRequest: GroupRequest;
  }): Promise<Empty | { error: string }> {
    const matchingRequest = await this.groupRequests.findOne({
      _id: groupRequest,
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

    await this.groupRequests.deleteOne({ _id: groupRequest });

    return {};
  }

  async deny({
    groupRequest,
  }: {
    groupRequest: GroupRequest;
  }): Promise<Empty | { error: string }> {
    const matchingRequest = await this.groupRequests.findOne({
      _id: groupRequest,
    });

    if (!matchingRequest) {
      return { error: "Request does not exist" };
    }

    await this.groupRequests.deleteOne({ _id: groupRequest });

    return {};
  }

  async leave({
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

  async delete({
    group,
  }: {
    group: Group;
  }): Promise<Empty | { error: string }> {
    const matchingGroup = await this.groups.findOne({ _id: group });
    if (!matchingGroup) {
      return { error: "Group does not exist" };
    }

    await this.groups.deleteOne({ _id: group });
    return {};
  }

  async _getGroups({ user }: { user: User }): Promise<Array<{ group: Group }>> {
    const membershipDocs = await this.memberships
      .find({ member: user })
      .toArray();
    const groups: Array<{ group: Group }> = [];
    membershipDocs.forEach((doc) => {
      groups.push({ group: doc.group });
    });
    return groups;
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
}
