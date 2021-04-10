import React from "react"
import { Button, ButtonProps } from "."
import { Icons } from "../icons"

export default {
    title: "Buttons"
}

export const Standard = (props: ButtonProps) => (
    <Button {...props}>This says stuff!</Button>
)

Standard.args = { kind: "primary" }
Standard.argTypes = {
    kind: { control: { type: "radio", options: ["primary", "secondary"] } },
    fontSize: { control: "number" },
    color: { control: "color" },
    textColor: { control: "color" }
}

export const Icon = (props: ButtonProps) => (
    <Button {...props} Icon={Icons.account} />
)

Icon.args = { fontSize: 16 }
Icon.argTypes = {
    fontSize: { control: "number" },
    color: { control: "color" }
}
