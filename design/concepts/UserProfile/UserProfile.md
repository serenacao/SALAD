
# concept User Profile
- **purpose** store identifying user data, such as location, name, fitness goals, 
- **principle** users can upload their profile info, which other users can then use to inform their friending and challenge decisions

**State**
a set of Profiles
- a user User
- a name String
- a location String
- a bio String

**Actions**
- create(user: User, name: string, location: string, bio: string): (profile: Profile)
    - requires: user is an authenticated user 
    - effects: creates a new profile with the inputted name, location and bio under user

- edit(user: User, name: string, location: string, bio: string): (profile: Profile)
    - requires: user already has an existing profile  
    - effects: updates user's profile with the inputted name, location and bio

- delete(user: User)
    - requires: user already has an existing profile
    - effects: removes user's profile

- getProfile(user: User)
    - effects: returns profile by user