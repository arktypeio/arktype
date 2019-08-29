import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs, object, text } from "@storybook/addon-knobs"
import { ContentCard, Card } from "."

storiesOf("Card", module)
    .addDecorator(withKnobs)
    .add("ContentCard", () => (
        <ContentCard
            from={object("from", {
                key: "value",
                anotherKey: "anotherValue"
            })}
        />
    ))
    .add("Standard", () => <Card children={text("children", "I am a card!")} />)
