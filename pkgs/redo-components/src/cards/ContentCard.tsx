import React, { FC } from "react"
import { Text } from "../text"
import { Column, Row } from "../layouts"
import { Card, CardProps } from "./Card"

export type ContentCardProps = CardProps & {
    from: Record<string, any>
}

export const ContentCard: FC<ContentCardProps> = ({ from, children }) => {
    return (
        <Card>
            {from ? (
                <>
                    <Column>
                        {Object.entries(from).map(([k, v]) => (
                            <Row justify="center" key={k}>
                                <Text variant="body2">{`${k}: ${String(
                                    v
                                )}`}</Text>
                            </Row>
                        ))}
                    </Column>
                    {children}
                </>
            ) : (
                children
            )}
        </Card>
    )
}
