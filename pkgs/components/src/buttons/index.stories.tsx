import React from "react"
import { Button, ButtonProps, IconButton, IconButtonProps } from "."
import { Icons } from "../icons"

export default {
    title: "buttons"
}

export const Standard = (props: ButtonProps) => (
    <Button {...props}>This says stuff!</Button>
)

Standard.args = { kind: "primary" }
Standard.argTypes = {
    kind: { control: { type: "radio", options: ["primary", "secondary"] } }
}

export const Icon = (props: IconButtonProps) => (
    <IconButton {...props} Icon={Icons.account} />
)
