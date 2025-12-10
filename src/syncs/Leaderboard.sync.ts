import {
  ChallengeDefinition,
  ChallengeProgress,
  Leaderboard
} from "@concepts";
import { actions, Sync } from "@engine";

// Add points to user when a challenge has been completed


export const AddPointsToUserOnChallengeCompletion: Sync = ({
    user,
    part,
    challenge,
    points,
}) => ({
    when: actions(
        [ChallengeProgress.completePart,{ part, user },  {}],
    ),
    where: async (frames) => {
        frames = await frames.query(
            ChallengeProgress._getPartChallenge,
            {part},
            {challenge},
        );
        frames = await frames.query(
            ChallengeDefinition._getPartPoints,
            {challenge},
            {points},
        );
        return frames;
    },
    then: actions([
        Leaderboard.addPoints,
        { user, points },
    ]),
});