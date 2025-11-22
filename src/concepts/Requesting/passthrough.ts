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

  "/api/CookingSchedule/_isRegisteredPeriod": "public query",
  "/api/CookingSchedule/_isCurrentPeriod": "public query",
  "/api/CookingSchedule/_isOpen": "public query",
  "/api/CookingSchedule/_getCooks": "public query",
  "/api/CookingSchedule/_isRegisteredCook": "public query",
  "/api/CookingSchedule/_getCookingDates": "public query",
  "/api/CookingSchedule/_getCurrentPeriod": "public query",
  "/api/CookingSchedule/_getAssignment": "public query",
  "/api/CookingSchedule/_getAssignments": "public query",
  "/api/CookingSchedule/_getUserAssignments": "public query",
  "/api/CookingSchedule/_getAvailability": "public query",
  "/api/CookingSchedule/_getPreference": "public query",
  "/api/CookingSchedule/_getCandidateCooks": "public query",
  "/api/CookingSchedule/_isAssigned": "public query",

  "/api/UserAuthentication/uploadUser": "allow anyone to upload a user",
  "/api/UserAuthentication/_getCostcoFoodStudKerb": "public query",
  "/api/UserAuthentication/_getProduceFoodStudKerb": "public query",
  "/api/UserAuthentication/_isFoodStud": "public query",
  "/api/UserAuthentication/_isAdmin": "public query",
  "/api/UserAuthentication/_getUsers": "public query",
  "/api/UserAuthentication/_getUser": "public query",
  "/api/UserAuthentication/_getKerb": "public query",
  "/api/UserAuthentication/_isUser": "public query",

  "/api/Session/_getUser": "public query",

  // CookingSchedule user controls for syncs
  "/api/CookingSchedule/uploadPreference": "",
  "/api/CookingSchedule/addAvailability": "",
  "/api/CookingSchedule/removeAvailability": "",
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

  // CookingSchedule foodstud controls for syncs
  "/api/CookingSchedule/addCook",
  "/api/CookingSchedule/removeCook",
  "/api/CookingSchedule/addPeriod",
  "/api/CookingSchedule/removePeriod",
  "/api/CookingSchedule/setCurrentPeriod",
  "/api/CookingSchedule/addCookingDate",
  "/api/CookingSchedule/removeCookingDate",
  "/api/CookingSchedule/openPeriod",
  "/api/CookingSchedule/closePeriod",
  "/api/CookingSchedule/assignLead",
  "/api/CookingSchedule/assignAssistant",
  "/api/CookingSchedule/removeAssignment",
  "/api/CookingSchedule/generateAssignments",
  "/api/CookingSchedule/generateAssignmentsWithLLM",
  "/api/CookingSchedule/generateAssignments",
  "/api/CookingSchedule/generateAssignmentsWithLLM",
  "/api/CookingSchedule/clearAssignments",

  // CookingSchedule helper functions that should never be exposed via api
  "/api/CookingSchedule/deleteIncompatibleAssignments",
  "/api/CookingSchedule/createPrompt",
  "/api/CookingSchedule/parseAndApplyAssignments",

  // Session session creation and deletion for syncs that should never be exposed via api
  "/api/Session/create",
  "/api/Session/delete",
];
