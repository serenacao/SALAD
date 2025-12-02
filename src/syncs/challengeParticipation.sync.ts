import {
  ChallengeParticipation,
  ChallengeDefinition,
  Requesting,
  Session,
  UserAuthentication,
  ChallengeProgress,
} from "@concepts";
import { actions, Sync } from "@engine";

// createInvitation (only challenge creator should invite)

export const CreateInvitationRequest: Sync = ({
  session,
  actingUser,
  challenge,
  user,
  request,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/createInvitation",
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
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    ChallengeParticipation.createInvitation,
    {
      challenge,
      user,
    },
  ]),
});

export const CreateInvitationResponseSuccess: Sync = ({
  request,
  invitation,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createInvitation" }, { request }],
    [ChallengeParticipation.createInvitation, {}, { invitation }]
  ),
  then: actions([
    Requesting.respond,
    {
      invitation,
      status: "created invitation",
    },
  ]),
});

export const CreateInvitationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/createInvitation" }, { request }],
    [ChallengeParticipation.createInvitation, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// acceptInvitation (only invitee should accept)

export const AcceptInvitationRequest: Sync = ({
  session,
  actingUser,
  invitation,
  user,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/acceptInvitation",
      session,
      invitation,
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
      ChallengeParticipation._getInvitationUser,
      { invitation },
      { user }
    );
    frames = frames.filter(($) => $[actingUser] === $[user]);
    return frames;
  },
  then: actions([
    ChallengeParticipation.acceptInvitation,
    {
      invitation,
    },
  ]),
});

export const AcceptInvitationResponseSuccess: Sync = ({
  request,
  participation,
}) => ({
  when: actions(
    [Requesting.request, { path: "/acceptInvitation" }, { request }],
    [ChallengeParticipation.acceptInvitation, {}, { participation }]
  ),
  then: actions([
    Requesting.respond,
    {
      participation,
      status: "accepted invitation and created participation",
    },
  ]),
});

export const AcceptInvitationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/acceptInvitation" }, { request }],
    [ChallengeParticipation.acceptInvitation, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// removeInvitation (only user or creator should remove)

export const RemoveInvitationRequest: Sync = ({
  session,
  actingUser,
  invitation,
  user,
  challenge,
  creator,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/removeInvitation",
      session,
      invitation,
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
      ChallengeParticipation._getInvitationUser,
      { invitation },
      { user }
    );
    frames = await frames.query(
      ChallengeParticipation._getInvitationChallenge,
      { invitation },
      { challenge }
    );
    frames = await frames.query(
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(
      ($) => $[actingUser] === $[user] || $[actingUser] === $[creator]
    );
    return frames;
  },
  then: actions([
    ChallengeParticipation.removeInvitation,
    {
      invitation,
    },
  ]),
});

export const RemoveInvitationResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/removeInvitation" }, { request }],
    [ChallengeParticipation.removeInvitation, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "removed invitation",
    },
  ]),
});

export const RemoveInvitationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeInvitation" }, { request }],
    [ChallengeParticipation.removeInvitation, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// removeParticipation (only user or creator should remove)

export const RemoveParticipationRequest: Sync = ({
  session,
  actingUser,
  participation,
  user,
  challenge,
  creator,
  request,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/removeParticipation",
      session,
      participation,
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
      ChallengeParticipation._getParticipationUser,
      { participation },
      { user }
    );
    frames = await frames.query(
      ChallengeParticipation._getParticipationChallenge,
      { participation },
      { challenge }
    );
    frames = await frames.query(
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(
      ($) => $[actingUser] === $[user] || $[actingUser] === $[creator]
    );
    return frames;
  },
  then: actions([
    ChallengeParticipation.removeParticipation,
    {
      participation,
    },
  ]),
});

export const RemoveParticipationResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/removeParticipation" }, { request }],
    [ChallengeParticipation.removeParticipation, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "removed participation",
    },
  ]),
});

export const RemoveParticipationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeParticipation" }, { request }],
    [ChallengeParticipation.removeParticipation, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// completeChallenge (should fire only when all parts are completed)

export const CompletePartCompleteChallenge: Sync = ({
  part,
  challenge,
  user,
  allPartsCompleted,
}) => ({
  when: actions([ChallengeProgress.completePart, { part, user }, {}]),
  where: async (frames) => {
    frames = await frames.query(
      ChallengeProgress._getPartChallenge,
      { part },
      {
        challenge,
      }
    );
    frames = await frames.query(
      ChallengeProgress._allPartsCompleted,
      { user, challenge },
      { allPartsCompleted }
    );
    frames = frames.filter(($) => $[allPartsCompleted] === true);
    return frames;
  },
  then: actions([
    ChallengeParticipation.completeChallenge,
    { user, challenge },
  ]),
});
