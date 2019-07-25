import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { muiTheme } from "../utils"
import { TextInput } from "./text"

storiesOf("Text Input", module)
    .addDecorator(muiTheme())
    .add("Underlined text input", () => (
        <TextInput variant="underlined"> </TextInput>
    ))
    .add("Outlined text input", () => (
        <TextInput variant="outlined"> </TextInput>
    ))
