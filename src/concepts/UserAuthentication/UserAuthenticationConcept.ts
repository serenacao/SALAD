import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

export type User = ID;
/**
 * State: A set of Users with a username and a password.
 */
interface UserDoc {
  _id: User;
  username: string;
  password: string;
}

/**
 * @concept UserAuthentication
 * @purpose to verify whether certain users are allowed to perform certain actions
 */
export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "Users");
  }

  async uploadUser({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ user: User } | { error: string }> {
    try {
      // check that there is no user with this username
      const matchingUsernameUser = await this.users.findOne({
        username: username,
      });
      assert(
        matchingUsernameUser === null,
        "User already exists with this username"
      );

      const userID = freshID();
      const user: UserDoc = {
        _id: userID,
        username: username,
        password: password,
      };
      await this.users.insertOne(user);
      return { user: userID };
    } catch (error) {
      console.error("❌ Error uploading user", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async removeUser({
    user,
  }: {
    user: User;
  }): Promise<Empty | { error: string }> {
    try {
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "User does not exist");

      await this.users.deleteOne({ _id: user });
      return {};
    } catch (error) {
      console.error("❌ Error removing user", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async updateusername({
    user,
    newusername,
  }: {
    user: User;
    newusername: string;
  }): Promise<Empty | { error: string }> {
    try {
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "This user does not exist");
      const oldUsername = userDoc.username;
      assert(
        oldUsername !== newusername,
        "New password cannot be the same as old password"
      );
      await this.users.updateOne(
        { _id: user },
        {
          $set: { username: newusername },
        }
      );
      return {};
    } catch (error) {
      console.error("❌ Error updating username", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async updatePassword({
    user,
    newPassword,
  }: {
    user: User;
    newPassword: string;
  }): Promise<Empty | { error: string }> {
    try {
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "This user does not exist");
      const oldPassword = userDoc.password;
      assert(
        oldPassword !== newPassword,
        "New password cannot be the same as old password"
      );
      await this.users.updateOne(
        { _id: user },
        {
          $set: { password: newPassword },
        }
      );
      return {};
    } catch (error) {
      console.error("❌ Error updating password", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async login({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<
    | {
        user: User;
      }
    | { error: string }
  > {
    try {
      const userDoc = await this.users.findOne({ username: username });
      assertExists(userDoc, "User does not exist");
      assertEquals(userDoc.password, password, "Wrong password");
      await this.users.updateOne(
        { _id: userDoc._id },
        {
          $set: { loggedIn: true },
        }
      );
      return {
        user: userDoc._id,
      };
    } catch (error) {
      console.error("❌ Error on login", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async _getUsers(): Promise<Array<{ user: User; username: string }>> {
    const users = await this.users.find().toArray();
    const output: Array<{ user: User; username: string }> = [];

    users.forEach((userDoc) => {
      output.push({ user: userDoc._id, username: userDoc.username });
    });

    return output;
  }

  async _getUsername({
    user,
  }: {
    user: User;
  }): Promise<Array<{ username: string }>> {
    const userDoc = await this.users.findOne({ _id: user });
    assertExists(userDoc, "User does not exist");
    return [{ username: userDoc.username }];
  }

  async _getUser({
    username,
  }: {
    username: string;
  }): Promise<Array<{ user: User }>> {
    const userDoc = await this.users.findOne({
      username: username,
    });
    assertExists(userDoc);
    return [{ user: userDoc._id }];
  }

  async _isUser({ user }: { user: User }): Promise<Array<{ isUser: boolean }>> {
    const userDoc = await this.users.findOne({ _id: user });
    if (userDoc) {
      return [{ isUser: true }];
    } else {
      return [{ isUser: false }];
    }
  }
}
