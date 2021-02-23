import React from "react"
import { Column, Card, Row, Text } from "@re-do/components"

export type SuggestionCardProps = {
    title: string
    description: string
    extras?: JSX.Element
}

export const SuggestionCard = ({
    title,
    description,
    extras
}: SuggestionCardProps) => {
    return (
        <Card
            style={{
                height: 160,
                width: 160
            }}
        >
            <Column full={true} justify="space-around">
                <Row full={true} justify="center" align="center">
                    <Text variant="h6" noWrap align="center">
                        {title}
                    </Text>
                </Row>
                <Row full={true} justify="center" align="center">
                    <Text variant="body2" align="center">
                        {description}
                    </Text>
                </Row>
                <Row full={true} justify="center" align="center">
                    {extras}
                </Row>
            </Column>
        </Card>
    )
}
