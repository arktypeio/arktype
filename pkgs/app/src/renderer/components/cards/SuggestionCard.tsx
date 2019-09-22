import React from "react"
import { Icons, IconButton } from "@re-do/components"
import { Column, Card, Row, useTheme, Text } from "@re-do/components"

type SuggestionKind = "test" | "other"

export type SuggestionCardProps = {
    name: string
    kind: SuggestionKind
    description?: string
    extras?: JSX.Element[]
}

export const getSuggestionExtras = (): SuggestionExtras => {
    return {
        test: [<IconButton Icon={Icons.run} onClick={() => {}} />],
        other: []
    }
}

type SuggestionExtras = { [K in SuggestionKind]: JSX.Element[] }

export const SuggestionCard = ({
    name,
    kind,
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
