# concept Friending
- **purpose** to allow for users to engage with other users through competitions, mutual workouts, and more
- **principle** when a user friend requests another user and it is accepted, then the users can issue challenges to each other; when a user unfriends another user, they can’t issue challenges

**state**

a set of FriendRequests
    a user Requester 
    a user Receiver
    a flag accepted


**actions**
- requestFriend(requester: User, receiver: User): (request: FriendRequest)
    - requires: requester, receiver are not friends and both registered users
    - effects: sends a friend request from requester to receiver

- acceptFriend(user: User, request: FriendRequest): (request: FriendRequest)
    - requires: the receiver of the request is user 
    - effects: sets the flag to true, requester and receiver are friends

- removeFriend(user: User, request: FriendRequest): ()
    - requires: user is the requester or receiver of the request
    - effects: removes the friendrequest