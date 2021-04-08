import React from "react"
import { ContentCard, ContentCardProps, Card, CardProps } from "."

export default {
    title: "Card"
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
