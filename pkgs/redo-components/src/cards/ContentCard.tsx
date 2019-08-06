import React, { FC } from "react"
import { Typography } from "@material-ui/core"
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
                                <Typography variant="body2">{`${k}: ${String(
                                    v
                                )}`}</Typography>
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
