import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ErrorText } from "."
import { ThemeProvider } from "@material-ui/styles"
import { defaultTheme } from "../styles"
import { withKnobs, text, object, select } from "@storybook/addon-knobs"

const getKnobProps = () => {
    const textChildren = text("children", "this says stuff")
    const objectChildren = object("childrenArray", null)
    const toolTipPlacement = select("toolTipPlacement", [
        "bottom-end",
        "bottom-start",
        "bottom",
        "left-end",
        "left-start",
        "left",
        "right-end",
        "right-start",
        "right",
        "top-end",
        "top-start",
        "top"
    ])

    return {
        children: objectChildren ? objectChildren : textChildren,
        toolTipPlacement
    }
}

storiesOf("Text", module)
    .addDecorator(withKnobs)
    .add("ErrorText with knobs", () => (
        <ThemeProvider theme={defaultTheme}>
            <ErrorText {...getKnobProps()} />
        </ThemeProvider>
    ))
