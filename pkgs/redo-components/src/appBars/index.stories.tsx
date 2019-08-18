import React from "react"
import { storiesOf } from "@storybook/react"
import { AppBar } from "."
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme, useTheme } from "../styles"
import { Button } from "../buttons"
import { Add } from "@material-ui/icons"
import { TextInput } from "../inputs"

storiesOf("AppBar", module).add("basic", () => {
    return (
        <ThemeProvider theme={defaultTheme}>
            <AppBar>
                <p> Admiral AppBar</p>
                <TextInput kind="underlined" colorTemplate="appBar" />
                <Button> Search</Button>
                <Add />
            </AppBar>
        </ThemeProvider>
    )
})
