import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { Session, User } from "./SessionConcept.ts";
import SessionConcept from "./SessionConcept.ts";
import { freshID, testDb } from "@utils/database.ts";

/**
 * Test case 1: Operational principle
 * Demonstrates basic functionality
 */
Deno.test("Operational principle: upload sessions, retrieve user for a session, delete session", async () => {
  console.log("\n🧪 TEST CASE 1: Operational principle");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const sessionConcept = new SessionConcept(db);
    const user = freshID();
    const session = await sessionConcept.create({ user: user }) as {
      session: Session;
    };
    const retrievedUserObj = await sessionConcept._getUser({
      session: session.session,
    }) as Array<{ user: User }>;
    assert(retrievedUserObj, "User not created");
    const retrievedUser = retrievedUserObj[0];
    assertEquals(user, retrievedUser.user, "Wrong user created");

    await sessionConcept.delete({ session: session.session });
  } finally {
    await client.close();
  }
});
