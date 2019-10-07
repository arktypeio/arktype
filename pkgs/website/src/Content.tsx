import React from "react"
import { AppContents, Column } from "@re-do/components"
import { AppHeader } from "./components"
import { BrowserRouter as Router, Route } from "react-router-dom"
import { layout } from "./constants"
import { Home, Blog } from "./pages"

export const Content = () => {
    return (
        <AppContents>
            <Column align="center" style={{ overflow: "hidden" }}>
                <Router>
                    <AppHeader mobile={true} />
                    <Column
                        spacing={4}
                        style={{
                            position: "absolute",
                            top: layout.header.height,
                            ...layout.content
                        }}
                    >
                        <Route exact path="/" component={Home} />
                        <Route path="/blog" component={Blog} />
                    </Column>
                </Router>
            </Column>
        </AppContents>
    )
}
