import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuthentication" + ".";

export type User = ID;
/**
 * State: A set of Users with a kerb and a password.
 */
interface UserDoc {
  _id: User;
  kerb: string;
  password: string;
  isAdmin: boolean;
  isProduceFoodStud: boolean;
  isCostcoFoodStud: boolean;
}

/**
 * State: two foodstuds
 */
interface FoodStudDoc {
  _id: ID;
  produceFoodStud: User | null;
  costcoFoodStud: User | null;
}
/**
 * @concept UserAuthentication
 * @purpose to verify whether certain users are allowed to perform certain actions, like editing the cooking assignments
 */
export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "Users");
  }

  private async initialize(): Promise<Empty | { error: string }> {
    const existingAdminObj = await this.users.findOne({ isAdmin: true });
    if (!existingAdminObj) {
      await this.users.insertOne({
        _id: freshID(),
        kerb: "admin",
        password: "adminPass",
        isAdmin: true,
        isProduceFoodStud: false,
        isCostcoFoodStud: false,
      });
    }
    return {};
  }

  async uploadUser(
    { kerb, password }: { kerb: string; password: string },
  ): Promise<
    { user: User; isAdmin: boolean; isFoodStud: boolean } | { error: string }
  > {
    try {
      await this.initialize();
      // check that there is no user with this kerb
      const matchingKerbUser = await this.users.findOne({ kerb: kerb });
      assert(matchingKerbUser === null, "User already exists with this kerb");

      const userID = freshID();
      const user: UserDoc = {
        _id: userID,
        kerb: kerb,
        password: password,
        isAdmin: false,
        isProduceFoodStud: false,
        isCostcoFoodStud: false,
      };
      await this.users.insertOne(user);
      return { user: userID, isAdmin: false, isFoodStud: false };
    } catch (error) {
      console.error(
        "❌ Error uploading user",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async removeUser(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    try {
      await this.initialize();
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "User does not exist");
      assert(
        !userDoc.isProduceFoodStud && !userDoc.isCostcoFoodStud,
        "Cannot remove foodstud",
      );
      await this.users.deleteOne({ _id: user });
      return {};
    } catch (error) {
      console.error(
        "❌ Error removing user",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async updateKerb(
    { user, newKerb }: { user: User; newKerb: string },
  ): Promise<Empty | { error: string }> {
    try {
      await this.initialize();
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "This user does not exist");
      assert(!userDoc.isAdmin, "Cannot update kerb of admin");
      const oldKerb = userDoc.kerb;
      assert(
        oldKerb !== newKerb,
        "New password cannot be the same as old password",
      );
      await this.users.updateOne({ _id: user }, {
        $set: { kerb: newKerb },
      });
      return {};
    } catch (error) {
      console.error(
        "❌ Error updating kerb",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async updatePassword(
    { user, newPassword }: { user: User; newPassword: string },
  ): Promise<Empty | { error: string }> {
    try {
      await this.initialize();
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "This user does not exist");
      assert(!userDoc.isAdmin, "Cannot update password of admin");
      const oldPassword = userDoc.password;
      assert(
        oldPassword !== newPassword,
        "New password cannot be the same as old password",
      );
      await this.users.updateOne({ _id: user }, {
        $set: { password: newPassword },
      });
      return {};
    } catch (error) {
      console.error(
        "❌ Error updating password",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async login(
    { kerb, password }: { kerb: string; password: string },
  ): Promise<
    {
      user: User;
      isAdmin: boolean;
      isProduceFoodStud: boolean;
      isCostcoFoodStud: boolean;
    } | { error: string }
  > {
    try {
      await this.initialize();

      const userDoc = await this.users.findOne({ kerb: kerb });
      assertExists(userDoc, "User does not exist");
      assertEquals(userDoc.password, password, "Wrong password");
      await this.users.updateOne({ _id: userDoc._id }, {
        $set: { loggedIn: true },
      });
      return {
        user: userDoc._id,
        isAdmin: userDoc.isAdmin,
        isProduceFoodStud: userDoc.isProduceFoodStud,
        isCostcoFoodStud: userDoc.isCostcoFoodStud,
      };
    } catch (error) {
      console.error(
        "❌ Error on login",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async setProduceFoodStud(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    try {
      await this.initialize();
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "User does not exist");
      await this.users.updateOne({ isProduceFoodStud: true }, {
        $set: { isProduceFoodStud: false },
      });
      await this.users.updateOne({ _id: user }, {
        $set: { isProduceFoodStud: true },
      });
      return {};
    } catch (error) {
      console.error(
        "❌ Error setting produce foodstud",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async setCostcoFoodStud(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    try {
      await this.initialize();
      const userDoc = await this.users.findOne({ _id: user });
      assertExists(userDoc, "User does not exist");
      await this.users.updateOne({ isCostcoFoodStud: true }, {
        $set: { isCostcoFoodStud: false },
      });
      await this.users.updateOne({ _id: user }, {
        $set: { isCostcoFoodStud: true },
      });
      return {};
    } catch (error) {
      console.error(
        "❌ Error setting costco foodstud",
        (error as Error).message,
      );
      return { error: (error as Error).message };
    }
  }

  async _isFoodStud(
    { user }: { user: User },
  ): Promise<Array<{ isFoodStud: boolean }>> {
    await this.initialize();
    const produceFoodStudDoc = await this.users.findOne({
      isProduceFoodStud: true,
    });
    const costcoFoodStudDoc = await this.users.findOne({
      isCostcoFoodStud: true,
    });

    if (produceFoodStudDoc) {
      if (produceFoodStudDoc._id === user) {
        return [{ isFoodStud: true }];
      }
    }

    if (costcoFoodStudDoc) {
      if (costcoFoodStudDoc._id === user) {
        return [{ isFoodStud: true }];
      }
    }

    return [{
      isFoodStud: false,
    }];
  }

  async _isAdmin(
    { user }: { user: User },
  ): Promise<Array<{ isAdmin: boolean }>> {
    await this.initialize();
    const userDoc = await this.users.findOne({ isAdmin: true });
    assertExists(userDoc, "Admin not initialized");
    return [{ isAdmin: userDoc._id === user }];
  }

  async _getCostcoFoodStudKerb(): Promise<
    Array<{ costcoFoodStudKerb: string }>
  > {
    await this.initialize();
    const costcoFoodStudDoc = await this.users.findOne({
      isCostcoFoodStud: true,
    });
    if (costcoFoodStudDoc === null) {
      return [{ costcoFoodStudKerb: "" }];
    } else {
      return [{ costcoFoodStudKerb: costcoFoodStudDoc.kerb }];
    }
  }

  async _getProduceFoodStudKerb(): Promise<
    Array<{ produceFoodStudKerb: string }>
  > {
    await this.initialize();
    const produceFoodStudDoc = await this.users.findOne({
      isProduceFoodStud: true,
    });
    if (produceFoodStudDoc === null) {
      return [{ produceFoodStudKerb: "" }];
    } else {
      return [{ produceFoodStudKerb: produceFoodStudDoc.kerb }];
    }
  }

  async _getUsers(): Promise<
    Array<{ user: User; kerb: string }>
  > {
    const users = await this.users.find({ isAdmin: false }).toArray();
    const output: Array<{ user: User; kerb: string }> = [];

    users.forEach((userDoc) => {
      output.push({ user: userDoc._id, kerb: userDoc.kerb });
    });

    return output;
  }

  async _getKerb(
    { user }: { user: User },
  ): Promise<Array<{ kerb: string }>> {
    const userDoc = await this.users.findOne({ _id: user });
    assertExists(userDoc, "User does not exist");
    return [{ kerb: userDoc.kerb }];
  }

  async _getUser(
    { kerb }: { kerb: string },
  ): Promise<Array<{ user: User }>> {
    const userDoc = await this.users.findOne({ kerb: kerb, isAdmin: false });
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
