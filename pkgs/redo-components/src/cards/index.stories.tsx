import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { ContentCard, Card } from "."
import { withKnobs, object, text } from "@storybook/addon-knobs"

storiesOf("Card", module)
    .addDecorator(withTheme())
    .addDecorator(withKnobs)
    .add("ContentCard with knobs", () => (
        <ContentCard
            from={object("from", { key: "value", anotherKey: "anotherValue" })}
        />
    ))
    .add("Regular card with knobs", () => (
        <Card children={text("children", "hey look text")} />
    ))
