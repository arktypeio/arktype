import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { Column, Row } from "../layouts"
import { createStyles } from "@material-ui/styles"
import { Card, CardProps } from "./Card"

export type ContentCardProps = CardProps & {
    from: Record<string, string | number>
}

export const ContentCard = ({ from, children }: ContentCardProps) => {
    return (
        <Card>
            {from ? (
                <>
                    <Column>
                        {Object.entries(from).map(([k, v]) => (
                            <Row justify="center" key={k}>
                                <Typography variant="body2">{`${k}: ${v}`}</Typography>
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
