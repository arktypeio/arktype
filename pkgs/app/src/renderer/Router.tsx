import React, { useEffect } from "react"
import { AppContents } from "@re-do/components"
import { Page } from "state"
import { store } from "renderer/common"
import { Home, Landing } from "./pages"
import { Builder } from "./builder"

export const Router = () => {
    // This URL is loaded if and only if we're in the builder window
    if (window.location.hash === "#builder") {
        return (
            <AppContents>
                <Builder />
            </AppContents>
        )
    }
    // Otherwise, we're loading a page in the app's main window
    const { page, token } = store.useQuery({
        page: true,
        token: true
    })
    const redirected = route(page!, !!token)
    useEffect(() => {
        if (redirected !== page) {
            store.update({ page: redirected })
        }
    })
    return <AppContents>{Pages[redirected]}</AppContents>
}

type NameToPage = { [_ in NonNullable<Page>]: JSX.Element }

export const Pages: NameToPage = {
    HOME: <Home />,
    SIGN_IN: <Landing page={"SIGN_IN"} />,
    SIGN_UP: <Landing page={"SIGN_UP"} />
}

const UnauthedPages = ["SIGN_IN", "SIGN_UP"]

const route = (requested: Page, authed: boolean) => {
    let redirected = requested
    if (authed) {
        if (!redirected || UnauthedPages.includes(redirected)) {
            redirected = "HOME"
        }
    } else {
        if (!redirected || !UnauthedPages.includes(redirected)) {
            redirected = "SIGN_IN"
        }
    }
    return redirected
}
