import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { User } from "./UserAuthenticationConcept.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { testDb } from "@utils/database.ts";

Deno.test("Operational principle: upload users, users can login", async () => {
  console.log("\n🧪 TEST CASE 1: Operational principle, simple");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const username1 = "amy1";
    const password1 = "p1";
    const userObject1 = (await authentication.uploadUser({
      username: username1,
      password: password1,
    })) as { user: User };

    const user1 = userObject1.user;

    const username2 = "bob2";
    const userObject2 = (await authentication.uploadUser({
      username: username2,
      password: "p2",
    })) as { user: User };

    const user2 = userObject2.user;

    const usersObject = (await authentication._getUsers()) as Array<{
      user: User;
    }>;

    const users: Set<User> = new Set();

    usersObject.forEach((userObject) => {
      users.add(userObject.user);
    });
    assert(users.has(user1));
    assert(users.has(user2));

    const loginUser1 = (await authentication.login({
      username: username1,
      password: password1,
    })) as { user: User };
    assertEquals(loginUser1.user, user1);
  } finally {
    await client.close();
  }
});

Deno.test("Action: updatePassword", async () => {
  console.log("\n🧪 TEST CASE 2: Action updatePassword");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const username1 = "amy1";
    const password1 = "p1";
    const userObject1 = (await authentication.uploadUser({
      username: username1,
      password: password1,
    })) as { user: User };

    const user1 = userObject1.user as User;

    const username2 = "bob2";
    const userObject2 = (await authentication.uploadUser({
      username: username2,
      password: "p2",
    })) as { user: User };

    const user2 = userObject2.user;

    const newPassword = "p0";
    await authentication.updatePassword({ user: user1, newPassword });

    await authentication.login({ username: username1, password: newPassword });
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeUser", async () => {
  console.log("\n🧪 TEST CASE 3: Action removeUser");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const username1 = "amy1";
    const password1 = "p1";
    const userObject1 = (await authentication.uploadUser({
      username: username1,
      password: password1,
    })) as { user: User };

    const user1 = userObject1.user;

    const username2 = "bob2";
    const userObject2 = (await authentication.uploadUser({
      username: username2,
      password: "p2",
    })) as { user: User };

    const user2 = userObject2.user;

    await authentication.removeUser({ user: user1 });
    const usersObject = (await authentication._getUsers()) as Array<{
      user: User;
    }>;

    const users: Set<User> = new Set();

    usersObject.forEach((userObject) => {
      users.add(userObject.user);
    });
    assert(!users.has(user1));
  } finally {
    await client.close();
  }
});
