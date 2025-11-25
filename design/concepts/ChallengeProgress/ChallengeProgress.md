**concept** ChallengeProgress\[Challenge, User\]

**purpose** tracks challenge progress for each participant

**principle** parts are created for every challenge; parts can be marked as completed for every user

**state**

a set of Challenge UploadedChallenges

a set of Part Parts with

&ensp; a Challenge

&ensp; a number Day

&ensp; a number Week

a set of Completion Completions with

&ensp; a Part

&ensp; a User

**actions**

uploadChallenge(challenge: Challenge, daysOfWeek: Number, weeks: Number)

**requires** challenge is not in UploadedChallenges

**effect** creates a Part for every day in daysOfWeek and every week in weeks with challenge; adds them to Parts; adds challenge to UploadedChallenges

completePart(part: Part, user: User)

**requires** part exists in Parts

**effect** creates a Completion with part and user; adds it to Completions

**queries**

\_getParts(challenge: Challenge): Array of (Part, Day, Week)

**requires** challenge is in UploadedChallenges

**effect** returns every Part and the associated Day and Week for every Part with challenge

\_getCompletedParts(user: User, challenge: Challenge): Array of (Part, Day, Week)

**requires** challenge is in UploadedChallenges

**effect** returns every Part and the associated Day and Week for every Completion with user and challenge

\_allPartsCompleted(user: User, challenge: Challenge): Boolean

**requires** challenge is in UploadedChallenges

**effect** returns True if there is a Completion for user for every Part associated with challenge; returns False otherwise
