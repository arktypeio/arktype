import React from "react"
import { storiesOf } from "@storybook/react"
import { AppBar } from "."
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"
import { AccountCircle } from "@material-ui/icons"
import { TextInput } from "../inputs"
import { Text } from "../text"

storiesOf("AppBar", module).add("basic", () => {
    return (
        <ThemeProvider theme={defaultTheme}>
            <AppBar>
                <Text>Admiral AppBar</Text>
                <TextInput kind="underlined" colorTemplate="light" />
                <AccountCircle onClick={() => console.log("clicked")} />
            </AppBar>
        </ThemeProvider>
    )
})
