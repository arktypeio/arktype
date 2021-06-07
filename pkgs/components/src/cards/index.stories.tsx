import React from "react"
import { Card, CardProps } from "."

export default {
    title: "Cards"
}

export const Basic = (props: CardProps) => <Card {...props} />

Basic.args = {
    children: "I'm a card!",
    sizeToContent: false
}
