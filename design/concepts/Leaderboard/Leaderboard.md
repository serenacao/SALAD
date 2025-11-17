**concept** Leaderboard \[User, Group\]

**purpose** track user or group points to create a sense of competition

**principle** after accruing points, users can view a point ranking of them and their friends, within their groups, and locally

**state**

a set of User Users with

&ensp; a number Points

a set of Group Groups with

&ensp; a number Points

**actions**

addUser(user: User)

**requires** nothing

**effect** adds user to Users if its not already there, with 0 Points; otherwise does nothing

removeUser(user: User)

**requires** nothing

**effect** removes user if it is in Users

addPoints(user: User, points: number)

**requires** user is in Users

**effect** increases Points of user by points

removePoints(user: User, points: number)

**requires** user is in Users

**effect** reduces Points of user by points, unless this makes Points negative, in which case Points is set to 0

addGroup(group: Group)

**requires** nothing

**effect** adds group to Groups if its not already there, with 0 Points; otherwise does nothing

removeGroup(group: Group)

**requires** nothing

**effect** removes group if it is in Groups

addPoints(group: Group, points: number)

**requires** group is in Groups

**effect** increases Points of group by points

removePoints(group: Group, points: number)

**requires** group is in Groups

**effect** reduces Points of group by points, unless this makes Points negative, in which case Points is set to 0

**queries**

\_getUserPoints(user: User): number

**requires** user is in Users

**effect** returns Points of user

\_getGroupPoints(group: Group): number

**requires** group is in Groups

**effect** returns Points of group

\_getUserRanking(users: Array of User): Array of (User, Points)

**requires** every User in users is in Users

**effect** returns an Array of (User, Points) ranked in order from highest to lowest points

\_getGroupRanking(groups: Array of Group): Array of (Group, Points)

**requires** every Group in groups is in Groups

**effect** returns an Array of (Group, Points) ranked in order from highest to lowest points
