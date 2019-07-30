import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withTheme } from "../storybook"
import { PrimaryButton, SecondaryButton } from "./"

storiesOf("Button", module)
    .addDecorator(withTheme())
    .add("Primary button with text", () => (
        <PrimaryButton onClick={action("clicked")}>Hello Button</PrimaryButton>
    ))
    .add("Secondary text with some emoji", () => (
        <SecondaryButton onClick={action("clicked")}>
            😀 😎 👍 💯
        </SecondaryButton>
    ))
