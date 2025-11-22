import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Chat" + ".";

// Generic types of this concept
type User = ID;
type Chat = ID;
type DM = ID;

/**
 * a set of Chats with
 *   a user1 User
 *   a user2 User
 *   a user1Accessible flag
 *   a user2Accessible flag
 */
interface ChatDoc {
  _id: Chat;
  user1: User;
  user2: User;
  user1Accessible: boolean;
  user2Accessible: boolean;
}

/**
 * a set of DMs with
 *   a time Date
 *   a message string
 *   a sender User
 *   a receiver User
 *   a chatId Chat // Added to link DMs to a specific chat
 */
interface DMDoc {
  _id: DM;
  chatId: Chat; // Link to the chat instance
  time: Date;
  message: string;
  sender: User;
  receiver: User;
}

/**
 * concept Chat
 *
 * purpose: to allow for users to communicate with other users
 *
 * principle: when a user starts a chat with another user, they can then send encouragement, make plans to meet, etc
 */
export default class ChatConcept {
  chats: Collection<ChatDoc>;
  dms: Collection<DMDoc>;

  constructor(private readonly db: Db) {
    this.chats = this.db.collection(PREFIX + "chats");
    this.dms = this.db.collection(PREFIX + "dms");
  }

  /**
   * startChat (requester: User, receiver: User): (chat: Chat | error: string)
   *
   * **requires** no chat exists between requester and receiver
   *
   * **effects** creates a new chat between those two users; returns the ID of the new chat
   */
  async startChat(
    { requester, receiver }: { requester: User; receiver: User },
  ): Promise<{ chat: Chat } | { error: string }> {
    // Ensure requester and receiver are different
    if (requester === receiver) {
      return { error: "Cannot start a chat with yourself" };
    }

    // Check if a chat already exists between the two users (order-agnostic)
    const existingChat = await this.chats.findOne({
      $or: [
        { user1: requester, user2: receiver },
        { user1: receiver, user2: requester },
      ],
    });

    if (existingChat) {
      // If a chat exists but both users have marked it inaccessible, we could potentially revive it
      // or just return an error that a chat already exists.
      // Given "no chat exists", we'll just return an error.
      return { error: "Chat already exists between these users" };
    }

    const newChatId = freshID();
    const newChat: ChatDoc = {
      _id: newChatId,
      user1: requester,
      user2: receiver,
      user1Accessible: true, // Initially accessible to both
      user2Accessible: true,
    };

    await this.chats.insertOne(newChat);

    return { chat: newChatId };
  }

  /**
   * deleteChat (chat: Chat, user: User): Empty | (error: string)
   *
   * **requires** user is a part of chat
   *
   * **effects** makes chat inaccessible to user (effectively deleting on their end)
   */
  async deleteChat(
    { chat, user }: { chat: Chat; user: User },
  ): Promise<Empty | { error: string }> {
    const chatDoc = await this.chats.findOne({ _id: chat });

    if (!chatDoc) {
      return { error: "Chat not found" };
    }

    if (chatDoc.user1 !== user && chatDoc.user2 !== user) {
      return { error: "User is not a part of this chat" };
    }

    if (chatDoc.user1 === user) {
      await this.chats.updateOne(
        { _id: chat },
        { $set: { user1Accessible: false } },
      );
    } else { // chatDoc.user2 === user
      await this.chats.updateOne(
        { _id: chat },
        { $set: { user2Accessible: false } },
      );
    }

    return {};
  }

