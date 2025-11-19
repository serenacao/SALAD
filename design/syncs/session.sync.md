# Session Sync

**sync** login

**when** UserAuthentication.login(): user

**then** Session.create(user)
