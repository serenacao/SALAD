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

removeVerificationRequest(verificationRequest: VerificationRequest)

**requires** verificationRequest is in VerificationRequests

**effect** deletes verificationRequest from VerificationRequests

verify(verificationRequest: VerificationRequest)

**requires** verificationRequest is in VerificationRequests;

**effect** sets Approved to True for the associated VerificationRequest

**queries**

\_getRequestApprover(verificationRequest: VerificationRequest): User

**requires** verificationRequest is in VerificationRequests

**effect** returns Approver for verificationRequest

\_getRequestDetails(verificationRequests: Array of VerificationRequest): Array of Part, Evidence, File, Requester, Approver, Approved

**requires** every VerificationRequest in verificationRequests is in VerificationRequests

**effect** returns Part, Evidence, File, Requester, Approver, Approved for each VerificationRequest in verificationRequests

\_getRequesterActiveRequests(user: User): Array of VerificationRequest

**requires** nothing

**effect** returns every verificationRequest with Requester as user in VerificationRequests and Approved as False

\_getApproverActiveRequests(user: User): Array of VerificationRequest

**requires** nothing

**effect** returns every verificationRequest with Approver as user in VerificationRequests and Approved as False

\_isActiveRequest(part: Part, user: User): Boolean

**requires** nothing

**effect** returns True if there is a verificationRequest with part and Approver as user and Approved as False
