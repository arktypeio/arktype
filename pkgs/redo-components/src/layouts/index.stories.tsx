import React from "react"
import { storiesOf } from "@storybook/react"
import { action } from "@storybook/addon-actions"
import { withTheme } from "../storybook"
import { Row } from "./"
import { Card } from "../cards"
import { Column } from "./Column"

storiesOf("Row", module)
    .addDecorator(withTheme())
    .add("Row of cards", () => (
        <Row>
            <Card>Hi! This is a card.</Card>
            <Card> Second card. </Card>
            <Card> Third card. </Card>
        </Row>
    ))
    .add("Column of cards ", () => (
        <Column>
            <Card>Hi! This is a card.</Card>
            <Card> Second card. </Card>
            <Card> Third card. </Card>
        </Column>
    ))
