import {
  ChallengeDefinition,
  ChallengeProgress,
  Leaderboard
} from "@concepts";
import { actions, Sync } from "@engine";

// Add points to user when a challenge has been completed

export const CheckChallengeCompletion: Sync = ({
    part,
    user,
}) => ({
    when: actions([
        ChallengeProgress.completePart,
        {   part,
            user,
        }, {}]),
    then: actions([
        ChallengeProgress._getPartChallenge,
        { part },
        { },
    ]),
});

export const GetPointsforPart: Sync = ({
    user,
    challenge,
    part,
}) => ({
    when: actions(
        [ChallengeProgress.completePart,{ part, user },  {}],
        [ChallengeProgress._getPartChallenge, { part }, { challenge }, ]
    ),    
    then: actions([
        ChallengeDefinition._getPartPoints,
        { challenge },
        {},
    ]),
});

export const AddPointsToLeaderboard: Sync = ({
    user,
    points,
    challenge,
    part,
}) => ({
    when: actions(
        [ChallengeProgress.completePart,{ part, user },  {}],
        [ChallengeProgress._getPartChallenge, { part }, { challenge }, ],
        [ChallengeDefinition._getPartPoints, { challenge }, { points }, ]
    ),    
    then: actions([
        Leaderboard.addPoints,
        { user, points },
        {},
    ]),
});