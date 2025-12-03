import {
  ChallengeVerification,
  ChallengeDefinition,
  ChallengeProgress,
  Requesting,
  Session,
  UserAuthentication,
} from "@concepts";
import { actions, Sync } from "@engine";

// createVerificationRequest (session should belong to requester and should only happen when challenge is open)

export const CreateVerificationRequest: Sync = ({
  session,
  actingUser,
  part,
  requester,
  approver,
  evidence,
  challenge,
  isOpen,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/createVerificationRequest",
      session,
      part,
      requester,
      approver,
      evidence,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: actingUser,
      }
    );
    frames = await frames.query(
      ChallengeProgress._getPartChallenge,
      { part },
      { challenge }
    );
    frames = await frames.query(
      ChallengeDefinition._isOpen,
      { challenge },
      { isOpen }
    );
    frames = frames.filter(($) => $[isOpen] === true);
    frames = frames.filter(($) => $[actingUser] === $[requester]);
    return frames;
  },
  then: actions([
    ChallengeVerification.createVerificationRequest,
    {
      part,
      requester,
      approver,
      evidence,
    },
  ]),
});

export const CreateVerificationRequestResponseSuccess: Sync = ({
  request,
  verificationRequest,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createVerificationRequest" }, { request }],
    [
      ChallengeVerification.createVerificationRequest,
      {},
      { verificationRequest },
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      verificationRequest,
      status: "requested verification",
    },
  ]),
});

export const CreateVerificationRequestResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createVerificationRequest" }, { request }],
    [ChallengeVerification.createVerificationRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// removeVerificationRequest

export const RemoveVerificationRequest: Sync = ({
  session,
  actingUser,
  verificationRequest,
  requester,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/removeVerificationRequest",
      session,
      verificationRequest,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: actingUser,
      }
    );
    frames = await frames.query(
      ChallengeVerification._getRequestRequester,
      { verificationRequest },
      { requester }
    );
    frames = frames.filter(($) => $[actingUser] === $[requester]);
    return frames;
  },
  then: actions([
    ChallengeVerification.removeVerificationRequest,
    {
      verificationRequest,
    },
  ]),
});

export const RemoveVerificationResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/removeVerificationRequest" }, { request }],
    [ChallengeVerification.removeVerificationRequest, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "removed verification request",
    },
  ]),
});

export const RemoveVerificationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeVerificationRequest" }, { request }],
    [ChallengeVerification.removeVerificationRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// verify (only approver should verify, and only when challenge is open)

export const VerifyRequest: Sync = ({
  session,
  actingUser,
  verificationRequest,
  part,
  challenge,
  isOpen,
  approver,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/verifyRequest",
      session,
      verificationRequest,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: actingUser,
      }
    );
    frames = await frames.query(
      ChallengeVerification._getRequestApprover,
      { verificationRequest },
      { approver }
    );
    frames = await frames.query(
      ChallengeVerification._getRequestPart,
      { verificationRequest },
      { part }
    );
    frames = await frames.query(
      ChallengeProgress._getPartChallenge,
      { part },
      { challenge }
    );
    frames = await frames.query(
      ChallengeDefinition._isOpen,
      { challenge },
      { isOpen }
    );
    frames = frames.filter(($) => $[isOpen] === true);
    frames = frames.filter(($) => $[actingUser] === $[approver]);
    return frames;
  },
  then: actions([
    ChallengeVerification.verify,
    {
      verificationRequest,
    },
  ]),
});

export const VerifyCompletePart: Sync = ({
  verificationRequest,
  part,
  user,
}) => ({
  when: actions([ChallengeVerification.verify, { verificationRequest }, {}]),
  where: async (frames) => {
    frames = await frames.query(
      ChallengeVerification._getRequestPart,
      { verificationRequest },
      {
        part,
      }
    );
    frames = await frames.query(
      ChallengeVerification._getRequestRequester,
      { verificationRequest },
      { requester: user }
    );
    return frames;
  },
  then: actions([
    ChallengeProgress.completePart,
    {
      part,
      user,
    },
  ]),
});

export const VerifyRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/verifyRequest" }, { request }],
    [ChallengeVerification.verify, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "verified request",
    },
  ]),
});

export const VerifyRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/verifyRequest" }, { request }],
    [ChallengeVerification.verify, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
