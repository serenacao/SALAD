**concept** ChallengeDefinition\[User\]

**purpose** allows users to define challenges

**principle** users defined challenges and then share them

**state**

a set of Challenge Challenges with

&ensp; a User Creator

&ensp; a string Exercise

&ensp; a string ExerciseType (Anaerobic, RepAerobic or DistanceAerobic)

&ensp; an Info which is either an AnaerobicInfo with:

&ensp; &ensp; a number Sets

&ensp; &ensp; a number Reps

&ensp; &ensp; a number Weight

&ensp; or a RepAerobicInfo with:

&ensp; &ensp; a number Minutes

&ensp; &ensp; a RepSpeed (in reps/minute)

&ensp; or a DistanceAerobicInfo with:

&ensp; &ensp; a number Minutes

&ensp; &ensp; a DistanceSpeed (in km/hr)

&ensp; a number DaysPerWeek

&ensp; a number Weeks

&ensp; a number Level (1 to 3)

&ensp; a number Points (per part)

&ensp; a number BonusPoints (upon completion of entire challenge)

&ensp; a boolean Open

**actions**

createChallenge(creator: User, level: number, exercise: string, info: AnaerobicInfo, RepAerobicInfo or DistanceAerobicInfo, daysPerWeek: number, weeks: number)

**requires** level is an integer in \{1, 2, 3\}, all fields in info are positive numbers, daysPerWeek and weeks are positive integers

**effect** creates a new Challenge with the given fields, Open set to False, calculates Points based on level and BonusPoints based on level, daysPerWeek and weeks; creates a new Part for every week and day of the challenge with Completers set to an empty set

openChallenge(challenge: Challenge)

**requires** challenge exists in Challenges

**effect** sets Open for challenge to True if it was False, otherwise does nothing

closeChallenge(challenge: Challenge)

**requires** challenge exists in Challenge

**effect** sets Open for challenge to False if it was True, otherwise does nothing

deleteChallenge(challenge: Challenge)

**requires** challenge exists in Challenges

**effect** deletes challenge from Challenges

**queries**

\_isOpen(challenge: Challenge): Boolean

**requires** challenge exists in Challenges

**effect** returns whether or not challenge has Open set to True

\_getChallengeDetails(challenge: Challenge): Array of Dict

**requires** challenge exists in Challenges

**effect** returns Exercise, Level, DaysPerWeek, Weeks, and Info for this Challenge

\_getCreator(challenge: Challenge): User or Group

**requires** challenge exists in Challenges

**effect** returns Creator for challenge

\_getPartPoints(challenge: Challenge): Number

**requires** challenge exists in Challenge

**effect** returns Points for every part of Challenge

\_getBonusPoints(challenge: Challenge): Number

**requires** challenge exists in Challenges

**effect** returns BonusPoints for challenge
