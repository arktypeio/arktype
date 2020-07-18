import React from "react"
import { storiesOf } from "@storybook/react"
import { Modal } from "."
import { Button } from "../buttons"
import { Text } from "../text"

storiesOf("Modals", module).add("ModalView", () => (
    <Modal toggle={<Button>Open modal!</Button>} content={<Text>Hi!</Text>} />
))
