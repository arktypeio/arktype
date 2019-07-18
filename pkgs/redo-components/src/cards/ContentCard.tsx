import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { component, Column, Row } from "blocks"
import { createStyles } from "@material-ui/styles"
import { Card } from "./Card"

const styles = (theme: Theme) => createStyles({})

export type ContentCardProps = {
    from: Record<string, string | number>
}

export const ContentCard = component({
    name: "ContentCard",
    defaultProps: {} as Partial<ContentCardProps>,
    styles
})(({ classes, from, children }) => {
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
})
