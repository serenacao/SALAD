import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix, using the concept name
const PREFIX = "UserProfile" + ".";

// Generic type parameters for this concept
type User = ID;

/**
 * Represents the state for a single user's profile.
 * Corresponds to the state definition:
 * A set of Users with
 * - a location String
 * - a bio String
 * - a skillLevel String
 * - a dateJoined Date
 * - a userImg String
 */
interface Profile {
  _id: User;
  location: string;
  bio: string;
  skillLevel: string;
  dateJoined: Date;
  userImg: string;
}

/**
 * UserProfile Concept
 * purpose: Enable users to establish a public identity and share personal information
 * within the application community.
 */
export default class UserProfileConcept {
  profiles: Collection<Profile>;

  constructor(private readonly db: Db) {
    this.profiles = this.db.collection(PREFIX + "profiles");
  }

  /**
   * createProfile (user: User)
   *
   * **requires**
   * - The `user` does not already have a profile in this concept's state.
   *
   * **effects**
   * - Adds the `user` to the set of users managed by this concept.
   * - Sets the `dateJoined` for the `user` to the current time.
   * - Initializes `location`, `bio`, `skillLevel`, and `userImg` to empty values.
   */
  async createProfile({ user }: { user: User }): Promise<Empty | { error: string }> {
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (existingProfile) {
      return { error: "User already has a profile." };
    }

    await this.profiles.insertOne({
      _id: user,
      location: "",
      bio: "",
      skillLevel: "",
      dateJoined: new Date(),
      userImg: "",
    });

    return {};
  }

  /**
   * editProfile (user: User, location?: String, bio?: String, skillLevel?: String, userImg?: String)
   *
   * **requires**
   * - The `user` has an existing profile in this concept's state.
   *
   * **effects**
   * - Updates the profile information for the specified `user` with the provided values.
   * - Only provided fields are updated; omitted fields remain unchanged.
   * - `dateJoined` cannot be modified by this action.
   */
  async editProfile({ user, location, bio, skillLevel, userImg }: { user: User; location?: string; bio?: string; skillLevel?: string; userImg?: string }): Promise<Empty | { error: string }> {
    const existingProfile = await this.profiles.findOne({ _id: user });
    if (!existingProfile) {
      return { error: "User profile not found." };
    }

    console.log('editing profile:', { user, location, bio, skillLevel, userImg });

    const updates: Partial<Omit<Profile, "_id" | "dateJoined">> = {};
    if (location !== undefined) updates.location = location;
    if (bio !== undefined) updates.bio = bio;
    if (skillLevel !== undefined) updates.skillLevel = skillLevel;
    if (userImg !== undefined) updates.userImg = userImg;

    if (Object.keys(updates).length > 0) {
      await this.profiles.updateOne({ _id: user }, { $set: updates });
    }
    console.log('profile updated successfully');

    return {};
  }

  /**
   * _getProfile (user: User): (profile: {location, bio, skillLevel, dateJoined, userImg})
   *
   * **requires**
   * - The specified `user` has an existing profile.
   *
   * **effects**
   * - Returns an object containing all profile attributes for the specified `user`.
   * - If no profile is found, returns an empty array.
   */
  async _getProfile({ user }: { user: User }): Promise<{ profile: Omit<Profile, "_id"> }[]> {
    const profileDoc = await this.profiles.findOne({ _id: user }, { projection: { _id: 0 } });

    if (!profileDoc) {
      return [];
    }

    // The type assertion is safe because we projected out _id and profileDoc is not null.
    const profile = profileDoc as Omit<Profile, "_id">;

    return [{ profile }];
  }
}