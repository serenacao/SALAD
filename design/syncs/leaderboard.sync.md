# Leaderboard Sync

**sync** addPoints

**when** Challenges.verify(part, requester: user)

**where** Challenges.\_getPartPoints(part): points

**where** Group.\_getGroup(user): groups

**then** Leaderboard.addPoints(user, points)

**then** Leaderboard.addPoints(group, points) for group in groups

**sync** addPoints

**when** Challenges.verify(part, requester: user)

**where** Challenges.\_getChallengePoints(part): bonusPoints

**where** Challenges.\_getAssociatedChallenge(part): challenge

**where** Challenges.isCompletedChallenge(challenge, user): True

**where** Group.\_getGroup(user): groups

**then** Leaderboard.addPoints(user, bonusPoints)

**then** Leaderboard.addPoints(group, bonusPoints) for group in groups

**sync** removeUser

**when** UserAuthentication.removeUser(user)

**then** Leaderboard.removeUser(user)
