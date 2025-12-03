import { Requesting, Chat, Session } from "@concepts";
import { actions, Sync, Frames } from "@engine";

// start chat
export const StartChatRequest: Sync = ({ request, session, receiver, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Chat/startChat", session, receiver },
    { request },
  ]),
  where: async (frames) =>
    await frames.query(Session._getUser, { session }, { user }),
  then: actions([
    Chat.startChat,
    {
      requester: user,
      receiver,
    },
  ]),
});

export const StartChatSuccess: Sync = ({ request, chat }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/startChat",},
    { request },],
    [Chat.startChat, {}, {chat},]),

  then: actions([Requesting.respond, { request, chat}]),
});

export const StartChatFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/startChat",},
    { request },],
    [Chat.startChat, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});

// delete chat
export const DeleteChatRequest: Sync = ({ request, session, chat, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Chat/deleteChat", session, chat },
    { request },
  ]),
  where: async (frames) =>{
    frames = await frames.query(Session._getUser, { session }, { user })
    return frames
  },
  then: actions([
    Chat.deleteChat,
    {
      user,
      chat,
    },
  ]),
});

export const DeleteChatSuccess: Sync = ({ request, chat }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/deleteChat",},
    { request },],
    [Chat.deleteChat, {}, {},]),

  then: actions([Requesting.respond, { request }]),
});

export const DeleteChatFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/deleteChat",},
    { request },],
    [Chat.startChat, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});

//send message
export const SendMessageRequest: Sync = ({ request, session, user, message, receiver }) => ({
  when: actions([
    Requesting.request,
    { path: "/Chat/send", session, message, receiver },
    { request },
  ]),
  where: async (frames) =>{
    frames = await frames.query(Session._getUser, { session }, { user })
    return frames
  },
  then: actions([
    Chat.send,
    {
      sender: user,
      message,
      receiver
    },
  ]),
});

export const SendMessageSuccess: Sync = ({ request, dm }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/send",},
    { request },],
    [Chat.send, {}, {dm},]),

  then: actions([Requesting.respond, { dm }]),
});

export const SendMessageFailure: Sync = ({ request, error }) => ({
  when: actions([Requesting.request,
    { path: "/Chat/send",},
    { request },],
    [Chat.send, {}, {error,},]),

  then: actions([Requesting.respond, { request, error}]),
});


// queries
export const GetChat: Sync = (
    {request, session, user, userB, chat}
) => ({
    when: actions([Requesting.request, { path: "/Chat/_getChatBetweenUsers", session, userB}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Session._getUser, { session }, { user });
        frames = await frames.query( Chat._getChatBetweenUsers, { user, userB }, {chat});
        if (frames.length === 0) {
          const response = {...originalFrame, [chat]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        chat
    }]),
});

export const GetDMs: Sync = (
    {request, session, user, dm, chat}
) => ({
    when: actions([Requesting.request, { path: "/Chat/_getDMsInChat", session, chat}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Session._getUser, { session }, { user });
        frames = await frames.query( Chat._getDMsInChat, { chat }, {dm});
        if (frames.length === 0) {
          const response = {...originalFrame, [dm]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        dm
    }]),
});

export const GetUsersChats: Sync = (
    {request, session, user, chat}
) => ({
    when: actions([Requesting.request, { path: "/Chat/_getAccessibleChatsForUser", session}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Session._getUser, { session }, { user });
        frames = await frames.query( Chat._getAccessibleChatsForUser, { user }, {chat});
        if (frames.length === 0) {
          const response = {...originalFrame, [chat]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        chat
    }]),
});
