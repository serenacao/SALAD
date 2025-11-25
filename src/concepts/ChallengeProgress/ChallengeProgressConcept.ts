import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { assert } from "node:console";

// Declare collection prefix, use concept name
const PREFIX = "ChallengeProgress" + ".";

// Generic types of this concept
type User = ID;
type Challenge = ID;
