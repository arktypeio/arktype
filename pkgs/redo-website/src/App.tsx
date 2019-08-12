import React from "react"
import { hot } from "react-hot-loader"
import { CssBaseline } from "@material-ui/core"
import { ThemeProvider } from "@material-ui/styles"
import { Content } from "./Content"
import { defaultTheme } from "redo-components"

const ColdApp = () => (
    <ThemeProvider theme={defaultTheme}>
        <CssBaseline />
        <Content />
    </ThemeProvider>
)

export const App = hot(module)(ColdApp)
