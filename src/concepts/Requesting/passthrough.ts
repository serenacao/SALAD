/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions

  "/api/UserAuthentication/uploadUser": "allow anyone to upload a user",
  "/api/UserAuthentication/_getUsers": "public query",
  "/api/UserAuthentication/_getUser": "public query",
  "/api/UserAuthentication/_getKerb": "public query",
  "/api/UserAuthentication/_isUser": "public query",

  "/api/Session/_getUser": "public query",

  "/api/Group/_getLeader": "public query",
  "/api/Group/_isPrivate": "public query",
  "/api/Group/_getName": "public query",
  "/api/Group/_getPublicGroups": "public query",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions

  // UserAuthentication login and admin controls for syncs
  "/api/UserAuthentication/login",
  "/api/UserAuthentication/logout",
  "/api/UserAuthentication/removeUser",
  "/api/UserAuthentication/updateKerb",
  "/api/UserAuthentication/updatePassword",
  "/api/UserAuthentication/setProduceFoodStud",
  "/api/UserAuthentication/setCostcoFoodStud",

  // UserAuthentication helper functions that should never be exposed via api
  "/api/UserAuthentication/initialize",

  // Session session creation and deletion for syncs that should never be exposed via api
  "/api/Session/create",
  "/api/Session/delete",

  // Group creation and membership
  "/api/Group/create",
  "/api/Group/accept",
  "/api/Group/request",
  "/api/Group/deny",
  "/api/Group/deleteGroup",
  "/api/Group/removeMember",

  "/api/ChallengeDefinition/createChallenge",
  "/api/ChallengeDefinition/openChallenge",
  "/api/ChallengeDefinition/closeChallenge",
  "/api/ChallengeDefinition/deleteChallenge",

  "/api/ChallengeParticipation/createInvitation",
  "/api/ChallengeParticipation/acceptInvitation",
  "/api/ChallengeParticipation/removeInvitation",
  "/api/ChallengeParticipation/removeParticipation",
  "/api/ChallengeParticipation/completeChallenge",

  "/api/ChallengeProgress/uploadChallenge",
  "/api/ChallengeProgress/removeChallenge",
  "/api/ChallengeProgress/completePart",

  "/api/ChallengeVerification/createVerificationRequest",
  "/api/ChallengeVerification/verify",
  "/api/ChallengeVerification/removeVerificationRequest",
];
