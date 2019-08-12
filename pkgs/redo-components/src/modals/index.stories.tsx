import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ModalView, ModalText } from "."
import { ModalButton } from "./ModalButton"
import { objectActions } from "../trees/index.stories"
storiesOf("Modals", module)
    .addDecorator(withTheme())
    .add("ModalView", () => <ModalView displayAs={objectActions} open={true} />)
    .add("ModalText", () => (
        <ModalText displayAs={objectActions}>
            Click me, I'm a modalView!
        </ModalText>
    ))
    .add("ModalButton", () => (
        <ModalButton displayAs={objectActions}>
            Click me, I'm a modalView!
        </ModalButton>
    ))
