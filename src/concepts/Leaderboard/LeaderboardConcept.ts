import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Generic types from the concept specification
type User = ID;
type Group = ID;

// Collection name prefix
const PREFIX = "Leaderboard.";

/**
 * Interface for the 'Users' collection state.
 * Corresponds to: `a set of User Users with a number Points`
 */
interface UserDoc {
  _id: User;
  points: number;
}

/**
 * Interface for the 'Groups' collection state.
 * Corresponds to: `a set of Group Groups with a number Points`
 */
interface GroupDoc {
  _id: Group;
  points: number;
}

/**
 * @concept Leaderboard
 * @purpose track user or group points to create a sense of competition
 */
export default class LeaderboardConcept {
  public readonly users: Collection<UserDoc>;
  public readonly groups: Collection<GroupDoc>;

  constructor(db: Db) {
    this.users = db.collection<UserDoc>(PREFIX + "users");
    this.groups = db.collection<GroupDoc>(PREFIX + "groups");
  }

  /**
   * addUser(user: User)
   *
   * **requires** nothing
   * **effect** adds user to Users if its not already there, with 0 Points; otherwise does nothing
   */
  async addUser({ user }: { user: User }): Promise<Empty> {
    await this.users.updateOne({ _id: user }, { $setOnInsert: { _id: user, points: 0 } }, { upsert: true });
    return {};
  }

  /**
   * removeUser(user: User)
   *
   * **requires** nothing
   * **effect** removes user if it is in Users
   */
  async removeUser({ user }: { user: User }): Promise<Empty> {
    await this.users.deleteOne({ _id: user });
    return {};
  }

  /**
   * addPoints(user: User, points: number) or addPoints(group: Group, points: number)
   *
   * **requires** user is in Users or group is in Groups
   * **effect** increases Points of user or group by points
   */
  async addPoints(args: { user: User; points: number } | { group: Group; points: number }): Promise<Empty | { error: string }> {
    if ("user" in args) {
      const { user, points } = args;
      const result = await this.users.updateOne({ _id: user }, { $inc: { points } });
      if (result.matchedCount === 0) {
        return { error: `User ${user} not found` };
      }
    } else {
      const { group, points } = args;
      const result = await this.groups.updateOne({ _id: group }, { $inc: { points } });
      if (result.matchedCount === 0) {
        return { error: `Group ${group} not found` };
      }
    }
    return {};
  }

  /**
   * removePoints(user: User, points: number) or removePoints(group: Group, points: number)
   *
   * **requires** user is in Users or group is in Groups
   * **effect** reduces Points of user or group by points, unless this makes Points negative, in which case Points is set to 0
   */
  async removePoints(args: { user: User; points: number } | { group: Group; points: number }): Promise<Empty | { error: string }> {
    if ("user" in args) {
      const { user, points } = args;
      const result = await this.users.updateOne({ _id: user }, [{ $set: { points: { $max: [0, { $subtract: ["$points", points] }] } } }]);
      if (result.matchedCount === 0) {
        return { error: `User ${user} not found` };
      }
    } else {
      const { group, points } = args;
      const result = await this.groups.updateOne({ _id: group }, [{ $set: { points: { $max: [0, { $subtract: ["$points", points] }] } } }]);
      if (result.matchedCount === 0) {
        return { error: `Group ${group} not found` };
      }
    }
    return {};
  }

  /**
   * addGroup(group: Group)
   *
   * **requires** nothing
   * **effect** adds group to Groups if its not already there, with 0 Points; otherwise does nothing
   */
  async addGroup({ group }: { group: Group }): Promise<Empty> {
    await this.groups.updateOne({ _id: group }, { $setOnInsert: { _id: group, points: 0 } }, { upsert: true });
    return {};
  }

  /**
   * removeGroup(group: Group)
   *
   * **requires** nothing
   * **effect** removes group if it is in Groups
   */
  async removeGroup({ group }: { group: Group }): Promise<Empty> {
    await this.groups.deleteOne({ _id: group });
    return {};
  }

  /**
   * _getUserPoints(user: User): (points: number)
   *
   * **requires** user is in Users
   * **effect** returns Points of user
   */
  async _getUserPoints({ user }: { user: User }): Promise<{ points: number }[] | { error: string }[]> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User ${user} not found` }];
    }
    return [{ points: userDoc.points }];
  }

  /**
   * _getGroupPoints(group: Group): (points: number)
   *
   * **requires** group is in Groups
   * **effect** returns Points of group
   */
  async _getGroupPoints({ group }: { group: Group }): Promise<{ points: number }[] | { error: string }[]> {
    const groupDoc = await this.groups.findOne({ _id: group });
    if (!groupDoc) {
      return [{ error: `Group ${group} not found` }];
    }
    return [{ points: groupDoc.points }];
  }

  /**
   * _getUserRanking(users: Array<User>): Array<{user: User, points: number}>
   *
   * **requires** every User in users is in Users
   * **effect** returns an Array of (User, Points) ranked in order from highest to lowest points
   */
  async _getUserRanking({ users }: { users: User[] }): Promise<{ user: User; points: number }[] | { error: string }[]> {
    const userDocs = await this.users
      .find({ _id: { $in: users } })
      .sort({ points: -1 })
      .toArray();

    if (userDocs.length !== users.length) {
      const foundUsers = new Set(userDocs.map((u) => u._id));
      const missingUsers = users.filter((u) => !foundUsers.has(u));
      return [{ error: `Users not found: ${missingUsers.join(", ")}` }];
    }

    return userDocs.map((doc) => ({ user: doc._id, points: doc.points }));
  }

  /**
   * _getGroupRanking(groups: Array<Group>): Array<{group: Group, points: number}>
   *
   * **requires** every Group in groups is in Groups
   * **effect** returns an Array of (Group, Points) ranked in order from highest to lowest points
   */
  async _getGroupRanking({ groups }: { groups: Group[] }): Promise<{ group: Group; points: number }[] | { error: string }[]> {
    const groupDocs = await this.groups
      .find({ _id: { $in: groups } })
      .sort({ points: -1 })
      .toArray();

    if (groupDocs.length !== groups.length) {
      const foundGroups = new Set(groupDocs.map((g) => g._id));
      const missingGroups = groups.filter((g) => !foundGroups.has(g));
      return [{ error: `Groups not found: ${missingGroups.join(", ")}` }];
    }

    return groupDocs.map((doc) => ({ group: doc._id, points: doc.points }));
  }
}