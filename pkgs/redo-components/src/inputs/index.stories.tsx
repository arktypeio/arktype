import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { TextInput } from "./text"

storiesOf("Text Input", module)
    .addDecorator(withTheme())
    .add("Underlined text input", () => (
        <TextInput label="name" kind="underlined" />
    ))
    .add("Outlined text input", () => (
        <TextInput label="name" kind="outlined" />
    ))
