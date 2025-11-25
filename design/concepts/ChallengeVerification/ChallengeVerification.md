**concept** ChallengeVerification\[Part, User\]

**purpose** enables social verification of challenge completion

**principle** a user creates a verification request; the requested user can then approve it

**state**

a set of VerificationRequests with

&ensp; a Part

&ensp; a file Evidence

&ensp; a User Requester

&ensp; a User Approver

&ensp; a boolean Approved

**actions**

createVerificationRequest(part: Part, requester: User, approver: User, evidence: File): verificationRequest

**requires** nothing

**effect** creates a new VerificationRequest with requester, approver, part, evidence and Approved set to False; adds it to VerificationRequests

verify(verificationRequest: VerificationRequest)

**requires** verificationRequest is in VerificationRequests;

**effect** sets Approved to True for the associated VerificationRequest
