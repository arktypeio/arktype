import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs, object, text } from "@storybook/addon-knobs"
import { ContentCard, Card } from "."

storiesOf("Card", module)
    .addDecorator(withKnobs)
    .add("ContentCard with knobs", () => (
        <ContentCard
            from={object("from", {
                key: "value",
                anotherKey: "anotherValue"
            })}
        />
    ))
    .add("Regular card with knobs", () => (
        <Card children={text("children", "hey look text")} />
    ))
