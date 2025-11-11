# Problem Framing

## Domain

WILG administration: WILG has a lot of complex processes behind the scenes that help keep the house running that are currently run manually. There is a cooking schedule with dinner 6x a week, all cooked by house members, and groceries need to be ordered for these dinners and for general snacks/breakfast. There is also a chore system involving kitchen jobs, house jobs and bathroom jobs. Since WILG does not have a cleaning service, these jobs are extremely important in keeping the house functional and livable.

## Problem

WILG Chores: Assigning chores and tracking chore completion. This is done via a Google form and witnessing system that our house managers have to manually track and collect every month. Missed chores result in fines, but these fines increase exponentially, not linearly. People also can swap chores, which has to be tracked manually. A lot of the tasks involved here (tracking hours, calculating fines) can be automated. Additionally, having a place where people can see which jobs they've logged (which currently is not available) would be really useful for residents.

## Evidence

1. [Communal Intimacy: Formalization, Egalitarianism, and Exchangeability in Collective Housing](https://academic.oup.com/sf/article/100/1/273/5933783?login=true). This research paper discusses how communal living tends to demand egalitarianism in the distribution of chores and tasks in comparison to family living, and that this egalitarianism actually contributes to communal intimacy.

2. [Co-Housing to Ease and Share Household Chores? Spatial Visibility and Collective Deliberation as Levers for Gender Equality](https://www.mdpi.com/2075-5309/11/5/189) This research paper discusses how in one investigation into co-housing projects in Brussels, egalitarian distribution of chores within a shared communal living space can ease burdens on individuals and allow women to lead more socially and politically engaged lives.

3. [Why Communal Living Can Make Us Happier](https://www.bbc.com/culture/article/20240429-why-living-with-strangers-can-make-us-happier). This article discusses how communal living systems that involve chore schedules and cooking plans or other modes of shared responsibility can help provide community and alleviate burdens.

4. Personal Experience: One of the team members, Alexis, is president of WILG, and has experience working with the house managers. When house managers are really hosed, a lot of chore tracking gets delayed. If this was automated, we wouldn't experience this problem at all.

5. [Gamefication + Online Apps Encourage Chore Completion](https://www.mirror.co.uk/lifestyle/family/family-chore-app-chorly-review-34118059) “The kids have enjoyed being able to tick off their chores and work towards treats, with the added side benefit of them trying to decide whether to save or spend their stars[…]they’ve actually also started suggesting tasks to add to the app and are much more open to helping”

## Comparables

1. [OurHome](http://ourhomeapp.com/). A family chore tracking app that allows families to track chores and assigns points to those who complete their chores. Good for a family, but not super compatible with WILG, which is a 30+ member community with very specific chores that come with specific time frames. This app also does not have chore swapping or fine tracking.

[Flatastic](https://www.flatastic-app.com/en/)
Flatastic is a household organization app that helps roommates, couples, or families coordinate chores, shopping lists, and shared expenses. It keeps everyone on the same page with features like reminders, task tracking, and a shared pinboard for communication.

[Connecteam](https://connecteam.com/best-team-management-apps/)
A workplace organization app with features to assign tasks, have people clock in and out, create checklists, etc. This app allows for one person to manage a large group and easily keep track of who has done what, which is probably better for larger living groups, but the app is specialized for businesses, not homes.

[Nipto](https://nipto.app/)
Family chores app where people compete for points by doing chores on the chores list. The person who got the most points the previous week gets bonus points for the current week. This is a strong incentive for larger groups where people may be less interested in doing chores, but WILG does currently have a penalty/fine system for not doing chores so this might be unnecessary.

[Maple](https://www.growmaple.com/calendar)
Chores app inspired by management apps like Slack. There’s a shared calendar showing all the family chores and a meal prep feature where you can manage recipes and shopping lists, which is an additional feature many of these apps don’t have.

## Features

1. For house managers: chore assignment and chore approval. Chores are either weekly, bi-weekly, or daily and are assigned to one person for the whole semester. There is a fixed number of hours per chore that are expected to be completed by the end of the semester, to be determined by the house managers. Each resident has a kitchen job (involving cleaning the kitchen in some way) and a house job. The house managers need to approve each job before it can be logged as completed.
2. For each resident: chore completion submission form for each job with date field and witness field. The witness needs to approve the chore before it’s logged as a completed chore.
3. For each resident: a pool of all jobs completed by others with this resident listed as witness. The resident needs to approve those jobs before they can be logged as completed.
4. For each resident: A log of all completed chores for this resident.
5. For each resident: Calculation of end-of-semester fines based on the amount of hours still needed in the semester.
6. [Bonus, if we have time] Makeup hour functionality that allows the house managers to create certain jobs as makeup hours and also for residents to give up their jobs as makeup hours and then also claim makeup hours.

## Ethical Analysis

1. WILG Jobs House Managers are a stakeholder that have a lot of control over the jobs system. These privileges should not be widely available, so there should be a user authentication feature that ensures only select users (house managers) can access certain functionality.

2. WILG Residents are another stakeholder that can experience financial penalties due to missed chores. Making it easier for them to see which jobs they’ve already completed and logged via a user-specific completed jobs dashboard will help them stay on top of their jobs and be more aware of where they stand in terms of hours owed.

3. WILG members relationships with one another may be affected. It could cause tensions between administrators and residents since there is an innate power difference between those who carry out penalties and those who receive it, could lead to people pairing up to check off their chores (maliciously). However, it might also lead to people becoming closer (they might do each other’s tasks when one person is busy + the other person isn’t)

4. Short term effects might include an initial learning curve in adoption of the tool. This might cause some resistance when there is already a system in place, like for WILG, even if that system is faulty. For busy students, like those who run WILG, this initial hurdle might be too big to overcome.

5. To adapt this tool to encourage chore completion, additional functionality might be necessary. This app already facilitate the assigning and submission of chores. But if there’s only one centralized manager assigning chores, it might encourage people to only do chores that have been assigned and not things they see around the house, so we could allow everyone to add chores for additional rewards or some other benefit.

6. This app might only be suitable for certain types of chore cultures, as the system it implements leans toward the punitive side, with penalties rather than rewards. Some cultures do not assign chores to the children, which could lead to resistance to adaptation of the system. People who are not used to doing chores might be more liable to forgetting to use the app, especially in a college setting where people are transitioning from an at home setting to a foreign college setting.

7. We want to uphold the values of community, cooperation, ownership, and trust. This is because our features require for there to be a trust that the members will be honest about completing their tasks, as well as the witnesses. It also requires there to be ownership on the end of the person completing the tasks. It requires cooperation, since house managers will be assigning to residents. It requires community, since everyone needs to be communicative and work together to complete their chores successfully.
