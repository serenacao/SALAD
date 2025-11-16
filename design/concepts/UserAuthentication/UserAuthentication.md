**concept** UserAuthentication

**purpose** to verify whether certain users are allowed to perform certain actions

**principle** users are uploaded with a username and password; users must log in before performing any actions

**state**

a Set of User Users with

a String username

a String Password

**invariants**

no two Users have the same username

**actions**

uploadUser(username: String, password: String): User

**requires** no User in Users has the same username, Admin does not have the same username

**effect** creates a new User with username and password and adds it to Users, returns that User

removeUser(user: User)

**requires** user is in Users, user is not ProduceFoodStud or CostcoFoodStud

**effect** removes user from Users

updatePassword(user: User, newPassword: String)

**requires** user is in Users, newPassword is distinct from user's original Password

**effect** sets Password of user to newPassword

updateusername(user: User, newUsername: String)

**requires** user is in Users, newUsername is distinct from user's original username

**effect** sets username of user to username

login(username: String, password: String): User

**requires** a User exists in Users with the same username and password

**effect** returns that User

\_getUsers(): Array of User

**requires** nothing

**effect** returns Users

\_getusername(user: User): Array of String

**requires** user is in Users

**effect** returns the username of user

\_getUser(username: String): Array of User

**requires** there is a User with username in Cooks

**effect** returns User associated with username
