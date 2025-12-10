## DESIGN SUMMARY

The biggest change we made was in our concept design; we broke up our large challenges concept into multiple smaller concepts. Besides that, we did some things to limit our scope, including only supporting verification from registered users and having users submit text as evidence rather than image files. In the frontend, we rearranged the location of the different challenge features a couple times, finally settling on making the home page a dashboard for all challenge actions, as a result of user feedback from user testing. Originally some challenge actions were accessed through the navigation bar, but since this was unintuitive and overwhelming for users, we tried to reduce the amount of navigation needed from users in order to do these things.

Something we dropped was location-wise user recommendations, since this was something we ran out of time for as well as would require more precise storage of user data + coordinates and was not something we were viably able to implement within the time frame, given other features that we prioritized. Instead, we decided to just have a self-fill option on the user profile.

A small change we made was restructured our points concept. It maintains its original purpose of tracking each user’s points; however, now it also aids in the creation of rankings between users. Despite being a minor change, it ended up making a difference. It allowed us to easily implement our leaderboard on the frontend by providing a sorted list of users, simplifying the process of creating our rankings on the frontend.

We also changed the UI a bit to appear more consistent across different tabs via adjusting the colors as well as the shapes of boxes to be more soft. Across different checkpoints, we played around with the UI of the app, such as changing the login box, the formatting of chat, the formatting of groups, and more.

## SERENA REFLECTION

For this project, I worked primarily on writing out tests for most of the concepts, as well as using the concept AI to write up a couple of back-end concept suites. I also worked on developing the user profile front end and group front end and basic layout for the page. I mainly worked through referencing my personal project and consulting StackExchange + ChatGPT.

One of my main struggles was probably the frontend to backend flow, and formatting syncs. In particular, I also had challenges with backend integration, particularly with the Concepts Engine Syncs. I learned that even small mismatches between frontend payloads and backend expectations — like extra fields (session) or the structure of response objects — can lead to silent failures or timeouts. Debugging these issues taught me the importance of reading API specifications closely, understanding the exact shape of backend responses, and logging intermediate values to catch mismatches early. Debugging these issues was really challenging for me, because I initially would only see a “request timing out” and wasn’t really sure where the issue was coming from.

I think the authstore was also something difficult for me, but I think I got the hang of using computed() and onMount() through this coding experience.

Some regrets that I have probably are that I’m still not 100% able to write up a UI page from scratch (since I do not have notation on lock), but I do feel like I can read any UI page and gain an understanding of what it is doing and fix any errors, but I do wish I spent more time investing into clean UI design since I feel as if a lot more time was dedicated to debugging api call issues rather than refining the app from alpha -> gamma checkpoint.

Finally, I do feel like I gained more experience in general UI design, as well as learning how to work with a team and divide things up into different features without worrying a lot about merge conflicts.

## LUIS REFLECTION

It was interesting working on such a large scale project with others. We each had our own lives and schedules, so it was tough having to coordinate. However, we made it work with good coordination, zoom, and general text messages. Our project was quite interesting as we tried turning something that happens in real life into something we track, so there were some questions as to how to handle aspects like verification. We always discussed everything that needed to happen and checked the quality of each other's work, keeping each other on track and making corrections to produce a good product.
One of our greatest challenges was just debugging the various issues that arose as we pushed our code. With each of us contributing different portions of the repos, there would arise issues when code would work on one of our ends but then create an error on the deployed site. However, we never let this stop us; every time an issue arose, we immediately would inform the others and try to debug the issue, together at times.
With this project, I definitely got a better understanding on some concepts due to its more complex nature, compared to my personal project. I got to work with frames more and develop more complex UI.

## AKOSUA REFLECTION

My work on the actual codebase for the project was limited to the friending and chat features of the application, though I did implement the front and back ends for both concepts, using context for the backend and cursor for the frontend. This allowed me to gain more experience in full stack development for at least part of an app, which I found useful. Overall, the implementation was fairly straightforward, with most of the iterations benign changes to CSS and HTML layout as opposed to actual logic.

Much of the work I did was related to other design aspects, UI sketching and user testing. My individual project had a lot fewer moving parts, so it was nice to get more practice doing sketches for a larger project such as this one, though over the past couple of weeks, there were a lot of revisions that needed to be made in terms of how features were organized on the site.

User testing is something that I had no previous experience in, so it was an entirely new task for me. It went smoothly for me, though it did help that my test subject was very vocal about their thought process and suggestions.

Overall, I think the project went well. I’m happy with the final product and I learned a lot about group project design. I think organization was probably our biggest challenge, since it was a little difficult to split up work in a way so that we could work independently but easily put our work together. I think because of this, we couldn’t necessarily implement everything we wanted, but I now have a better idea of how to do this in the future.

ALEXIS REFLECTION

For this project I worked primarily on the challenges concepts, although I was also involved in backend implementation for groups and leaderboard. I mainly worked by referencing my personal project code and also using GenAI tools for HTML/CSS.

The biggest challenge was debugging various issues, particularly when deployments on Render failed while local repos still worked. This was more an exercise in endurance than a technical endeavor. I used GenAI and Google to help me with this.

I also felt that while I was implementing things on the frontend I had better ideas about how to improve the app. When actually interacting with the site, it became more clear to me what features I personally as a user would be interested in, which was a bit more abstract to think about before implementation. Some of these insights came a bit too late in the process though to actually work into our project. User testing also gave me way more insights, but the changes I was able to implement from that were more surface level, again because of how close the user testing was to the end of project.
