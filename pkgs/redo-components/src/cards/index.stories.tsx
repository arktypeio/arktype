import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ContentCard, CardPage, Card } from "./"

storiesOf("Card", module)
    .addDecorator(withTheme())
    .add("Regular card with text", () => <Card> Hi! This is a card. </Card>)
    .add("ContentCard with text", () => (
        <ContentCard from={{ Keyname: "This is the value in the dict" }} />
    ))
    .add("CardPage with text", () => (
        <CardPage> Hi! This is a cardpage. </CardPage>
    ))
