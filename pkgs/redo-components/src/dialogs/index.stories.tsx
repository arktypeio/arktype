import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { muiTheme } from "../utils"
import { Dialog } from "./"

storiesOf("Dialog", module)
    .addDecorator(muiTheme())
    .add("Dialog with text", () => (
        <Dialog open={true} title="This is a dialog">
            Hi! This is a Dialog.
        </Dialog>
    ))
