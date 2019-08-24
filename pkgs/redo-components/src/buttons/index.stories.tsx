import React from "react"
import { storiesOf } from "@storybook/react"
import { Button, IconButton } from "."
import { withKnobs, select } from "@storybook/addon-knobs"
import { Icons } from "../icons"

storiesOf("Button", module)
    .addDecorator(withKnobs)
    .add("Standard", () => {
        return (
            <Button
                kind={select(
                    "kind",
                    { primary: "primary", secondary: "secondary" },
                    "primary"
                )}
            >
                This says stuff!
            </Button>
        )
    })
    .add("IconButton", () => (
        <Icons.account onClick={() => console.log("Hello")} />
    ))
