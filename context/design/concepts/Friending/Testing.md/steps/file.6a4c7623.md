---
timestamp: 'Sat Nov 22 2025 15:42:29 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251122_154229.f30cce87.md]]'
content_id: 6a4c76234b930bb4d60a23982e485d7ce7064eaa385fd4f44421f7cde851f354
---

# file: src/concepts/Friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic types of this concept
type User = ID;
type FriendRequest = ID;

/**
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

export default class FriendingConcept {
  friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * requestFriend(requester: User, receiver: User): (request: FriendRequest)
   *
   * **requires** requester and receiver are not friends, and no pending request exists between them.
   *              Also, requester and receiver must be different users.
   *
   * **effects** creates a new FriendRequest; sets its requester to `requester`,
   *             receiver to `receiver`, and `accepted` to false; returns the ID of the new request.
   */
  async requestFriend(
    { requester, receiver }: { requester: User; receiver: User },
  ): Promise<{ request: FriendRequest } | { error: string }> {
    if (requester === receiver) {
      return { error: "Cannot send a friend request to yourself." };
    }

    // Check for existing friendship or pending request in either direction
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { requester: requester, receiver: receiver },
        { requester: receiver, receiver: requester },
      ],
    });

    if (existingRequest) {
      if (existingRequest.accepted) {
        return { error: "Users are already friends." };
      } else {
        // A pending request already exists. Could be from requester to receiver, or vice versa.
        // If from receiver to requester, it should be accepted instead of requesting again.
        return { error: "A pending friend request already exists." };
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
   * **requires** there exists a pending FriendRequest where `user` is the receiver
   *              and `requester` is the sender, and it has not yet been accepted.
   *
   * **effects** sets the `accepted` flag of the matching FriendRequest to true.
   */
  async acceptFriend(
    { user, requester }: { user: User; requester: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.friendRequests.updateOne(
      { requester: requester, receiver: user, accepted: false },
      { $set: { accepted: true } },
    );

    if (result.matchedCount === 0) {
      return { error: "No pending friend request found from requester to user." };
    }
    return {};
  }

  /**
   * removeFriend(user: User, requester: User): ()
   *
   * **requires** there exists a FriendRequest (accepted or not) between `user` and `requester`.
   *              The `user` must be either the original requester or receiver of the request.
   *
   * **effects** removes the FriendRequest document.
   */
  async removeFriend(
    { user, requester }: { user: User; requester: User },
  ): Promise<Empty | { error: string }> {
    // Check if a request exists in either direction (accepted or not)
    const result = await this.friendRequests.deleteOne({
      $or: [
        { requester: user, receiver: requester },
        { requester: requester, receiver: user },
      ],
    });

    if (result.deletedCount === 0) {
      return { error: "No friend request found between specified users." };
    }
    return {};
  }

  /**
   * _getFriends(user: User): (friends: User[])
   *
   * **effects** returns a list of users who are friends of the given `user`.
   *             Returns an array containing a single object, with a 'friends' key
   *             holding an array of User IDs.
   */
  async _getFriends({ user }: { user: User }): Promise<Array<{ friends: User[] }>> {
    const friendDocs = await this.friendRequests.find({
      $or: [
        { requester: user, accepted: true },
        { receiver: user, accepted: true },
      ],
    }).toArray();

    const friends: User[] = friendDocs.map((doc) =>
      doc.requester === user ? doc.receiver : doc.requester
    );

    // Ensure uniqueness, though in this design, a unique relationship should prevent duplicates.
    const uniqueFriends = [...new Set(friends)];

    return [{ friends: uniqueFriends }];
  }
}
```
