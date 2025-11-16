**concept** Session

**purpose** maintain a user's logged-in state across multiple requests without re-sending credentials

**principle** after a user logs in, a session is created for them; future requests using this session ID are treated as coming from this user; when the user logs out, the session is deleted

**state**

a set of Session Sessions with 

&ensp; a User

**actions**

create(user: User): Session

**requires** nothing

**effect** creates a new Session with user and returns it

delete(session: Session)

**requires** session exists in Sessions

**effect** removes session from Sessions 

**queries**

_getUser(session: Session)

**requires** session exists in Sessions

**effect** returns User associated with session


