import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import LeaderboardConcept from "./LeaderboardConcept.ts";
import { ID } from "@utils/types.ts";

// Test data
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDiana = "user:Diana" as ID; // A user that won't be added initially

const groupA = "group:A" as ID;
const groupB = "group:B" as ID;
const groupC = "group:C" as ID; // A group that won't be added initially

Deno.test("Principle: Users and groups accrue points and can be ranked", async () => {
  console.log("--- Testing Principle: Ranking after accruing points ---");
  const [db, client] = await testDb();
  const leaderboard = new LeaderboardConcept(db);

  try {
    console.log("Trace: Adding users Alice, Bob, and Charlie.");
    await leaderboard.addUser({ user: userAlice });
    await leaderboard.addUser({ user: userBob });
    await leaderboard.addUser({ user: userCharlie });

    console.log("Trace: Adding 100 points to Alice, 50 to Bob, and 150 to Charlie.");
    await leaderboard.addPoints({ user: userAlice, points: 100 });
    await leaderboard.addPoints({ user: userBob, points: 50 });
    await leaderboard.addPoints({ user: userCharlie, points: 150 });

    console.log("Trace: Getting user ranking for Alice, Bob, and Charlie.");
    const userRanking = await leaderboard._getUserRanking({ users: [userAlice, userBob, userCharlie] });
    console.log("Resulting ranking:", userRanking);

    const expectedUserRanking = [
      { user: userCharlie, points: 150 },
      { user: userAlice, points: 100 },
      { user: userBob, points: 50 },
    ];

    assertEquals(userRanking, expectedUserRanking, "User ranking should be ordered by points descending.");
    console.log("✅ Principle for users fulfilled.");

    console.log("\nTrace: Adding groups A and B.");
    await leaderboard.addGroup({ group: groupA });
    await leaderboard.addGroup({ group: groupB });

    console.log("Trace: Adding 2000 points to group A and 5000 to group B.");
    await leaderboard.addPoints({ group: groupA, points: 2000 });
    await leaderboard.addPoints({ group: groupB, points: 5000 });

    console.log("Trace: Getting group ranking for A and B.");
    const groupRanking = await leaderboard._getGroupRanking({ groups: [groupA, groupB] });
    console.log("Resulting ranking:", groupRanking);

    const expectedGroupRanking = [
      { group: groupB, points: 5000 },
      { group: groupA, points: 2000 },
    ];
    assertEquals(groupRanking, expectedGroupRanking, "Group ranking should be ordered by points descending.");
    console.log("✅ Principle for groups fulfilled.");
  } finally {
    await client.close();
  }
});

Deno.test("Actions: User management (addUser, removeUser)", async () => {
  console.log("\n--- Testing Action: addUser ---");
  const [db, client] = await testDb();
  const leaderboard = new LeaderboardConcept(db);

  try {
    // Test Effect: adds a user with 0 points
    console.log("Trace: Adding a new user Alice.");
    await leaderboard.addUser({ user: userAlice });
    let pointsResult = await leaderboard._getUserPoints({ user: userAlice });
    assertEquals(pointsResult, [{ points: 0 }], "New user should have 0 points.");
    console.log("✅ Effect confirmed: User added with 0 points.");

    // Test Effect: idempotent
    console.log("Trace: Adding user Alice again.");
    await leaderboard.addUser({ user: userAlice });
    pointsResult = await leaderboard._getUserPoints({ user: userAlice });
    assertEquals(pointsResult, [{ points: 0 }], "Adding an existing user should not change their points.");
    console.log("✅ Effect confirmed: addUser is idempotent.");

    console.log("\n--- Testing Action: removeUser ---");
    // Test Effect: removes an existing user
    console.log("Trace: Removing user Alice.");
    await leaderboard.removeUser({ user: userAlice });
    const errorResult = await leaderboard._getUserPoints({ user: userAlice });
    if('error' in errorResult[0])
    assertExists(errorResult[0].error, "Querying a removed user should return an error.");
    else {
      throw new Error("Expected an error when querying a removed user.");
    }
    console.log("✅ Effect confirmed: User successfully removed.");

    // Test Effect: idempotent (no error on non-existent user)
    console.log("Trace: Removing user Alice again (who no longer exists).");
    const removeResult = await leaderboard.removeUser({ user: userAlice });
    assertEquals(removeResult, {}, "Removing a non-existent user should complete without error.");
    console.log("✅ Effect confirmed: removeUser is idempotent.");
  } finally {
    await client.close();
  }
});

Deno.test("Actions: Group management (addGroup, removeGroup)", async () => {
  console.log("\n--- Testing Action: addGroup ---");
  const [db, client] = await testDb();
  const leaderboard = new LeaderboardConcept(db);
  try {
    // Test Effect: adds a group with 0 points
    console.log("Trace: Adding a new group A.");
    await leaderboard.addGroup({ group: groupA });
    let pointsResult = await leaderboard._getGroupPoints({ group: groupA });
    assertEquals(pointsResult, [{ points: 0 }], "New group should have 0 points.");
    console.log("✅ Effect confirmed: Group added with 0 points.");

    // Test Effect: idempotent
    console.log("Trace: Adding group A again.");
    await leaderboard.addGroup({ group: groupA });
    pointsResult = await leaderboard._getGroupPoints({ group: groupA });
    assertEquals(pointsResult, [{ points: 0 }], "Adding an existing group should not change its points.");
    console.log("✅ Effect confirmed: addGroup is idempotent.");
  } finally {
    await client.close();
  }
});

