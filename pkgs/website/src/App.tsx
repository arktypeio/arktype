import React, { useEffect } from "react"
import { AppContents, DefaultTheme } from "@re-do/components"
import {
    BrowserRouter as Router,
    Route,
    Switch,
    useLocation
} from "react-router-dom"
import { Home, Blog } from "./pages"

// // See https://reacttraining.com/react-router/web/guides/scroll-restoration
// export const ScrollToTop = () => {
//     const { pathname } = useLocation()
//     useEffect(() => {
//         window.scrollTo(0, 0)
//     }, [pathname])
//     return null
// }

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
