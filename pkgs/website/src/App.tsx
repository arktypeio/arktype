import React from "react"
import { AppContents, DefaultTheme } from "@re-do/components"
import { BrowserRouter as Router, Route, Switch } from "react-router-dom"
import { Home, Blog } from "./pages"

export const App = () => {
    return (
        <DefaultTheme>
            <AppContents>
                <Router>
                    <Switch>
                        <Route exact path="/" component={Home} />
                        <Route path="/blog" component={Blog} />
                    </Switch>
                </Router>
            </AppContents>
        </DefaultTheme>
    )
}
