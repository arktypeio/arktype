import React, { useEffect } from "react"
import { AppContents, Column } from "@re-do/components"
import { AppHeader, ContactInfo } from "./components"
import {
    BrowserRouter as Router,
    Route,
    Switch,
    useLocation,
} from "react-router-dom"
import { layout } from "./constants"
import { Home, Blog } from "./pages"

// See https://reacttraining.com/react-router/web/guides/scroll-restoration
export const ScrollToTop = () => {
    const { pathname } = useLocation()
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

export const Inner = () => {
    const headerHeight = layout.headerHeight + layout.slantHeight
    return (
        <Column
            spacing={4}
            style={{
                position: "absolute",
                top: headerHeight,
                ...layout.content,
            }}
        >
            <Switch>
                <Route exact path="/" component={Home} />
                <Route path="/blog" component={Blog} />
            </Switch>
        </Column>
    )
}

export const Content = () => {
    return (
        <AppContents>
            <Column align="center" style={{ overflow: "hidden" }}>
                <Router>
                    <ScrollToTop />
                    <AppHeader />
                    <Inner />
                    <ContactInfo />
                </Router>
            </Column>
        </AppContents>
    )
}
