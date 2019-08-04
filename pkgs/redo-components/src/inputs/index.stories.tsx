import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { TextInput } from "./text"

storiesOf("Text Input", module)
    .addDecorator(withTheme())
    .add("Underlined text input", () => (
        <TextInput label="name" variant="underlined" />
    ))
    .add("Outlined text input", () => (
        <TextInput label="name" variant="outlined" />
    ))
