User completed all tasks within 10 minutes, so for the most part the tasks were very straight-forward and easy to complete. Logging in and creating a challenge went the quickest and the user had no questions during these parts. The other tasks required experimenting with various tabs, which delayed the process.

The most difficult task involved the creation and verification of verification requests. They were not sure what such a request was until they saw the instructions about it, and they were not sure where to look for it. They initially thought verification requests would be in the invitations or friending tab.

There were also issues where updates from other users (necessary for the completion of some tasks) were not immediately reflected on their end, which meant they needed to refresh the page to see the changes. Refreshing the page also required them to log in again.

Finally, the user also revealed a bug in the groups page, where new groups could not be found.

Some key areas for improvement this testing revealed are the following:

**Flaw:** purpose of certain nav bar tabs/pages is confusing/unclear
**Cause:** tabs are ambiguously named and certain features are arbitrarily grouped
**Potential Solution:** separate verification request actions from other challenge actions

**Flaw:** page data does not get updated when database is updated unless the page is refreshed
**Cause:** Vue does not know when the database is updated, and we also don’t force any automatic page refreshes
**Potential Solution:** forcing page refresh every 30 seconds or some other interval

**Flaw:** refreshing pages forces the user to log in again
**Cause:** on refresh, our frontend loses all data retrieved from the backend so the user’s login state is lost; our session and user authentication concepts do not allow a user to “stay logged in” over a period of time without needing to login again
**Potential Solution:** updated session concept to store a logged in user for a specific IP address for a certain amount of time before being deleted

**Flaw:** groups are not showing up when created
**Cause:** a bug in the group backend syncs
**Potential Solution:** fix the bug
