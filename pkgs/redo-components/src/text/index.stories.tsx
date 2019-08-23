import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs, text, object, select } from "@storybook/addon-knobs"
import { ErrorText } from "."

const getKnobProps = () => {
    const textChildren = text("children", "this says stuff")
    const objectChildren = object("childrenArray", null)
    const toolTipPlacement = select(
        "toolTipPlacement",
        {
            "bottom-end": "bottom-end",
            "bottom-start": "bottom-start",
            bottom: "bottom",
            "left-end": "left-end",
            "left-start": "left-start",
            left: "left",
            "right-end": "right-end",
            "right-start": "right-start",
            right: "right",
            "top-end": "top-end",
            "top-start": "top-start",
            top: "top"
        },
        "bottom"
    )

    return {
        children: objectChildren ? objectChildren : textChildren,
        toolTipPlacement
    }
}

storiesOf("Text", module)
    .addDecorator(withKnobs)
    .add("ErrorText", () => <ErrorText {...getKnobProps()} />)
