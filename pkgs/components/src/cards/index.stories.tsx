import React from "react"
import { storiesOf } from "@storybook/react"
import { withKnobs, object, text } from "@storybook/addon-knobs"
import { ContentCard, ContentCardProps, Card, CardProps } from "."

export default {
    title: "cards"
}

export const Standard = (props: CardProps) => <Card {...props} />

Standard.args = {
    children: "I'm a card!"
}

export const Content = (props: ContentCardProps) => <ContentCard {...props} />

Content.args = {
    from: {
        key: "value",
        anotherKey: "anotherValue"
    }
}

Content.argTypes = {
    from: {
        control: "object"
    }
}

// storiesOf("Card", module)
//     .addDecorator(withKnobs)
//     .add("Standard", () => )
