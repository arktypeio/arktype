import React from "react"
import { withKnobs, select } from "@storybook/addon-knobs"
import { storiesOf } from "@storybook/react"
import { TextInput } from "."

storiesOf("Input", module)
    .addDecorator(withKnobs)
    .add("Text", () => (
        <TextInput
            kind={select(
                "kind",
                { outlined: "outlined", underlined: "underlined" },
                "outlined"
            )}
        />
    ))
    .add("Chip", () => <TextInput chip colorTemplate="light" />)
