import React from "react"
import { hot } from "react-hot-loader"
import { CssBaseline } from "@material-ui/core"
import { ThemeProvider } from "@material-ui/styles"
import { Background } from "./Background"
import { Content } from "./Content"
import { theme } from "./theme"

const ColdApp = () => (
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <Background />
        <Content />
    </ThemeProvider>
)

export const App = hot(module)(ColdApp)
