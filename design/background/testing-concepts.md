# Concept Testing

Testing concepts involves primarily:
1. Confirming that for each action:
    - **requires** is satisfied: if a variety of test cases that do not fulfill the requirement are tested against the concept, they do not succeed (or return a record with an `error:` key).
    - **effects** is satisfied: after the action is performed, we can verify that the state did indeed change according to the effect (or the return is correctly specified).
2. Ensuring that the **principle** is fully modeled by the actions:
    - Demonstrate that the series of actions described in the **principle**, when performed, result in the specified behavior or updates to state.
    
# approach: steps to testing

The following prefix format for header 1 blocks denote the relevant steps:

- `# file: src/{name}/{name}Concept.test.ts`
    - The test file for the concept
- `# trace:`
    - Describes a full trace of actions, such as how the principle is fulfilled.

After the concept specification and file, create another test file that properly tests the concept, and propose how the trace might work.

# Test implementation

While testing, use the `testDb` function, which returns a tuple of the database and client so that you can close it.

```typescript
import { testDb } from "@utils/database.ts";

Deno.test("...", async () => {
  const [db, client] = await testDb();

  // ... tests

  // example test
   await t.step("[Action]: [Example action description]", async () => {
    // test content
  });

  await client.close();
});
```

The database is already automatically dropped before every test file using the `Deno.test.beforeAll` hook: do not include any additional manipulation of the database for this purpose.

Use the Deno.test framework, splitting by appropriate test steps and describing each behavior. Import helpers from:

# Typescript specific notation

```typescript
import { assertEquals } from "jsr:@std/assert"; // or any other utility from the library
```

Do NOT use Deno.test.afterEach, since this does NOT exist in Deno. Use await client.close(); at the end of your test suite.

Typecast every variable created, as to not cause typescript to throw a static type-checking error.

Note that if the return type is `Promise<Empty>`, this is similar to returning void.

Note that private variables in concepts cannot be accessed from outside the class, and you should be using query functions (if they are available).

Note that these functions always return an accepted Promise, but failures are contained within error strings. In order to properly retrieve them, you should assert the return type in order to properly retrieve the data, for example:

```typescript
const nonExistentUserInvitations = await concept._getUserInvitations({ user: freshID() as ID });
assertEquals(nonExistentUserInvitations.length, 0, "Non-existent user should have 0 invitations");
```

# Legible testing
 - Each test should output what it is doing and the trace of any actions, to help with debugging and increasing confidence that the concept or action is doing what it says.
 - Principle tests and tests involving multiple actions should explain how it aligns with expectations.
 - For action tests, the output should explain how requirements are met and how effects are confirmed.
 
 # MongoDB
 - In MongoDB, an ObjectId is a 12-byte BSON type that serves as the default and primary key for documents within a collection. It is designed to uniquely identify documents across different machines and processes in a distributed system. 
 - In order to convert ObjectID into an ID, apply the function ".toString() as ID", for example, "objectID.toString() as ID".
 - Recall that our queries will return ObjectID since we are querying from MongoDB, so you must convert from ObjectID to ID
 - Recall the input to our queries should just be string ids
 
