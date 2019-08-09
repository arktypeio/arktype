import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ModalView, ModalText } from "."
import { ModalButton } from "./ModalButton"
storiesOf("Modals", module)
    .addDecorator(withTheme())
    .add("ModalView", () => <ModalView open={true} />)
    .add("ModalText", () => <ModalText>Click me, I'm a modalView!</ModalText>)
    .add("ModalButton", () => (
        <ModalButton>Click me, I'm a modalView!</ModalButton>
    ))
