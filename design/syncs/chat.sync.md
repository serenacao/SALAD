# User Authentication Syncs
- Start Chat Request
  - when: Request.startChat(reciever: User, session)
  - where: Sessioning: User associated with session is requester
  - then: Chat.startChat(requester, reciever)

- Friend Request Response
  - when: Chat.startChat():(chat)
  - then: Requesting.respond(chat)

- Delete Chat Request
  - when: Request.deleteChat(chat)
  - where: Sessioning: User associated with session is user
  - then: Chat.deleteChat(user, chat)

- Delete Chat Response
  - when: Chat.deleteChat():()
  - then: Requesting.respond(success: "Deleted chat")

- Send Request
  - when: Request.send(receiver: User, dm: string)
  - where: Sessioning: User associated with session is sender
  - then: Chat.send(sender, receiver, dm)

- Send Response
  - when: Chat.send():()
  - then: Requesting.respond(success: "Sent dm")

# Starting Chat Syncs
- Start Chat to Send Message
  - when: Request.send(session, receiver, message)
  - where:
    - Session: User associated with session is sender
    - Chat: there is no chat between sender and receiver
  - then: Chat.startChat(sender, receiver)
