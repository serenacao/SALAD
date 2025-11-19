# concept Group 
- **purpose** to form larger networks of users
- **principle** users can request to join groups or just be added by groups; a group can then issue challenges to all members

**state**
a set of Group
    a user Leader
    a flag isPrivate
    a set of user Members

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
- delete(user: User, group: Group): (group: Group)
    - requires: user is authenticated and logged in, user owns the group
    - effects: user leaves and deletes the group 
    
- getGroups(user: User): (groups: Group[])
    - effects: returns list of groups owned by user 
- getMembers(group: Group): (members: User[])
    - requires: group exists
    - effects: returns list of members of group
- getLeader(group: Group): (leader: User)
    - requires: group exists
    - effects: returns leader of group 
- isPrivate(group: Group): (isPrivate: flag)
    - requires: group exists
    - effects: returns if group is private or not