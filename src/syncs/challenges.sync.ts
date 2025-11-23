import { Challenges, Requesting, Session, UserAuthentication } from "@concepts";
import { actions, Sync } from "@engine";

// createChallenge

export const CreateChallengeRequest: Sync = ({
  session,
  actingUser,
  exercise,
  level,
  info,
  daysOfWeek,
  weeks,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/createChallenge",
      session,
      exercise,
      daysOfWeek,
      weeks,
      level,
      info,
      creator,
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
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    Challenges.createChallenge,
    {
      exercise,
      daysOfWeek,
      weeks,
      level,
      info,
      creator,
    },
  ]),
});

export const CreateChallengeResponseSuccess: Sync = ({
  request,

  challenge,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createChallenge" }, { request }],
    [Challenges.createChallenge, {}, { challenge }]
  ),
  then: actions([
    Requesting.respond,
    {
      challenge,
      status: "created challenge",
    },
  ]),
});

export const CreateChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/createGroup" }, { request }],
    [Challenges.createChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// openChallenge

export const OpenChallengeRequest: Sync = ({
  session,
  actingUser,
  challenge,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/openChallenge",
      session,
      challenge,
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
      Challenges._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    Challenges.openChallenge,
    {
      challenge,
    },
  ]),
});

export const OpenChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/openChallenge" }, { request }],
    [Challenges.openChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "opened challenge",
    },
  ]),
});

export const OpenChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/openChallenge" }, { request }],
    [Challenges.openChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// closeChallenge

export const CloseChallengeRequest: Sync = ({
  session,
  actingUser,
  challenge,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/closeChallenge",
      session,
      challenge,
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
      Challenges._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    Challenges.closeChallenge,
    {
      challenge,
    },
  ]),
});

export const CloseChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/closeChallenge" }, { request }],
    [Challenges.closeChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "closed challenge",
    },
  ]),
});

export const CloseChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/closeChallenge" }, { request }],
    [Challenges.closeChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// deleteChallenge

export const DeleteChallengeRequest: Sync = ({
  session,
  actingUser,
  challenge,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/deleteChallenge",
      session,
      challenge,
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
      Challenges._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    Challenges.deleteChallenge,
    {
      challenge,
    },
  ]),
});

export const DeleteChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/deleteChallenge" }, { request }],
    [Challenges.deleteChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "deleted challenge",
    },
  ]),
});

export const DeleteChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/deleteChallenge" }, { request }],
    [Challenges.deleteChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// inviteUsers

export const InviteUsersRequest: Sync = ({
  session,
  actingUser,
  challenge,
  users,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/inviteUsers",
      session,
      challenge,
      users,
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
      Challenges._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    Challenges.inviteUsers,
    {
      challenge,
      users,
    },
  ]),
});

export const InviteUsersResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/inviteUsers" }, { request }],
    [Challenges.inviteUsers, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "invited users",
    },
  ]),
});

export const InviteUsersResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/inviteUsers" }, { request }],
    [Challenges.inviteUsers, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// acceptChallenge

export const AcceptChallengeRequest: Sync = ({
  session,
  actingUser,
  challenge,
  user,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/acceptChallenge",
      session,
      challenge,
      user,
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
    frames = frames.filter(($) => $[actingUser] === $[user]);
    return frames;
  },
  then: actions([
    Challenges.acceptChallenge,
    {
      challenge,
      user,
    },
  ]),
});

export const AcceptChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/acceptChallenge" }, { request }],
    [Challenges.acceptChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "accepted challenge",
    },
  ]),
});

export const AcceptChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/acceptChallenge" }, { request }],
    [Challenges.acceptChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// removeFromChallenge

export const RemoveFromChallengeRequest: Sync = ({
  session,
  actingUser,
  challenge,
  user,
  creator,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/removeFromChallenge",
      session,
      challenge,
      user,
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
      Challenges._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(
      ($) => $[actingUser] === $[user] || $[actingUser] === $[creator]
    );
    return frames;
  },
  then: actions([
    Challenges.removeFromChallenge,
    {
      challenge,
      user,
    },
  ]),
});

export const RemoveFromChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/removeFromChallenge" }, { request }],
    [Challenges.removeFromChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "removed user from challenge",
    },
  ]),
});

export const RemoveFromChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeFromChallenge" }, { request }],
    [Challenges.removeFromChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

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
    Challenges.createVerificationRequest,
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
    [Challenges.createVerificationRequest, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "requester verification",
    },
  ]),
});

export const CreateVerificationRequestResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createVerificationRequest" }, { request }],
    [Challenges.createVerificationRequest, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// verify

export const VerifyRequest: Sync = ({
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
      path: "/verifyRequest",
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
    Challenges.createVerificationRequest,
    {
      part,
      requester,
      approver,
      evidence,
    },
  ]),
});

export const VerifyRequestResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/verifyRequest" }, { request }],
    [Challenges.verify, {}, {}]
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
    [Challenges.verify, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
