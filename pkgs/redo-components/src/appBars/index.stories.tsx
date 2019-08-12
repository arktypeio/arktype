import React from "react"
import { storiesOf } from "@storybook/react"
import { AppBar } from "."
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"

storiesOf("AppBar", module).add("basic", () => {
    return (
        <ThemeProvider theme={defaultTheme}>
            <AppBar includeSearch={true} />
        </ThemeProvider>
    )
})
