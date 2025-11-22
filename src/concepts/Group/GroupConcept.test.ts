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

      assertEquals(publicGroups.length, 1);

      const publicGroup = publicGroups[0];

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

      console.log("Successfully created a membership request");

      await groupConcept.accept({
        membershipRequest: membershipRequest.membershipRequest,
      });

      const members = await groupConcept._getMembers({
        group: groupObject.group,
      });

      assertEquals(members.length, 1);

      const member = members[0];

      assertEquals(member.member, user);

      console.log("Successfully accepted membership");
    } finally {
      await client.close();
    }
  }
);
