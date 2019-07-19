import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { muiTheme } from "../utils"
import { PrimaryButton } from "."

storiesOf("Button", module)
    .addDecorator(muiTheme())
    .add("with text", () => (
        <PrimaryButton onClick={action("clicked")} text="Hello Button" />
    ))
    .add("with some emoji", () => (
        <PrimaryButton onClick={action("clicked")} text="😀 😎 👍 💯" />
    ))
