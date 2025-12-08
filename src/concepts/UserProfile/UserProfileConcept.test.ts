import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserProfileConcept from "./UserProfileConcept.ts";

Deno.test("UserProfileConcept", async (t) => {
  const [db, client] = await testDb();
  const userProfileConcept = new UserProfileConcept(db);

  const userA = "user:A" as ID;
  const userB = "user:B" as ID;

  await t.step("Action: createProfile", async (t) => {
    await t.step("should create a new profile for a user with default values", async () => {
      console.log(`Action: createProfile({ user: '${userA}' })`);
      const result = await userProfileConcept.createProfile({ user: userA });

      // Check effects: action should succeed
      assertEquals(result, {}, "Expected successful creation with empty object return.");

      // Check effects: state should be updated
      const profileData = await userProfileConcept._getProfile({ user: userA });
      assertEquals(profileData.length, 1, "Expected one profile to be found for user A.");
      const profile = profileData[0].profile;
      assertExists(profile);
      assertEquals(profile.location, "", "Location should be initialized as an empty string.");
      assertEquals(profile.bio, "", "Bio should be initialized as an empty string.");
      assertEquals(profile.skillLevel, "", "Skill level should be initialized as an empty string.");
      assertEquals(profile.userImg, "", "User image should be initialized as an empty string.");
      assertExists(profile.dateJoined, "dateJoined should be set.");
      console.log(`  -> Success: Profile for ${userA} created at ${profile.dateJoined}.`);
    });

    await t.step("should fail if the user already has a profile (violates requires)", async () => {
      console.log(`Action: createProfile({ user: '${userA}' }) [expect failure]`);
      const result = await userProfileConcept.createProfile({ user: userA });

      // Check effect: action should return an error
      assertEquals(result, { error: "User already has a profile." }, "Expected error for duplicate profile creation.");

      // Check that state is unchanged
      const profileData = await userProfileConcept._getProfile({ user: userA });
      assertEquals(profileData.length, 1, "Expected still only one profile for user A.");
      console.log(`  -> Success: Prevented duplicate profile creation for ${userA}.`);
    });
  });

  await t.step("Action: editProfile", async (t) => {
    await t.step("should fail if the user profile does not exist (violates requires)", async () => {
      console.log(`Action: editProfile({ user: '${userB}', ... }) [expect failure]`);
      const result = await userProfileConcept.editProfile({ user: userB, bio: "A bio for a non-existent user." });
      assertEquals(result, { error: "User profile not found." });
      console.log(`  -> Success: Prevented editing non-existent profile for ${userB}.`);
    });

    await t.step("should update specified fields for an existing user", async () => {
      const updates = {
        location: "New York",
        bio: "Software developer.",
        skillLevel: "Expert",
        userImg: "http://example.com/img.png",
      };
      console.log(`Action: editProfile({ user: '${userA}', ... })`);
      const result = await userProfileConcept.editProfile({ user: userA, ...updates });

      // Check effect: action should succeed
      assertEquals(result, {}, "Expected successful profile edit.");

      // Check effect: state should be updated
      const profileData = await userProfileConcept._getProfile({ user: userA });
      const profile = profileData[0].profile;
      assertEquals(profile.location, updates.location);
      assertEquals(profile.bio, updates.bio);
      assertEquals(profile.skillLevel, updates.skillLevel);
      assertEquals(profile.userImg, updates.userImg);
      console.log(`  -> Success: Profile for ${userA} updated.`);
    });

    await t.step("should only update provided fields and leave others unchanged", async () => {
      const originalProfile = (await userProfileConcept._getProfile({ user: userA }))[0].profile;
      const partialUpdate = { bio: "Updated bio only." };

      console.log(`Action: editProfile({ user: '${userA}', bio: '...' }) [partial update]`);
      const result = await userProfileConcept.editProfile({ user: userA, ...partialUpdate });
      assertEquals(result, {});

      const updatedProfileData = await userProfileConcept._getProfile({ user: userA });
      const updatedProfile = updatedProfileData[0].profile;

      // Check updated field
      assertEquals(updatedProfile.bio, partialUpdate.bio);
      // Check unchanged fields
      assertEquals(updatedProfile.location, originalProfile.location);
      assertEquals(updatedProfile.skillLevel, originalProfile.skillLevel);
      assertEquals(updatedProfile.userImg, originalProfile.userImg);
      // Check that dateJoined cannot be changed
      assertEquals(updatedProfile.dateJoined, originalProfile.dateJoined);
      console.log(`  -> Success: Partial update for ${userA} successful.`);
    });
  });

  await t.step("Query: _getProfile", async (t) => {
    await t.step("should return the correct profile for an existing user", async () => {
      console.log(`Query: _getProfile({ user: '${userA}' })`);
      const profileData = await userProfileConcept._getProfile({ user: userA });
      assertEquals(profileData.length, 1);
      assertExists(profileData[0].profile);
      assertEquals(profileData[0].profile.bio, "Updated bio only.");
      console.log("  -> Success: Retrieved correct profile data.");
    });

    await t.step("should return an empty array for a non-existent user", async () => {
      console.log(`Query: _getProfile({ user: '${userB}' })`);
      const profileData = await userProfileConcept._getProfile({ user: userB });
      assertEquals(profileData, []);
      console.log("  -> Success: Returned empty array for non-existent user.");
    });
  });

  await t.step("Principle Test", async () => {
    console.log("Testing Principle: If a user creates and updates a profile, others can view it.");

    const userC = "user:C" as ID;
    console.log(`1. User C creates a profile.`);
    await userProfileConcept.createProfile({ user: userC });

    const initialProfile = (await userProfileConcept._getProfile({ user: userC }))[0].profile;
    assertEquals(initialProfile.bio, "");
    console.log(`   - Profile created with default bio: "${initialProfile.bio}"`);

    const newInfo = {
      bio: "Fostering community connection!",
      userImg: "community.jpg",
    };
    console.log(`2. User C updates their profile with a bio and image.`);
    await userProfileConcept.editProfile({ user: userC, ...newInfo });

    console.log(`3. Another user (or the system) views User C's profile.`);
    const viewedProfileData = await userProfileConcept._getProfile({ user: userC });
    const viewedProfile = viewedProfileData[0].profile;

    assertNotEquals(viewedProfile, undefined, "Profile should be viewable.");
    assertEquals(viewedProfile.bio, newInfo.bio, "The viewed bio should match the updated info.");
    assertEquals(viewedProfile.userImg, newInfo.userImg, "The viewed image should match the updated info.");
    console.log(`   - Viewed profile has correct bio: "${viewedProfile.bio}"`);
    console.log("  -> Success: The principle is fulfilled.");
  });

  await client.close();
});