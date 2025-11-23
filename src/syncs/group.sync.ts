import { Requesting, UserAuthentication, Group, Session } from "@concepts";
import { actions, Sync } from "@engine";

// create group

export const CreateRequest: Sync = ({
  session,
  actingUser,
  leader,
  name,
  privateGroup,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/createGroup", session, leader, name, privateGroup },
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
    frames = frames.filter(($) => $[actingUser] === $[leader]);
    return frames;
  },
  then: actions([
    Group.create,
    {
      leader,
      name,
      privateGroup,
    },
  ]),
});

export const CreateResponseSuccess: Sync = ({
  request,
  leader,
  name,
  privateGroup,
  group,
}) => ({
  when: actions(
    [Requesting.request, { path: "/createGroup" }, { request }],
    [
      Group.create,
      {
        leader,
        name,
        privateGroup,
      },
      { group },
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      group,
      status: "created group",
    },
  ]),
});

export const CreateResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/createGroup" }, { request }],
    [Group.create, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// membership request

export const MembershipRequest: Sync = ({
  session,
  user,
  actingUser,
  group,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/requestMembership", session, user, group },
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
    Group.request,
    {
      user,
      group,
    },
  ]),
});

export const MembershipResponseSuccess: Sync = ({
  request,
  user,
  group,
  membershipRequest,
}) => ({
  when: actions(
    [Requesting.request, { path: "/requestMembership" }, { request }],
    [
      Group.request,
      {
        user,
        group,
      },
      { membershipRequest },
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      membershipRequest,
      status: "created membership request",
    },
  ]),
});

export const MembershipResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/requestMembership" }, { request }],
    [Group.request, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// accept

export const AcceptRequest: Sync = ({
  session,
  user,
  actingUser,
  membershipRequest,
  leader,
  group,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/acceptMembership", session, membershipRequest },
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
      Group._getRequestDetails,
      { membershipRequest },
      { user, group }
    );
    frames = await frames.query(Group._getLeader, { group }, { leader });
    frames = frames.filter(($) => $[actingUser] === $[leader]);
    return frames;
  },
  then: actions([
    Group.accept,
    {
      membershipRequest,
    },
  ]),
});

export const AcceptResponseSuccess: Sync = ({
  request,
  membershipRequest,
}) => ({
  when: actions(
    [Requesting.request, { path: "/acceptMembership" }, { request }],
    [
      Group.accept,
      {
        membershipRequest,
      },
      {},
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      membershipRequest,
      status: "accepted membership request",
    },
  ]),
});

export const AcceptResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/acceptMembership" }, { request }],
    [Group.accept, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// deny

export const DenyRequest: Sync = ({
  session,
  user,
  actingUser,
  membershipRequest,
  leader,
  group,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/denyMembership", session, membershipRequest },
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
      Group._getRequestDetails,
      { membershipRequest },
      { user, group }
    );
    frames = await frames.query(Group._getLeader, { group }, { leader });
    frames = frames.filter(($) => $[actingUser] === $[leader]);
    return frames;
  },
  then: actions([
    Group.deny,
    {
      membershipRequest,
    },
  ]),
});

export const DenyResponseSuccess: Sync = ({ request, membershipRequest }) => ({
  when: actions(
    [Requesting.request, { path: "/denyMembership" }, { request }],
    [
      Group.deny,
      {
        membershipRequest,
      },
      {},
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      membershipRequest,
      status: "denied membership request",
    },
  ]),
});

export const DenyResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/denyMembership" }, { request }],
    [Group.deny, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// removeMember

export const RemoveMemberRequest: Sync = ({
  session,
  user,
  actingUser,
  leader,
  group,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/removeMember", session, user, group },
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
    frames = await frames.query(Group._getLeader, { group }, { leader });
    frames = frames.filter(
      ($) => $[actingUser] === $[user] || $[actingUser] === $[leader]
    );
    return frames;
  },
  then: actions([
    Group.removeMember,
    {
      user,
      group,
    },
  ]),
});

export const RemoveMemberResponseSuccess: Sync = ({
  request,
  user,
  group,
}) => ({
  when: actions(
    [Requesting.request, { path: "/removeMember" }, { request }],
    [
      Group.removeMember,
      {
        user,
        group,
      },
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      status: "removed member",
    },
  ]),
});

export const RemoveMemberResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/removeMember" }, { request }],
    [Group.removeMember, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// deleteGroup

export const DeleteGroupRequest: Sync = ({
  session,
  actingUser,
  group,
  leader,
  request,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/deleteGroup", session, group },
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
    frames = await frames.query(Group._getLeader, { group }, { leader });
    frames = frames.filter(($) => $[actingUser] === $[leader]);
    return frames;
  },
  then: actions([
    Group.deleteGroup,
    {
      group,
    },
  ]),
});

export const DeleteGroupResponseSuccess: Sync = ({ request, group }) => ({
  when: actions(
    [Requesting.request, { path: "/createGroup" }, { request }],
    [
      Group.deleteGroup,
      {
        group,
      },
      {},
    ]
  ),
  then: actions([
    Requesting.respond,
    {
      group,
      status: "deleted group",
    },
  ]),
});

export const DeleteGroupResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/deleteGroup" }, { request }],
    [Group.deleteGroup, {}, { error }]
  ),
  then: actions([Requesting.respond, { request, error }]),
});
