import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ModalView } from "."
import { Button } from "../buttons"
import { Text } from "../text"
import { objectActions } from "../trees/index.stories"
storiesOf("Modals", module)
    .addDecorator(withTheme())
    .add("ModalView", () => (
        <ModalView>
            {{
                toggle: <Button>Open modal!</Button>,
                content: [<Text>Hi!</Text>]
            }}
        </ModalView>
    ))
