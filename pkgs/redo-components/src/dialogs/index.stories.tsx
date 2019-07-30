import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Dialog } from "./"

storiesOf("Dialog", module)
    .addDecorator(withTheme())
    .add("Dialog with text", () => (
        <Dialog open={true} title="This is a dialog">
            Hi! This is a Dialog.
        </Dialog>
    ))
