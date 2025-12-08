import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db, ListSearchIndexesCursor } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { startRequestingServer } from "../Requesting/RequestingConcept.ts";
import { timingSafeEqual } from "node:crypto";

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
    console.log("input params", leader, name , privateGroup);
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
    await this.memberships.insertOne({
      _id: freshID(),
      member: leader,
      group: groupID,
    });
    console.log("created group with id", groupID);
    console.log("with leader", leader);
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

  // ------------------------------
// Get groups the user is in
// ------------------------------
async _getGroups({
  user,
}: {
  user: User;
}): Promise<Array<{ group: Group; name: string; leader: User }>> {
  const membershipDocs = await this.memberships.find({ member: user }).toArray();
  const groupDocs = await Promise.all(
    membershipDocs.map((doc) => this.groups.findOne({ _id: doc.group }))
  );

  const groups = groupDocs
    .filter((doc) => doc)
    .map((doc) => ({
      group: doc!._id,
      name: doc!.name,
      leader: doc!.leader,
    }));

  return groups ;
}

// ------------------------------
// Get members of a group
// ------------------------------
async _getMembers({
  group,
}: {
  group: Group;
}): Promise<User[]> {
  const membershipDocs = await this.memberships.find({ group }).toArray();

  return membershipDocs.map((doc) => doc.member);
}

// ------------------------------
// Get leader of group
// ------------------------------
async _getLeader({
  group,
}: {
  group: Group;
}): Promise<[{leader: User | null}]> {
  const groupDoc = await this.groups.findOne({ _id: group });
  return [{ leader: groupDoc ? groupDoc.leader : null }];
}

// ------------------------------
// Get name of group
// ------------------------------
async _getName({
  group,
}: {
  group: Group;
}): Promise<[{ name: string | null }]> {
  const groupDoc = await this.groups.findOne({ _id: group });
  return [{ name: groupDoc ? groupDoc.name : null }];
}

// ------------------------------
// Get privacy status
// ------------------------------
async _isPrivate({
  group,
}: {
  group: Group;
}): Promise<[{ isPrivate: boolean | null }]> {
  const groupDoc = await this.groups.findOne({ _id: group });
  return [{ isPrivate: groupDoc ? groupDoc.privateGroup : null }];
}

// ------------------------------
// Get all public groups
// ------------------------------
async _getPublicGroups({}): Promise<
  Array<{ group: Group; name: string; leader: User }>
> {
  const groupDocs = await this.groups.find({ privateGroup: false }).toArray();

  return groupDocs.map((doc) => ({
      group: doc._id,
      name: doc.name,
      leader: doc.leader,
    }));
}

// ------------------------------
// Get membership requests for a group
// ------------------------------
async _getGroupRequests({
  group,
}: {
  group: Group;
}): Promise<
  Array<{ membershipRequest: MembershipRequest; requester: User }>
> {
  const requestDocs = await this.membershipRequests.find({ group }).toArray();

  return requestDocs.map((doc) => ({
      membershipRequest: doc._id,
      requester: doc.requester,
    }));
}

// ------------------------------
// Get requests made by a user
// ------------------------------
async _getUserRequests({
  user,
}: {
  user: User;
}): Promise<
  Array<{ membershipRequest: MembershipRequest; group: Group }>> {
  const requestDocs = await this.membershipRequests
    .find({ requester: user })
    .toArray();

  return requestDocs.map((doc) => ({
      membershipRequest: doc._id,
      group: doc.group,
    }));
}

// ------------------------------
// Get details for a single membership request
// ------------------------------
async _getRequestDetails({
  membershipRequest,
}: {
  membershipRequest: MembershipRequest;
}): Promise<[{ user: User | null; group: Group | null }]> {
  const requestDoc = await this.membershipRequests.findOne({
    _id: membershipRequest,
  });

  if (!requestDoc) return [{ user: null, group: null }];

  return [{
    user: requestDoc.requester,
    group: requestDoc.group,
  }];
}

}
