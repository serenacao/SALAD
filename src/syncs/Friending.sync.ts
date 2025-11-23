import { Requesting, Session, Friending, UserAuthentication } from "@concepts";
import { actions, Sync, Frames } from "@engine";

// friend request
export const FriendRequestRequest: Sync = ({ request, session, receiver, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/requestFriend", session, receiver },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Session._getUser, { session }, { user }),
  then: actions([
    Friending.requestFriend,
    {
      requester: user,
      receiver,
    },
  ]),
});

export const FriendRequestSuccess: Sync = ({ request, friendRequest }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/requestFriend",},
    { request },],
    [Friending.requestFriend, {}, {friendRequest,},]),

  then: actions([Requesting.respond, { request, friendRequest}]),
});

export const FriendRequestFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/requestFriend",},
    { request },],
    [Friending.requestFriend, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});


// accept friend request
export const AcceptFriendRequest: Sync = ({ request, session, requester, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/acceptFriend", session, requester },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Session._getUser, { session }, { user }),
  then: actions([
    Friending.acceptFriend,
    {
      requester,
      user,
    },
  ]),
});

export const AcceptFriendSuccess: Sync = ({ request, friendRequest }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/acceptFriend",},
    { request },],
    [Friending.acceptFriend, {}, {},]),

  then: actions([Requesting.respond, { request, }]),
});

export const AcceptFriendFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/acceptFriend",},
    { request },],
    [Friending.acceptFriend, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});


// remove friend
export const RemoveFriendRequest: Sync = ({ request, session, requester, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Friending/acceptFriend", session, requester },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Session._getUser, { session }, { user }),
  then: actions([
    Friending.acceptFriend,
    {
      requester,
      user,
    },
  ]),
});

export const RemoveFriendSuccess: Sync = ({ request, friendRequest }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/removeFriend",},
    { request },],
    [Friending.removeFriend, {}, {},]),

  then: actions([Requesting.respond, { request, }]),
});

export const RemoveFriendFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Friending/removeFriend",},
    { request },],
    [Friending.removeFriend, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});

//queries
export const GetFriends: Sync = (
    {request, session, user, friends}
) => ({
    when: actions([Requesting.request, { path: "/Friending/_getFriends", session}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Session._getUser, { session }, { user });
        frames = await frames.query( Friending._getFriends, { user }, {friends});
        if (frames.length === 0) {
          const response = {...originalFrame, [friends]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        friends
    }]),
});

// deleted user
export const RemoveDeletedFriends: Sync = ({ user, friend }) => ({
    when: actions(
        [UserAuthentication.removeUser, { user }, {}],
    ),
    where: async (frames) => {
        frames = await frames.query( Friending._getFriends, { user }, { friend });
        return frames;
    },
    then: actions(
        // For each frame that made it through the 'where' clause (i.e., for each comment found),
        // delete that specific comment.
        [Friending.removeFriend, { user, friend }],
    ),
});