  /**
   * send (sender: User, receiver: User, message: string): (dm: DM | error: string)
   *
   * Note: The spec implies `message` as part of DM state but not action arguments.
   * Assuming `message: string` is a necessary argument for this action.
   *
   * **requires** a chat exists between sender and receiver, and is accessible by both.
   *
   * **effects** adds message to that chat; returns the ID of the new DM.
   */
  async send(
    { sender, receiver, message }: {
      sender: User;
      receiver: User;
      message: string;
    },
  ): Promise<{ dm: DM } | { error: string }> {
    // Find the chat between sender and receiver (order-agnostic)
    let chatDoc = await this.chats.findOne({
      $or: [
        { user1: sender, user2: receiver },
        { user1: receiver, user2: sender },
      ],
    });

    if (!chatDoc) {
        this.startChat({requester: sender, receiver});
        chatDoc = await this.chats.findOne({
           $or: [
                { user1: sender, user2: receiver },
                { user1: receiver, user2: sender },
            ],
        })
    }
    if (!chatDoc){
        return {error: "error starting chat"};
    }

    // Check accessibility for both users in the context of this specific chat
    const senderIsUser1 = chatDoc.user1 === sender;
    const receiverIsUser1 = chatDoc.user1 === receiver;

    if (
      !(
        (senderIsUser1 && chatDoc.user1Accessible) ||
        (!senderIsUser1 && chatDoc.user2Accessible)
      )
    ) {
      return { error: "Sender does not have access to this chat" };
    }

    if (
      !(
        (receiverIsUser1 && chatDoc.user1Accessible) ||
        (!receiverIsUser1 && chatDoc.user2Accessible)
      )
    ) {
      return { error: "Receiver does not have access to this chat" };
    }

    const newDMId = freshID();
    const newDM: DMDoc = {
      _id: newDMId,
      chatId: chatDoc._id, // Link DM to the found chat
      time: new Date(),
      message: message,
      sender: sender,
      receiver: receiver,
    };

    console.log(newDM)

    await this.dms.insertOne(newDM);

    return { dm: newDMId };
  }

  // --- Queries ---

  /**
   * _getChatBetweenUsers (userA: User, userB: User): (chat: Chat)[] | (error: string)
   *
   * **requires** None
   *
   * **effects** Returns an array containing the ID of the chat between userA and userB, if one exists and is accessible to both.
   */
  async _getChatBetweenUsers(
    { userA, userB }: { userA: User; userB: User },
  ): Promise<Array<{ chat: Chat }> | { error: string }> {
    const chatDoc = await this.chats.findOne({
      $or: [
        { user1: userA, user2: userB },
        { user1: userB, user2: userA },
      ],
      user1Accessible: true, // Both users must have access for the chat to be "active" for retrieval
      user2Accessible: true,
    });

    if (!chatDoc) {
      return []; // No active chat found
    }

    // Double check accessibility.
    const userAIsUser1 = chatDoc.user1 === userA;
    const userBIsUser1 = chatDoc.user1 === userB;

    const userAAccessible = (userAIsUser1 && chatDoc.user1Accessible) || (!userAIsUser1 && chatDoc.user2Accessible);
    const userBAccessible = (userBIsUser1 && chatDoc.user1Accessible) || (!userBIsUser1 && chatDoc.user2Accessible);

    if (userAAccessible && userBAccessible) {
      return [{ chat: chatDoc._id }];
    }
    return [];
  }

  /**
   * _getDMsInChat (chat: Chat): (dm: {id: DM, time: Date, message: string, sender: User, receiver: User})[] | (error: string)
   *
   * **requires** The chat exists and is accessible to at least one user.
   *
   * **effects** Returns an array of DMs in the specified chat.
   */
  async _getDMsInChat(
    { chat }: { chat: Chat },
  ): Promise<Array<{ dm: { id: DM; time: Date; message: string; sender: User; receiver: User } }> | { error: string }> {
    const chatDoc = await this.chats.findOne({ _id: chat });

    if (!chatDoc || (!chatDoc.user1Accessible && !chatDoc.user2Accessible)) {
      return { error: "Chat not found or is inaccessible" };
    }

    const dms = await this.dms.find({ chatId: chat }).sort({ time: 1 }).toArray();

    return dms.map((dmDoc) => ({
      dm: {
        id: dmDoc._id,
        time: dmDoc.time,
        message: dmDoc.message,
        sender: dmDoc.sender,
        receiver: dmDoc.receiver,
      },
    }));
  }

  /**
   * _getAccessibleChatsForUser (user: User): (chat: Chat)[] | (error: string)
   *
   * **requires** None
   *
   * **effects** Returns an array of chat IDs that the user has access to.
   */
  async _getAccessibleChatsForUser(
    { user }: { user: User },
  ): Promise<Array<{ chat: Chat }> | { error: string }> {
    const chats = await this.chats.find({
      $or: [
        { user1: user, user1Accessible: true },
        { user2: user, user2Accessible: true },
      ],
    }).toArray();

    return chats.map((chatDoc) => ({ chat: chatDoc._id }));
  }
}
