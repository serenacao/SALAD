**concept** Challenges\[User, Group \]

**purpose** allows users to issue challenges to other users, or allows groups to issue challenges to their members

**principle** users issue challenges to each other, which have associated points; users can then complete those challenges

**state**

a set of Challenge Challenges with

&ensp; a User or Group Creator

&ensp; a string Exercise

&ensp; an optional number Reps

&ensp; an optional number Sets

&ensp; an optional number Weight (in kg)

&ensp; an optional number Minutes

&ensp; a number Frequency (days per week)

&ensp; a number Duration (weeks)

&ensp; a number Level (1 to 3)

&ensp; a set of Users with

&ensp; &ensp; a boolean Accepted

&ensp; &ensp; a boolean Completed

&ensp; a number Points (per part)

&ensp; a number BonusPoints (upon completion of entire challenge)

&ensp; a boolean Open

a set of Part Parts with

&ensp; a Challenge

&ensp; a number Day

&ensp; a number Week

&ensp; a set of User Completers

a set of VerificationRequest VerificationRequests with

&ensp; a User Requester

&ensp; a User Approver

&ensp; a Challenge

&ensp; a Part

&ensp; a file Evidence

&ensp; a boolean Approved

**invariants**

For each Challenge, no User is in both Invitees and Participants

For each VerificationRequest, Requester is distinct from Approver

**actions**

createChallenge(creator: User or Group, level: number, exercise: string, reps?: number, sets?: number, weight?: number, minutes?: number, frequency: number, duration: number)

**requires** level is an integer in \{1, 2, 3\}, reps and sets are positive integers if they exist, weight and minutes are positive numbers if they exist

**effect** creates a new Challenge with the given fields, Open set to False, calculates Points based on level and BonusPoints based on level, frequency and duration; creates a new Part for every week and day of the challenge with Completers set to an empty set

openChallenge(challenge: Challenge)

**requires** challenge exists in Challenges

**effect** sets Open for challenge to True if it was False, otherwise does nothing

closeChallenge(challenge: Challenge)

**requires** challenge exists in Challenge

**effect** sets Open for challenge to False if it was True, otherwise does nothing

deleteChallenge(challenge: Challenge)

**requires** challenge exists in Challenges

**effect** deletes challenge from Challenges

inviteToChallenge(challenge: Challenge, users: Array of User)

**requires** challenge exists in Challenges

**effect** adds every User in users to Users with Accepted and Completed set to False

acceptChallenge(challenge: Challenge, user: User)

**requires** challenge exists in Challenges, user is in Users for challenge

**effect** sets Accepted for user to True if Accepted was False, otherwise does nothing

leaveChallenge(challenge: Challenge, user: User)

**requires** challenge exists in Challenges, user is in Users for challenge

**effect** deletes User from from Users and also from any Completers sets it was apart of

completePart(part: Part, user: User)

**requires** challenge has Open set to True; user is in Users and has Accepted set to True

**effect** adds user to the Completers set for part; if all parts associated with Challenge have user in its Completers set, marks Completed as True for this user in challenge

createVerificationRequest(part: Part, requester: User, approver: User, evidence: File)

**requires** part exists in Parts; Challenge associated with part has Open set to True

**effect** creates a new VerificationRequest with requester, approver, part, the Challenge associated with part, evidence and Approved set to False

verify(part: Part, requester: User)

**requires** there is a VerificationRequest associated with part and requester; Challenge associated with part has Open set to True

**effect** sets Approved to True for the associated VerificationRequest

**queries**

\_isUserCreator(challenge: Challenge, user: User): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not user is Creator for Challenge

\_isGroupCreator(challenge: Challenge, group: Group): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not group is Creator for Challenge

\_isParticipant(challenge: Challenge, user: User): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not user is in Users for challenge and whether Accepted is true for user

\_isInvited(challenge: Challenge, user: User): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not user is in Users for challenge

\_isOpen(challenge: Challenge): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not challenge has Open set to True

\_isCompletedPart(part: Part, user: User): Boolean

**requires** part exists in Parts

**effect** returns whether or not part has user in its Completers set

\_isCompletedChallenge(challenge: Challenge, user: User): Boolean

**requires** challenge exists in Challenges, user is in Users for challenge

**effect** returns Completed for user in challenge

\_getParticipants(challenge: Challenge): Array of User

**requires** challenge exists in Challenges

**effect** returns every user in Users for this challenge where Accepted is True

\_getInvitees(challenge: Challenge): Array of User

**requires** challenge exists in Challenges

**effect** returns every user in Users for this challenge

\_getCompleters(challenge: Challenge): Array of User

**requires** challenge exists in Challenge

**effect** returns every user in Users for this challenge where Completed is True

\_getChallengeDetails(challenge: Challenge): Array of Dict

**requires** challenge exists in Challenges

**effect** returns Exercise, Level, Frequency, Duration, Reps, Sets, Minutes, Weight for this Challenge

\_getCreator(challenge: Challenge): User or Group

**requires** challenge exists in Challenges

**effect** returns Creator for challenge

\_getPartPoints(part: Part): Number

**requires** part exists in Parts

**effect** returns Points for the Challenge associated with part

\_getChallengePoints(challenge: Challenge): Number

**requires** challenge exists in Challenges

**effect** returns BonusPoints for challenge

\_getChallenges(user: User): Array of Challenge

**requires** nothing

**effect** returns every Challenge for which user is in Users and has Accepted as True

\_getAssociatedChallenge(part: Part): Challenge

**requires** part is in Parts

**effect** returns Challenge associated with Part
