import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withTheme } from "../storybook"
import { Button } from "."
import { withKnobs, text, boolean, number } from "@storybook/addon-knobs"

storiesOf("Button", module)
    .addDecorator(withTheme())
    .add("Primary", () => (
        <Button kind="primary" onClick={action("clicked")}>
            I'm bold 😲
        </Button>
    ))
    .add("Secondary", () => (
        <Button kind="secondary" onClick={action("clicked")}>
            I'm subtle 😉
        </Button>
    ))
    .addDecorator(withKnobs)
