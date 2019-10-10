import React from "react"
import { AppContents, Column } from "@re-do/components"
import { AppHeader } from "./components"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { layout } from "./constants"
import { Home, Blog } from "./pages"

export const Content = () => (
    <AppContents>
        <Column align="center" style={{ overflow: "hidden" }}>
            <Router>
                <AppHeader mobile={true} />
                <Column
                    spacing={4}
                    style={{
                        position: "absolute",
                        top:
                            layout.header.contentHeight +
                            layout.header.slantHeight,
                        ...layout.content
                    }}
                >
                    <Switch>
                        <Route exact path="/" component={Home} />
                        <Route path="/blog" component={Blog} />
                    </Switch>
                </Column>
            </Router>
        </Column>
    </AppContents>
)
