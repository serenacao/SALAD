import { assert } from "jsr:@std/assert/assert";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { User, Group, MembershipRequest } from "./GroupConcept.ts";
import GroupConcept from "./GroupConcept.ts";
import { freshID, testDb } from "@utils/database.ts";

Deno.test(
  "Operational principle: create groups, request membership to groups, approve membership to groups",
  async () => {
    console.log("\n🧪 TEST CASE 1: Operational principle, simple");
    console.log("==================================");
    const [db, client] = await testDb();
    try {
      const groupConcept = new GroupConcept(db);
      const name = "Gym";
      const leader = freshID() as User;
      const privateGroup = false;
      const groupObject = (await groupConcept.create({
        name: name,
        leader: leader,
        privateGroup: privateGroup,
      })) as { group: Group };

      const publicGroups = await groupConcept._getPublicGroups({});

      assertEquals(publicGroups.groups.length, 1);

      const publicGroup = publicGroups.groups[0];

      assertEquals(publicGroup.group, groupObject.group, "Incorrect group");
      assertEquals(publicGroup.leader, leader, "Incorrect leader");
      assertEquals(publicGroup.name, name, "Incorrect group");

      console.log("Successfully created a group");

      const user = freshID() as User;

      const membershipRequest = (await groupConcept.request({
        user: user,
        group: groupObject.group,
      })) as { membershipRequest: MembershipRequest };

      const userRequests = await groupConcept._getUserRequests({ user: user });

      assertEquals(userRequests.length, 1);

      const userRequest = userRequests[0];

      assertEquals(userRequest.group, groupObject.group, "Incorrect group");
      assertEquals(
        userRequest.membershipRequest,
        membershipRequest.membershipRequest,
        "Incorrect group request"
      );

      const groupRequests = await groupConcept._getGroupRequests({
        group: groupObject.group,
      });

      assertEquals(groupRequests.length, 1);

      const groupRequest = groupRequests[0];
      assertEquals(groupRequest.requester, user, "Incorrect user");
      assertEquals(
        groupRequest.membershipRequest,
        membershipRequest.membershipRequest,
        "Incorrect group request"
      );

      console.log("Successfully created a membership request");

      await groupConcept.accept({
        membershipRequest: membershipRequest.membershipRequest,
      });

      const members = await groupConcept._getMembers({
        group: groupObject.group,
      });

      assertEquals(members.length, 2);


      console.log("Successfully accepted membership");
    } finally {
      await client.close();
    }
  }
);

Deno.test("Action: deny", async () => {
  console.log("\n🧪 TEST CASE 2: deny");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const groupConcept = new GroupConcept(db);
    const name = "Gym";
    const leader = freshID() as User;
    const privateGroup = false;
    const groupObject = (await groupConcept.create({
      name: name,
      leader: leader,
      privateGroup: privateGroup,
    })) as { group: Group };

    const publicGroups = await groupConcept._getPublicGroups({});

    const publicGroup = publicGroups.groups[0];

    const user = freshID() as User;

    const membershipRequest = (await groupConcept.request({
      user: user,
      group: groupObject.group,
    })) as { membershipRequest: MembershipRequest };

    const userRequests = await groupConcept._getUserRequests({ user: user });

    const userRequest = userRequests[0];

    await groupConcept.deny({
      membershipRequest: membershipRequest.membershipRequest,
    });

    const groupRequests = await groupConcept._getGroupRequests({
      group: groupObject.group,
    });

    assertEquals(groupRequests.length, 0);

    const members = await groupConcept._getMembers({
      group: groupObject.group,
    });

    assertEquals(members.length, 1);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeMember", async () => {
  console.log("\n🧪 TEST CASE 3: removeMember");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const groupConcept = new GroupConcept(db);
    const name = "Gym";
    const leader = freshID() as User;
    const privateGroup = false;
    const groupObject = (await groupConcept.create({
      name: name,
      leader: leader,
      privateGroup: privateGroup,
    })) as { group: Group };

    const publicGroups = await groupConcept._getPublicGroups({});

    const publicGroup = publicGroups.groups[0];

    const user = freshID() as User;

    const membershipRequest = (await groupConcept.request({
      user: user,
      group: groupObject.group,
    })) as { membershipRequest: MembershipRequest };

    await groupConcept.accept({
      membershipRequest: membershipRequest.membershipRequest,
    });

    await groupConcept.removeMember({ user: user, group: groupObject.group });

    const members = await groupConcept._getMembers({
      group: groupObject.group,
    });

    assertEquals(members.length, 1);
  } finally {
    await client.close();
  }
});

