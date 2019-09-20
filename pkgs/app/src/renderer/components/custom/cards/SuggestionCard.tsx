import React from "react"
import { test } from "@re-do/test"
import { Column, Card, Row, useTheme, Text } from "@re-do/components"

export type SuggestionCardProps = {
    name: string
    description?: string
    extras?: JSX.Element[]
}

export const SuggestionCard = ({
    name,
    description,
    extras
}: SuggestionCardProps) => {
    const theme = useTheme()
    return (
        <Card
            style={{
                height: theme.spacing(20),
                width: theme.spacing(20)
            }}
        >
            <Column full={true} justify="space-around">
                <Row full={true} justify="center" align="center">
                    <Text variant="h6" noWrap align="center">
                        {name}
                    </Text>
                </Row>
                {description ? (
                    <Row full={true} justify="center" align="center">
                        <Text variant="body2" align="center">
                            {description}
                        </Text>
                    </Row>
                ) : null}
                <Row full={true} justify="center" align="center">
                    {extras}
                </Row>
            </Column>
        </Card>
    )
}
