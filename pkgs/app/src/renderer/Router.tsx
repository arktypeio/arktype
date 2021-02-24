import React, { useEffect } from "react"
import { hot } from "react-hot-loader/root"
import { AppContents } from "@re-do/components"
import { Page } from "state"
import { store } from "renderer/common"
import { Home, Builder, Landing, Results } from "./pages"

export const Router = hot(() => {
    const { page, token } = store.useQuery({
        page: true,
        token: true
    })
    const redirected = route(page!, !!token)
    useEffect(() => {
        if (redirected !== page) {
            store.mutate({ page: redirected })
        }
    })
    return <AppContents>{Pages[redirected]}</AppContents>
})

type NameToPage = { [_ in NonNullable<Page>]: JSX.Element }

export const Pages: NameToPage = {
    HOME: <Home />,
    SIGN_IN: <Landing page={Page.SignIn} />,
    SIGN_UP: <Landing page={Page.SignUp} />,
    LEARNER: <Builder />,
    RESULTS: <Results />
}

const UnauthedPages = [Page.SignIn, Page.SignUp]

const route = (requested: Page, authed: boolean) => {
    let redirected = requested
    if (authed) {
        if (!redirected || UnauthedPages.includes(redirected)) {
            redirected = Page.Home
        }
    } else {
        if (!redirected || !UnauthedPages.includes(redirected)) {
            redirected = Page.SignIn
        }
    }
    if (window.location.pathname === "/builder") {
        redirected = Page.Builder
    }
    return redirected
}
