import { Requesting, Session, UserAuthentication } from "@concepts";
import { actions, Sync } from "@engine";

// user login and session creation
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/login", username, password },
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

export const LoginCreateSession: Sync = ({ user }) => ({
  when: actions([
    UserAuthentication.login,
    {},
    {
      user,
    },
  ]),
  then: actions([Session.create, { user }]),
});

export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({
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

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/login" }, { request }],
    [UserAuthentication.login, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// user logout
export const LogoutRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/logout", session },
    {
      request,
    },
  ]),
  where: async (frames) =>
    await frames.query(Session._getUser, { session }, { user }),
  then: actions([Session.delete, { session }]),
});

export const LogoutResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Session.delete, {}, {}]
  ),
  then: actions([Requesting.respond, { request, status: "logged_out" }]),
});

export const LogoutResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/logout" }, { request }],
    [Session.delete, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// remove user

export const RemoveUserRequest: Sync = ({
  request,
  session,
  user,
  actingUser,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/removeUser", user },
    {
      request,
    },
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
  then: actions([UserAuthentication.removeUser, { user }]),
});

export const RemoveUserResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/removeUser" }, { request }],
    [UserAuthentication.removeUser, {}, {}]
  ),
  then: actions([Requesting.respond, { request, status: "removed" }]),
});

export const RemoveUserResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeUser" }, { request }],
    [UserAuthentication.removeUser, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// password update

export const UpdatePasswordRequest: Sync = ({
  request,
  session,
  user,
  actingUser,
  newPassword,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/updatePassword",
      user,
      newPassword,
      session,
    },
    {
      request,
    },
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
  then: actions([UserAuthentication.updatePassword, { user, newPassword }]),
});

export const UpdatePasswordResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/updatePassword" }, { request }],
    [UserAuthentication.updatePassword, {}, {}]
  ),
  then: actions([Requesting.respond, { request, status: "updated password" }]),
});

export const UpdatePasswordResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/updatePassword" }, { request }],
    [UserAuthentication.updatePassword, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// username update

export const UpdateusernameRequest: Sync = ({
  request,
  session,
  user,
  actingUser,
  newusername,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/updateUsername",
      user,
      newusername,
      session,
    },
    {
      request,
    },
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
  then: actions([UserAuthentication.updateusername, { user, newusername }]),
});

export const UpdateusernameResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/updateusername" }, { request }],
    [UserAuthentication.updateusername, {}, {}]
  ),
  then: actions([Requesting.respond, { request, status: "updated username" }]),
});

export const UpdateusernameResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/updateusername" }, { request }],
    [UserAuthentication.updateusername, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
