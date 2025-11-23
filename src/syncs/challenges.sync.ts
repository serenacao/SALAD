import { Requesting, Session, UserAuthentication } from "@concepts";
import { actions, Sync } from "@engine";

// createChallenge

export const CreateChallengeRequest: Sync = ({
  session,
  request,
  username,
  password,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/createChallenge", username, password },
    { request },
  ]),
  then: actions([
    UserAuthentication.login,
    {
      username,
      password,
    },
  ]),
});

export const CreateChallengeResponseSuccess: Sync = ({
  request,
  user,
  session,
}) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [
      UserAuthentication.login,
      {},
      {
        user,
      },
    ],
    [Session.create, { user }, { session }]
  ),
  then: actions([
    Requesting.respond,
    {
      user,
      request,
      session,
      status: "logged in",
    },
  ]),
});

export const CreateChallengeResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.login, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// openChallenge

// closeChallenge

// deleteChallenge

// inviteUsers

// acceptChallenge

// removeFromChallenge

// createVerificationRequest

// verify
