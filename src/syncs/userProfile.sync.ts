import { Requesting, UserProfile, Session } from "@concepts";
import { actions, Sync } from "@engine";

// User Profile creation handled in UserAuthentication syncs

// User Profile editing request

export const UserProfileEditRequest: Sync = ({ request,
    user,
    session,
    actingUser,
    location,
    bio,
    skillLevel,
    userImg,
}) => ({
    when: actions([
        Requesting.request,
        { path : "/editProfile", user, session, location, bio, skillLevel, userImg },
        { request },
    ]),
    where: async (frames) => {
        frames = await frames.query(
            Session._getUser,
            { session },
            { actingUser },
        )
        return frames.filter(($) => $[actingUser] === $[user]);
    },
    then: actions([
        UserProfile.editProfile,
        { user, location, bio, skillLevel, userImg },
    ]),
});

export const UserProfileEditResponse: Sync = ({ 
    request, 
    user,
 }) => ({
    when: actions(
        [Requesting.request, { path : "/editProfile", user}, { request }],
        [UserProfile.editProfile, { user }, {}],
    ),
    then: actions([
        Requesting.respond, { request, status: "profile updated" },
    ]),
});

export const UserProfileEditError: Sync = ({ request, user, error }) => ({
    when: actions(
        [Requesting.request, { path : "/editProfile" }, { request }],
        [UserProfile.editProfile, { user }, { error}],
    ),
    then: actions([
        Requesting.respond, { request, error},
    ]),
});

//getUserProfile request public query