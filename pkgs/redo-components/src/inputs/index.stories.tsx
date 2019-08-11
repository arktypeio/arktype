import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { TextInput } from "."
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"
import { withKnobs, select } from "@storybook/addon-knobs"

storiesOf("Text Input", module)
    .addDecorator(withTheme())
    .addDecorator(withKnobs)
    .add("Input with knobs", () => (
        <ThemeProvider theme={defaultTheme}>
            <TextInput kind={select("kind", ["outlined", "underlined"])} />
        </ThemeProvider>
    ))

    .add("Underlined text input", () => (
        <ThemeProvider theme={defaultTheme}>
            <TextInput label="name" kind="underlined" />
        </ThemeProvider>
    ))
    .add("Outlined text input", () => (
        <ThemeProvider theme={defaultTheme}>
            <TextInput label="name" kind="outlined" />
        </ThemeProvider>
    ))
