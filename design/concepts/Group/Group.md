# concept Group 
- **purpose** to form larger networks of users
- **principle** users can request to join groups or just be added by groups; a group can then issue challenges to all members

**state**
a set of Group
    a user Leader
    a flag isPrivate
    a set of user Users

a set of GroupRequests
    a user Requester
    a group Group

**actions**
- create(user: User, name: string, isPrivate: flag): (group: Group)
    - requires: user is authenticated and logged in
    - effects: creates a group with name and is request-only if isPrivate is true
- request(user: User, group: Group): (request: GroupRequest)
    - requires: user is authenticated and logged in, group exists, user is not in group
    - effects: creates a group request for user to join the group if the group is private
- accept(user: User, request: GroupRequest): (group: Group)
    - requires: user is authenticated and logged in, user owns the group that is being requested
    - effects: accepts join request, adds requester to the group
- deny(user: User, request: GroupRequest): (group: Group)
    - requires: user is authenticated and logged in, user owns the group that is being requested
    - effects: denies join request, group is unchanged
- leave(user: User, group: Group): (group: Group)
    - requires: user is authenticated and logged in, user belongs to the group
    - effects: user leaves the group
- delete(user: User, group: Group)
    - requires: user is authenticated and logged in, user owns the group
    - effects: user deletes the group, all users in the group automatically leave