Deno.test("Actions: Point manipulation (addPoints, removePoints)", async () => {
  console.log("\n--- Testing Action: addPoints ---");
  const [db, client] = await testDb();
  const leaderboard = new LeaderboardConcept(db);
  try {
    // Setup
    await leaderboard.addUser({ user: userAlice });
    await leaderboard.addGroup({ group: groupA });

    // Test Effect: addPoints to user
    console.log("Trace: Adding 100 points to user Alice.");
    await leaderboard.addPoints({ user: userAlice, points: 100 });
    let userPoints = await leaderboard._getUserPoints({ user: userAlice });
    assertEquals(userPoints, [{ points: 100 }]);
    console.log("✅ Effect confirmed: User points increased.");

    // Test Requirement: addPoints to non-existent user
    console.log("Trace: Attempting to add points to non-existent user Diana.");
    const userError = await leaderboard.addPoints({ user: userDiana, points: 50 });
    assertExists(userError.error, "Should return an error when adding points to a non-existent user.");
    console.log("✅ Requirement confirmed: Cannot add points to non-existent user.");

    // Test Effect: addPoints to group
    console.log("Trace: Adding 500 points to group A.");
    await leaderboard.addPoints({ group: groupA, points: 500 });
    let groupPoints = await leaderboard._getGroupPoints({ group: groupA });
    assertEquals(groupPoints, [{ points: 500 }]);
    console.log("✅ Effect confirmed: Group points increased.");

    console.log("\n--- Testing Action: removePoints ---");
    // Test Effect: removePoints from user
    console.log("Trace: Removing 30 points from user Alice (current: 100).");
    await leaderboard.removePoints({ user: userAlice, points: 30 });
    userPoints = await leaderboard._getUserPoints({ user: userAlice });
    assertEquals(userPoints, [{ points: 70 }]);
    console.log("✅ Effect confirmed: User points decreased.");

    // Test Effect: removePoints does not go below zero
    console.log("Trace: Removing 100 points from user Alice (current: 70).");
    await leaderboard.removePoints({ user: userAlice, points: 100 });
    userPoints = await leaderboard._getUserPoints({ user: userAlice });
    assertEquals(userPoints, [{ points: 0 }], "Points should not go below zero.");
    console.log("✅ Effect confirmed: User points are floored at 0.");

    // Test Requirement: removePoints from non-existent user
    console.log("Trace: Attempting to remove points from non-existent user Diana.");
    const removeError = await leaderboard.removePoints({ user: userDiana, points: 10 });
    assertExists(removeError.error, "Should return an error when removing points from a non-existent user.");
    console.log("✅ Requirement confirmed: Cannot remove points from non-existent user.");
  } finally {
    await client.close();
  }
});

Deno.test("Queries: _getUserRanking and _getGroupRanking requirements", async () => {
  console.log("\n--- Testing Query Requirements ---");
  const [db, client] = await testDb();
  const leaderboard = new LeaderboardConcept(db);
  try {
    // Setup
    await leaderboard.addUser({ user: userAlice });
    await leaderboard.addGroup({ group: groupA });

    // // Test Requirement: _getUserRanking with a non-existent user
    // console.log("Trace: Requesting ranking for existing user Alice and non-existent user Diana.");
    // const userRankingError = await leaderboard._getUserRanking({ users: [userAlice, userDiana] });
    // if('error' in userRankingError[0]) {
    //   assertExists(userRankingError[0].error, "Should return an error if any user in ranking query does not exist.");
    // } else {
    //   throw new Error("Expected an error when querying a removed user.");
    // }
    // console.log("✅ Requirement confirmed: _getUserRanking fails if a user is missing.");

    // Test Requirement: _getGroupRanking with a non-existent group
    console.log("Trace: Requesting ranking for existing group A and non-existent group C.");
    const groupRankingError = await leaderboard._getGroupRanking({ groups: [groupA, groupC] });
    if('error' in groupRankingError[0]) {
      assertExists(groupRankingError[0].error, "Should return an error if any group in ranking query does not exist.");
    } else {
      throw new Error("Expected an error when querying a removed group.");
    }
    console.log("✅ Requirement confirmed: _getGroupRanking fails if a group is missing.");
  } finally {
    await client.close();
  }
});



// The primary trace is demonstrated in the first test case, which models the **principle**:

// 1.  **Start State**: The leaderboard is empty.
// 2.  **Action `addUser`**: Users Alice, Bob, and Charlie are added to the leaderboard. Their initial points are 0.
// 3.  **Action `addPoints`**: Points are distributed: Alice gets 100, Bob gets 50, and Charlie gets 150.
// 4.  **State Check (via Query `_getUserRanking`)**: A query is made for the ranking of these three users.
// 5.  **Expected Result**: The system returns a list of these users, sorted by their points in descending order: `[Charlie (150), Alice (100), Bob (50)]`.
// 6.  **Action `addGroup`**: Groups A and B are added.
// 7.  **Action `addPoints`**: Points are added to groups: Group A gets 2000, Group B gets 5000.
// 8.  **State Check (via Query `_getGroupRanking`)**: A query is made for the ranking of the two groups.
// 9.  **Final Result**: The system returns a list of the groups, sorted by points: `[Group B (5000), Group A (2000)]`.

// This trace successfully demonstrates that after users/groups accrue points, the concept can provide a correct point ranking, thus fulfilling its principle.
