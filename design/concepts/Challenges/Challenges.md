**concept** Challenges\[User, Group \]

**purpose** allows users to issue challenges to other users, or allows groups to issue challenges to their members

**principle** users issue challenges to each other, which have associated points; users can then complete those challenges

**state**

a set of Challenge Challenges with

&ensp; a User or Group Creator

&ensp; a set of User Participants with

&ensp; &ensp; a set of Part CompletedParts with

&ensp; &ensp; &ensp; a number Week

&ensp; &ensp; &ensp; a number Day

&ensp; a set of User Invitees

&ensp; a string Exercise

&ensp; a number Reps

&ensp; a number Sets

&ensp; a number Frequency (days per week)

&ensp; a number Duration (weeks)

&ensp; a number Level

&ensp; a number Points (per part)

&ensp; a number Bonus (upon completion of entire challenge)

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
