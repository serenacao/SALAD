# Leaderboard Sync

**sync** addPoints

**when** Challenges.verify(part, requester)

**where** \_getPartPoints(part): points

**then** Leaderboard.addPoints(user, points)
