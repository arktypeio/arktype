import React from "react"
import { storiesOf } from "@storybook/react"
import { Button } from "."
import { withKnobs, select } from "@storybook/addon-knobs"
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"

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
