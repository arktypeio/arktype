import React, { useEffect } from "react"
import { Page } from "state"
import { store } from "renderer/common"
import { Home } from "./home"
import { Learner } from "./learner"
import { Landing } from "./landing"
import { Results } from "./results"

type NameToPage = { [_ in NonNullable<Page>]: JSX.Element }

export const Pages: NameToPage = {
    HOME: <Home />,
    SIGN_IN: <Landing page={Page.SignIn} />,
    SIGN_UP: <Landing page={Page.SignUp} />,
    LEARNER: <Learner />,
    RESULTS: <Results />
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

export const Router = () => {
    const { page, token, learner } = store.useQuery({
        page: true,
        token: true,
        learner: true
    })
    const redirected = route(page!, !!token, learner!.active)
    useEffect(() => {
        if (redirected !== page) {
            store.mutate({ page: redirected })
        }
    })
    return Pages[redirected]
}
