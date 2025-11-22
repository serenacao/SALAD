import { Empty, ID } from "@utils/types.ts";
import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Session" + ".";

export type User = ID;
export type Session = ID;

/**
 * State: a set of Session Sessions with a User
 */
interface SessionDoc {
  _id: Session;
  user: User;
}

/**
 * @concept Session
 * @purpose maintain a user's logged-in state across multiple requests without re-sending credentials
 */
export default class SessionConcept {
  private sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "Sessions");
  }

  async create({
    user,
  }: {
    user: User;
  }): Promise<{ session: Session } | { error: string }> {
    try {
      const session = freshID() as Session;
      await this.sessions.insertOne({ _id: session, user: user });
      return { session: session };
    } catch (error) {
      console.error("❌ Error creating session", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async delete({
    session,
  }: {
    session: Session;
  }): Promise<Empty | { error: string }> {
    try {
      await this.sessions.deleteOne({ _id: session });
      return {};
    } catch (error) {
      console.error("❌ Error deleting session", (error as Error).message);
      return { error: (error as Error).message };
    }
  }

  async _getUser({
    session,
  }: {
    session: Session;
  }): Promise<Array<{ user: User }>> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    assert(sessionDoc, "Session does not exist");
    return [{ user: sessionDoc.user }];
  }
}
