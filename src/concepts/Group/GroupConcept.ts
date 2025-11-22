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
  members: User[];
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

  constructor(private readonly db: Db) {
    this.groups = this.db.collection(PREFIX + "groups");
    this.groupRequests = this.db.collection(PREFIX + "groupRequests");
  }

  async create(
    leader: User,
    name: string,
    privateGroup: boolean
  ): Promise<{ group: Group } | { error: string }> {
    if (name === "") {
      return { error: "Name cannot be empty" };
    }
    const groupID = freshID();
    await this.groups.insertOne({
      _id: groupID,
      leader: leader,
      name: name,
      privateGroup: privateGroup,
      members: [],
    });
    return { group: groupID };
  }
}
