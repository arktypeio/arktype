import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ModalView, ModalText } from "."
import { ModalButton } from "./ModalButton"
import { objectActions } from "../trees/index.stories"
storiesOf("Modals", module)
    .addDecorator(withTheme())
    .add("ModalView", () => <ModalView open={true} />)
    .add("ModalText", () => (
        <ModalText open={false}>Click me, I'm a modalView!</ModalText>
    ))
    .add("ModalButton", () => (
        <ModalButton open={false}>Click me, I'm a modalView!</ModalButton>
    ))
