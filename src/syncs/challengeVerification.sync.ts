import {
  ChallengeVerification,
  Requesting,
  Session,
  UserAuthentication,
} from "@concepts";
import { actions, Sync } from "@engine";

// createVerificationRequest

export const CreateVerificationRequest: Sync = ({
  session,
  actingUser,
  part,
  requester,
  approver,
  evidence,
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
}) => ({
  when: actions(
    [Requesting.request, { path: "/createVerificationRequest" }, { request }],
    [ChallengeVerification.createVerificationRequest, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
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

export const RemoveVerificationRequestResponseSuccess: Sync = ({
  request,
}) => ({
  when: actions(
    [Requesting.request, { path: "/removeVerificationRequest" }, { request }],
    [ChallengeVerification.removeVerificationRequest, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "removed verification request",
    },
  ]),
});

export const RemoveRequestResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeVerificationRequest" }, { request }],
    [ChallengeVerification.removeVerificationRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// verify

export const VerifyRequest: Sync = ({
  session,
  actingUser,
  verificationRequest,
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

export const VerifyRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/verifyRequest" }, { request }],
    [ChallengeVerification.verify, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
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
