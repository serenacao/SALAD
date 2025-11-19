# concept Friending
- **purpose** to allow for users to communicate with other users

- **principle** when a user starts a chat with another user, they can then send encouragement, make plans to meet, etc

**state**

a set of Chats with
    a user1 User
    a user2 User
    a user1Accessible flag
    a user2Accessible flag
    a set of DMs

a set of DMs with
    a time Date
    a message string
    a sender User
    a receiver User


**actions**
- startChat(requester: User, receiver: User): (chat: Chat)
    - requires: no chat exists between requester and receiver
    - effects: creates a chat between those two users

- deleteChat(chat: Chat, user: User): ()
    - requires: user is a part of chat
    - effects: makes chat inaccessible to user (effectively deleting on their end)

- send(sender: User, receiver: User): (dm: DM)
  - requires: chat exists between sender and reciever
  - effects: adds message to that chat
