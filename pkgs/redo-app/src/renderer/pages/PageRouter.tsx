import React from "react"
import { useEffect } from "react"
import { Page } from "state"
import { component } from "blocks"
import { Home, Learner, SignIn, SignUp, TestView, TagView, BrowserEventView } from "."

type NameToPage = { [_ in NonNullable<Page>]: JSX.Element }

export const Pages: NameToPage = {
    HOME: <Home />,
    SIGN_IN: <SignIn />,
    SIGN_UP: <SignUp />,
    LEARNER: <Learner />,
    TEST_VIEW: <TestView />,
    TAG_VIEW: <TagView />,
    BROWSER_EVENT_VIEW: <BrowserEventView />
}

const UnauthedPages = [Page.SignIn, Page.SignUp]

const route = (requested: Page, authed: boolean, learnerActive: boolean) => {
    let redirected = requested
    if (authed) {
        if (!redirected || UnauthedPages.includes(redirected)) {
            redirected = Page.Home
        } else {
            if (learnerActive) {
                // Redirect to Learner page whenever Learner becomes active
                redirected = Page.Learner
            } else if (redirected === Page.Learner) {
                // Redirect to Home whenever Learner deactivates
                redirected = Page.Home
            }
        }
    } else {
        if (!redirected || !UnauthedPages.includes(redirected)) {
            redirected = Page.SignIn
        }
    }
    return redirected
}

export const PageRouter = component({
    name: "PageRouter",
    query: { token: null, page: null, learner: { active: null } },
    store: true
})(({ store, data }) => {
    const { page, token, learner } = data
    const redirected = route(page!, !!token, learner!.active)
    useEffect(() => {
        if (redirected !== page) {
            store.mutate({ page: redirected })
        }
    })
    return Pages[redirected]
})
