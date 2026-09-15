# Care coordination release

## Implemented on web and mobile

- Patient summaries keep allergies visible and show recent observations, current medicines, and the active visit. Detailed history and actions have their own sections.
- Patients or the local care team can record the patient's own concerns, preferred language, and practical barriers. Staff record the response discussed during care.
- Doctors and administrators draft, revise, and publish plain-language care instructions. Patients see published instructions, can mark them as read, and can print them on web or share a PDF on native. Earlier published plans remain in web history.
- Staff assign a task to an active colleague with a deadline. Worklists separate urgent/overdue, today, upcoming, waiting, and closed tasks. Handovers preserve version checks; waiting and closure require an outcome.
- Completing a laboratory result creates a clinician-review task. Staff can flag it as urgent with a reason and a named clinician. Reviewing the result closes the task. The deadline cannot be postponed and the task cannot be manually closed as a substitute for review.
- Visit follow-up dates create tasks due at 09:00 Cameroon time. Date changes update open tasks; removing a follow-up cancels its open task. Closed tasks remain historical records; create a new task if further follow-up is needed.
- Distinct native dashboards prioritize each role's work. Three primary staff destinations plus More reduce navigation clutter. Patient record sections and optional forms reveal details when needed.
- The new green and terracotta Careline mark appears in both clients, with matching app icons.

## Operational boundaries

Tasks and concerns are in-app records, not push notifications, SMS, emergency dispatch, or monitored messaging. Urgent results still require direct contact with the responsible clinician. Clinical instructions are entered and approved by people; there are no AI features.

The migration backfills unresolved laboratory results and future follow-ups. Older tasks may have no named owner; administrators should assign them during the pilot. Task worklists are bounded to 200 records on web and 100 on mobile, with separate active/closed queries. Native plans/concerns show up to 50 recent entries. These lists are not comprehensive reports.

Publication and task updates are checked by the database. The UI alone does not determine permissions. The root SQL includes both migrations and can install a fresh project or upgrade the prior schema. It has been exercised locally, not installed into the hosted project.

## Next product phases

The broader ideas remain a phased roadmap, not a claim that every suggested feature is complete:

1. Run the hosted test-facility pilot and physical-device checks in [the release checklist](RELEASE_CHECKLIST.md); refine the screens with patient and staff feedback.
2. Add stronger retrieval and worklist pagination, consent-aware reminder delivery, referral acknowledgements, and follow-up outreach outcomes.
3. Design longitudinal chronic-care and maternal/child-care workflows with the participating clinicians, including locally approved schedules and escalation rules.
4. Add reviewed care-team workload reporting, patient experience feedback, language support, and carefully scoped offline workflows.

AI and monetization are outside the current scope. Provider-backed messaging, clinical protocols, and other external integrations need their own implementation and acceptance tests.
