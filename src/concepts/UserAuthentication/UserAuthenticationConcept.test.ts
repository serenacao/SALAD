import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { User } from "./UserAuthenticationConcept.ts";
import UserAuthenticationConcept from "./UserAuthenticationConcept.ts";
import { testDb } from "@utils/database.ts";

Deno.test("Operational principle: upload users, designate users as foodstuds, users can login", async () => {
  console.log("\n🧪 TEST CASE 1: Operational principle, simple");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const kerb1 = "amy1";
    const password1 = "p1";
    const userObject1 = await authentication.uploadUser({
      kerb: kerb1,
      password: password1,
    }) as { user: User };

    const user1 = userObject1.user;

    const kerb2 = "bob2";
    const userObject2 = await authentication.uploadUser({
      kerb: kerb2,
      password: "p2",
    }) as { user: User };

    const user2 = userObject2.user;

    const usersObject = await authentication._getUsers() as Array<{
      user: User;
    }>;

    const users: Set<User> = new Set();

    usersObject.forEach((userObject) => {
      users.add(userObject.user);
    });
    assert(users.has(user1));
    assert(users.has(user2));

    await authentication.setProduceFoodStud({ user: user1 });

    await authentication.setCostcoFoodStud({ user: user2 });

    const retrievedProduceFoodStudKerbObject = await authentication
      ._getProduceFoodStudKerb() as Array<{ produceFoodStudKerb: string }>;
    const retrievedCostcoFoodStudKerbObject = await authentication
      ._getCostcoFoodStudKerb() as Array<{ costcoFoodStudKerb: string }>;

    const retrievedProduceFoodStudKerb =
      retrievedProduceFoodStudKerbObject[0].produceFoodStudKerb;
    const retrievedCostcoFoodStudKerb =
      retrievedCostcoFoodStudKerbObject[0].costcoFoodStudKerb;
    assertEquals(retrievedProduceFoodStudKerb, kerb1);
    assertEquals(retrievedCostcoFoodStudKerb, kerb2);

    const loginUser1 = await authentication.login({
      kerb: kerb1,
      password: password1,
    }) as { user: User };
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
    const kerb1 = "amy1";
    const password1 = "p1";
    const userObject1 = await authentication.uploadUser({
      kerb: kerb1,
      password: password1,
    }) as { user: User };

    const user1 = userObject1.user as User;

    const kerb2 = "bob2";
    const userObject2 = await authentication.uploadUser({
      kerb: kerb2,
      password: "p2",
    }) as { user: User };

    const user2 = userObject2.user;

    await authentication.setProduceFoodStud({ user: user1 });

    await authentication.setCostcoFoodStud({ user: user2 });

    const newPassword = "p0";
    await authentication.updatePassword({ user: user1, newPassword });

    await authentication.login({ kerb: kerb1, password: newPassword });
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
    const kerb1 = "amy1";
    const password1 = "p1";
    const userObject1 = await authentication.uploadUser({
      kerb: kerb1,
      password: password1,
    }) as { user: User };

    const user1 = userObject1.user;

    const kerb2 = "bob2";
    const userObject2 = await authentication.uploadUser({
      kerb: kerb2,
      password: "p2",
    }) as { user: User };

    const user2 = userObject2.user;

    await authentication.removeUser({ user: user1 });
    const usersObject = await authentication._getUsers() as Array<{
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

Deno.test("Action: verifyFoodStud", async () => {
  console.log("\n🧪 TEST CASE 4: Action verifyFoodStud");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const kerb1 = "amy1";
    const password1 = "p1";
    const userObject1 = await authentication.uploadUser({
      kerb: kerb1,
      password: password1,
    }) as { user: User };

    const user1 = userObject1.user;

    const kerb2 = "bob2";
    const userObject2 = await authentication.uploadUser({
      kerb: kerb2,
      password: "p2",
    }) as { user: User };

    const user2 = userObject2.user;

    await authentication.setProduceFoodStud({ user: user1 });

    await authentication.setCostcoFoodStud({ user: user2 });

    const isFoodStudObj = await authentication._isFoodStud({ user: user1 });
    assert(isFoodStudObj[0].isFoodStud);
  } finally {
    await client.close();
  }
});

Deno.test("Action: log in as admin", async () => {
  console.log("\n🧪 TEST CASE 4: Action verifyFoodStud");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const authentication = new UserAuthenticationConcept(db);
    const kerb1 = "admin";
    const password1 = "adminPass";

    const userObject = await authentication.login({
      kerb: kerb1,
      password: password1,
    }) as { user: User };

    const resultObj = await authentication._isAdmin({
      user: userObject.user,
    }) as Array<{ isAdmin: boolean }>;
    const result = resultObj[0];
    assert(result.isAdmin, "User should be admin");
  } finally {
    await client.close();
  }
});
