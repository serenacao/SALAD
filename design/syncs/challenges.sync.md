# Challenges Sync

**sync** removeUser

**when** UserAuthentication.removeUser(user)

**where** Challenges.\_getChallenges(user): challenges

**then** Challenges.leaveChallenge(challenge, user) for challenge in challenges
