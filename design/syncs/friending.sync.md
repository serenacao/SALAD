# User Authentication Syncs
- Friend Request Request
  - when: Request.requestFriend(reciever: User, session)
  - where: Sessioning: User associated with session is requester
  - then: Friending.requestFriend(requester, reciever)

- Friend Request Response
  - when: Friending.requestFriend():(request: FriendRequest)
  - then: Requesting.respond(request)

- Accept Request Request
  - when: Request.acceptFriend(requester: User, session)
  - where: Sessioning: User associated with session is user
  - then: Friending.acceptFriend(user, requester)

- Accept Request Response
  - when: Friending.acceptFriend():()
  - then: Requesting.respond(success: "Accepted friend")

- Remove Friend Request
  - when: Request.removeFriend(requester: User, session)
  - where: Sessioning: User associated with session is user
  - then: Friending.removeFriend(user, requester)

- Remove Friend Response
  - when: Friending.removeFriend():()
  - then: Requesting.respond(success: "Removed friend")

- getFriends
  - when: Requesting.getFriends(session)
  - where:
    - Sessioning: User associated with session is user
    - Friending: friends is set of all friends
  - then: Requesting.respond(friends)

# Deleted User Syncs
- Remove Deleted Friend
  - when: UserAuthentication.removeUser(user)
  - where: friend: User is friends with user
  - then: Friending.removeFriend(friend, user)
