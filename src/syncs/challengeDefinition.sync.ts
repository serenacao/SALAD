import {
  ChallengeDefinition,
  ChallengeProgress,
  Requesting,
  Session,
  UserAuthentication,
} from "@concepts";
import { actions, Sync } from "@engine";

// createChallenge

export const CreateChallengeRequest: Sync = ({
  session,
  exercise,
  level,
  info,
  daysPerWeek,
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
      daysPerWeek,
      weeks,
      level,
      info,
    },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(
      Session._getUser,
      { session },
      {
        user: creator,
      }
    );
    return frames;
  },
  then: actions([
    ChallengeDefinition.createChallenge,
    {
      exercise,
      daysPerWeek,
      weeks,
      level,
      info,
      creator,
    },
  ]),
});

export const CreateChallengeUploadChallenge: Sync = ({
  daysPerWeek,
  weeks,
  challenge,
}) => ({
  when: actions([
    ChallengeDefinition.createChallenge,
    { daysPerWeek, weeks },
    { challenge },
  ]),
  where: async (frames) => {
    return frames;
  },
  then: actions([
    ChallengeProgress.uploadChallenge,
    {
      daysPerWeek,
      weeks,
      challenge,
    },
  ]),
});

export const CreateChallengeResponseSuccess: Sync = ({
  request,
  challenge,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createChallenge" }, { request }],
    [ChallengeDefinition.createChallenge, {}, { challenge }]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      challenge,
      status: "created challenge",
    },
  ]),
});

export const CreateChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/createChallenge" }, { request }],
    [ChallengeDefinition.createChallenge, {}, { error }]
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
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    ChallengeDefinition.openChallenge,
    {
      challenge,
    },
  ]),
});

export const OpenChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/openChallenge" }, { request }],
    [ChallengeDefinition.openChallenge, {}, {}]
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
    [ChallengeDefinition.openChallenge, {}, { error }]
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
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    ChallengeDefinition.closeChallenge,
    {
      challenge,
    },
  ]),
});

export const CloseChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/closeChallenge" }, { request }],
    [ChallengeDefinition.closeChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "closed challenge",
    },
  ]),
});

export const CloseChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/closeChallenge" }, { request }],
    [ChallengeDefinition.closeChallenge, {}, { error }]
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
      ChallengeDefinition._getCreator,
      { challenge },
      { creator }
    );
    frames = frames.filter(($) => $[actingUser] === $[creator]);
    return frames;
  },
  then: actions([
    ChallengeDefinition.deleteChallenge,
    {
      challenge,
    },
  ]),
});

export const DeleteChallengeRemoveChallenge: Sync = ({ challenge }) => ({
  when: actions([ChallengeDefinition.deleteChallenge, { challenge }, {}]),
  where: async (frames) => {
    return frames;
  },
  then: actions([
    ChallengeProgress.removeChallenge,
    {
      challenge,
    },
  ]),
});

export const DeleteChallengeResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/deleteChallenge" }, { request }],
    [ChallengeDefinition.deleteChallenge, {}, {}]
  ),
  then: actions([
    Requesting.respond,
    {
      request,
      status: "deleted challenge",
    },
  ]),
});

export const DeleteChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/deleteChallenge" }, { request }],
    [ChallengeDefinition.deleteChallenge, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
