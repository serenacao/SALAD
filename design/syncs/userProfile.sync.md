# User Profile syncs 

sync deleteUser()
    when UserProfile.delete(user: User)
    then Group.getGroups(user: User): (groups: Group[])
    then Group.delete(user: User, group: Group) for group in groups
    then Friending.getFriends(user: User): (friends: User[])
    then Friending.removeFriend(user: User, friend: Friend) for friend in friends

    