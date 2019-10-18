import React from "react"
import { AppContents, Column } from "@re-do/components"
import { AppHeader } from "./components"
import {
    BrowserRouter as Router,
    Route,
    Switch,
    useHistory,
    useLocation
} from "react-router-dom"
import { layout } from "./constants"
import { Home, Blog } from "./pages"

export const Inner = () => {
    const headerHeight = layout.header.contentHeight + layout.header.slantHeight
    return (
        <Column
            spacing={4}
            style={{
                position: "absolute",
                top: headerHeight,
                ...layout.content
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
                    <AppHeader mobile={true} />
                    <Inner />
                </Router>
            </Column>
        </AppContents>
    )
}
