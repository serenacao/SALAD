# Group syncs

sync deleteGroup():
    when Group.delete(user: User, group: Group): (deletedGroup: Group)
    then Group.getMembers(deletedGroup): (members: User[])
    then Group.leave(member: User, deletedGroup) for member in members
    then Leaderboard.removeGroup(deletedGroup)

