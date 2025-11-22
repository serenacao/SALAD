---
timestamp: 'Sat Nov 22 2025 15:42:41 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_154241.f078599d.md]]'
content_id: ab16864ce61edcded650946081888d0af6e2f2c61f54185f8cb9477981ff1b34
---

# file: src/concepts/Friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic types of this concept, defined as branded IDs
type User = ID;
type FriendRequest = ID;

/**
 * Interface for the MongoDB document representing a FriendRequest.
 * Corresponds to:
 * a set of FriendRequests with
 *   a user Requester
 *   a user Receiver
 *   a flag accepted
 */
interface FriendRequestDoc {
  _id: FriendRequest;
  requester: User;
  receiver: User;
  accepted: boolean;
}

/**
 * Friending Concept
 *
 * purpose: to allow for users to engage with other users through competitions, mutual workouts, and more
 *
 * principle: when a user friend requests another user and it is accepted, then the users can issue
 *            challenges to each other; when a user unfriends another user, they can’t issue challenges
 */
export default class FriendingConcept {
  // MongoDB collection for storing friend requests
  friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * requestFriend(requester: User, receiver: User): (request: FriendRequest)
   *
   * **requires**
   * - `requester` and `receiver` must be different users.
   * - No existing friend request (pending or accepted) between `requester` and `receiver`
   *   in either direction. (The concept doesn't specify if users are registered,
   *   assuming that's handled by another concept or external validation).
   *
   * **effects**
   * - Creates a new `FriendRequest` document.
   * - Sets its `_id` to a fresh ID, `requester` to the provided `requester`,
   *   `receiver` to the provided `receiver`, and `accepted` to `false`.
   * - Inserts this document into the `friendRequests` collection.
   * - Returns the ID of the newly created `FriendRequest`.
   */
  async requestFriend(
    { requester, receiver }: { requester: User; receiver: User },
  ): Promise<{ request: FriendRequest } | { error: string }> {
    if (requester === receiver) {
      return { error: "Cannot send a friend request to yourself." };
    }

    // Check for any existing relationship (pending or accepted) between the two users.
    const existingRelationship = await this.friendRequests.findOne({
      $or: [
        { requester: requester, receiver: receiver }, // requester -> receiver
        { requester: receiver, receiver: requester }, // receiver -> requester
      ],
    });

    if (existingRelationship) {
      if (existingRelationship.accepted) {
        return { error: "Users are already friends." };
      } else {
        // A pending request already exists. Could be from requester to receiver, or vice versa.
        // If it's a request *to* the current requester from the receiver, it should be accepted, not re-requested.
        return { error: "A pending friend request already exists between these users." };
      }
    }

    const newRequestId = freshID();
    const newRequest: FriendRequestDoc = {
      _id: newRequestId,
      requester: requester,
      receiver: receiver,
      accepted: false,
    };

    await this.friendRequests.insertOne(newRequest);
    return { request: newRequestId };
  }

  /**
   * acceptFriend(user: User, requester: User): ()
   *
   * **requires**
   * - There must exist a pending `FriendRequest` where `user` is the `receiver`
   *   and `requester` is the `sender`, and the `accepted` flag is `false`.
   *
   * **effects**
   * - Sets the `accepted` flag of the matching `FriendRequest` to `true`.
   */
  async acceptFriend(
    { user, requester }: { user: User; requester: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.friendRequests.updateOne(
      { requester: requester, receiver: user, accepted: false }, // Find pending request where user is receiver
      { $set: { accepted: true } },
    );

    if (result.matchedCount === 0) {
      return { error: "No pending friend request found from specified requester to user." };
    }
    return {}; // Return empty object for success
  }

  /**
   * removeFriend(user: User, requester: User): ()
   *
   * **requires**
   * - There must exist a `FriendRequest` (accepted or not) between `user` and `requester`
   *   in either direction.
   * - The `user` parameter must be one of the participants in the request (either original
   *   requester or receiver). (This implies authorization, which usually comes from syncs,
   *   but for this action, we allow either participant to initiate removal).
   *
   * **effects**
   * - Deletes the `FriendRequest` document that matches the `user` and `requester`.
   */
  async removeFriend(
    { user, requester }: { user: User; requester: User },
  ): Promise<Empty | { error: string }> {
    // Attempt to delete a request where 'user' and 'requester' are involved, in either role.
    const result = await this.friendRequests.deleteOne({
      $or: [
        { requester: user, receiver: requester },
        { requester: requester, receiver: user },
      ],
    });

    if (result.deletedCount === 0) {
      return { error: "No friend relationship or pending request found between these users." };
    }
    return {}; // Return empty object for success
  }

  /**
   * _getFriends(user: User): (friends: User[])
   *
   * **effects**
   * - Returns a list of user IDs who are currently friends with the given `user`.
   *   Friendship is defined by an `accepted: true` `FriendRequest` document
   *   where the `user` is either the `requester` or `receiver`.
   * - Returns an array containing a single object, with a 'friends' key
   *   holding an array of `User` IDs.
   */
  async _getFriends({ user }: { user: User }): Promise<Array<{ friends: User[] }>> {
    // Find all accepted friend requests where the given user is either the requester or receiver.
    const friendDocs = await this.friendRequests.find({
      accepted: true,
      $or: [
        { requester: user },
        { receiver: user },
      ],
    }).toArray();

    // Extract the friend's ID from each document.
    const friends: User[] = friendDocs.map((doc) =>
      doc.requester === user ? doc.receiver : doc.requester
    );

    // Use a Set to ensure unique friends, though logically, a single accepted request
    // between two users should prevent duplicates in this specific schema.
    const uniqueFriends = [...new Set(friends)];

    // Queries return an array of dictionaries; for a list, it's typically an array
    // containing one dictionary with the list as a key.
    return [{ friends: uniqueFriends }];
  }
}
```
