**concept** Group \[User\]

**purpose** to form larger networks of users

**principle** users can request to join groups or just be added by groups; a group can then issue challenges to all members

**state**

a set of Group Groups

&ensp; a string Name

&ensp; a user Leader

&ensp; a boolean Private

&ensp; a set of User Members

a set of MembershipRequest MembershipRequests

&ensp; a User Requester

&ensp; a Group

**actions**

create(leader: User, name: string, private: boolean): (group: Group)

**requires** name is not an empty string

**effect** creates a group with name, private, leader

request(user: User, group: Group): (membershipRequest: MembershipRequest)

**requires** group is in Groups, user is not in group

**effect** creates a MembershipRequest with group and user as Requester

accept(request: MembershipRequest)

**requires** request is in MembershipRequests

**effect** adds Requester of request to Members for Group of request; deletes request from MembershipRequests

deny(request: MembershipRequest)

**requires** request is in MembershipRequests

**effect** removes request from MembershipRequests

leave(user: User, group: Group)

**requires** group is in Groups; user is in Members for group

**effect** removes user from Members for group

delete(group: Group)

**requires** group is in Groups

**effect** removes group from Groups

**queries**

\_getGroups(user: User): (groups: Group[])

**requires** nothing

**effect** returns list of groups owned by user

\_getMembers(group: Group): (members: User[])

**requires** group is in Groups

**effect** returns Members of group

\_getLeader(group: Group): (leader: User)

**requires** group is in Groups

**effect** returns Leader of group

\_getName(group: Group): string

**requires** group is in Groups

**effect** returns Name of group

\_isPrivate(group: Group): (isPrivate: flag)

**requires** group is in Groups

**effect** returns Private of group

\_getPublicGroups(): Array of Group

**requires** nothing

**effect** returns every group in Group where Private is True

\_getGroupRequests(group: Group): Array of GroupRequest

**requires** group exists in Group

**effect** returns all GroupRequests where Group is group

\_getUserRequests(user: User): Array of GroupRequest

**requires** nothing

**effect** returns all GroupRequests where Requester is user
