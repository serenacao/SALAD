**concept** ChallengeParticipation\[Challenge, User\]

**purpose** tracks challenge invitations and participation

**principle** an invitation for a challenge can be issued to users; those users can accept the invitation; users can leave or be removed from the their participation

**state**

a set of Participation Participations with

&ensp; a Challenge

&ensp; a User

&ensp; a boolean Completed

a set of Invitation Invitations with

&ensp; a Challenge

&ensp; a User

**actions**

createInvitation(challenge: Challenge, user: User): Invitation

**requires** nothing

**effect** creates an Invitation with challenge and user and adds it to Invitations; returns it

acceptInvitation(invitation: Invitation): Participation

**requires** invitation exists in Invitations

**effect** creates a Participation with the Challenge and User of invitation and Completed set to False; adds it to Participations; returns it

removeInvitation(invitation: Invitation)

**requires** invitation exists in Invitations

**effect** deletes invitation from Invitations

removeParticipation(participation: Participation)

**requires** participation exists in Participations

**effect** deletes participation from Participations

completeChallenge(participation: Participation)

**requires** participation exists in Participations

**effect** sets Completed to True for participation

**queries**

\_getChallengeParticipants(challenge: Challenge): Array of User

**requires** nothing

**effect** returns every User of every Participation associated with challenge

\_getChallengeInvitees(challenge: Challenge): Array of User

**requires** nothing

**effect** returns every User of every Invitation associated with challenge

\_getUserParticipations(user: User): Array of Challenge

**requires** nothing

**effect** returns every Challenge of every Participation associated with user

\_getUserInvitations(user: User): Array of Challenge

**requires** nothing

**effect** returns every Challenge of every Invitation associated with user