Deno.test(
  "Operational principle: create multiple groups, request membership to groups, approve membership to groups",
  async () => {
    console.log("\n🧪 TEST CASE 4: Operational principle, more complex");
    console.log("==================================");
    const [db, client] = await testDb();
    try {
      const groupConcept = new GroupConcept(db);
      const group1Object = (await groupConcept.create({
        name: "Gym1",
        leader: freshID(),
        privateGroup: false,
      })) as { group: Group };
      const group2Object = (await groupConcept.create({
        name: "Gym2",
        leader: freshID(),
        privateGroup: false,
      })) as { group: Group };

      const publicGroups = await groupConcept._getPublicGroups({});

      assertEquals(publicGroups.groups.length, 2);

      console.log("Successfully created 2 public groups");

      const user1 = freshID() as User;

      const user2 = freshID() as User;

      const membershipRequest1Object = (await groupConcept.request({
        user: user1,
        group: group1Object.group,
      })) as { membershipRequest: MembershipRequest };

      const membershipRequest2Object = (await groupConcept.request({
        user: user2,
        group: group1Object.group,
      })) as { membershipRequest: MembershipRequest };

      const membershipRequest3Object = (await groupConcept.request({
        user: user2,
        group: group2Object.group,
      })) as { membershipRequest: MembershipRequest };

      const userRequests = await groupConcept._getUserRequests({ user: user2 });

      assertEquals(userRequests.length, 2);

      const groupRequests = await groupConcept._getGroupRequests({
        group: group1Object.group,
      });

      assertEquals(groupRequests.length, 2);

      await groupConcept.accept({
        membershipRequest: membershipRequest1Object.membershipRequest,
      });

      await groupConcept.accept({
        membershipRequest: membershipRequest2Object.membershipRequest,
      });

      await groupConcept.deny({
        membershipRequest: membershipRequest3Object.membershipRequest,
      });

      const members1 = await groupConcept._getMembers({
        group: group1Object.group,
      });

      assertEquals(members1.length, 3);

      const members2 = await groupConcept._getMembers({
        group: group2Object.group,
      });

      assertEquals(members2.length, 1);

      console.log("Successfully accepted membership");
    } finally {
      await client.close();
    }
  }
);

Deno.test("State: private group", async () => {
  console.log("\n🧪 TEST CASE 5: Private group");
  console.log("==================================");
  const [db, client] = await testDb();
  try {
    const groupConcept = new GroupConcept(db);
    const name = "Gym";
    const leader = freshID() as User;
    const privateGroup = true;
    const groupObject = (await groupConcept.create({
      name: name,
      leader: leader,
      privateGroup: privateGroup,
    })) as { group: Group };

    const publicGroups = await groupConcept._getPublicGroups({});

    assertEquals(publicGroups.groups.length, 0);

    const user = freshID() as User;

    const membershipRequest = (await groupConcept.request({
      user: user,
      group: groupObject.group,
    })) as { membershipRequest: MembershipRequest };

    const userRequests = await groupConcept._getUserRequests({ user: user });

    assertEquals(userRequests.length, 1);

    const userRequest = userRequests[0];

    assertEquals(userRequest.group, groupObject.group, "Incorrect group");
    assertEquals(
      userRequest.membershipRequest,
      membershipRequest.membershipRequest,
      "Incorrect group request"
    );

    const groupRequests = await groupConcept._getGroupRequests({
      group: groupObject.group,
    });

    assertEquals(groupRequests.length, 1);

    const groupRequest = groupRequests[0];
    assertEquals(groupRequest.requester, user, "Incorrect user");
    assertEquals(
      groupRequest.membershipRequest,
      membershipRequest.membershipRequest,
      "Incorrect group request"
    );

    console.log("Successfully created a membership request");

    await groupConcept.accept({
      membershipRequest: membershipRequest.membershipRequest,
    });

    const members = await groupConcept._getMembers({
      group: groupObject.group,
    });

    assertEquals(members.length, 2);

  

    console.log("Successfully accepted membership");

    const userGroups = await groupConcept._getGroups({ user: user });

    assertEquals(userGroups.groups.length, 1);
  } finally {
    await client.close();
  }
});
