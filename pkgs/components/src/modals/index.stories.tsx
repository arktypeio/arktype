import React from "react"
import { Modal } from "."
import { Button } from "../buttons"
import { Text } from "../text"

export default {
    title: "Modals"
}

export const ModalView = () => (
    <Modal toggle={<Button>Open modal!</Button>} content={<Text>Hi!</Text>} />
)
