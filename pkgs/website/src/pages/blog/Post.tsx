import React from "react"
import { PostData, dateToString } from "./common"
import { Text, Row, Column } from "@re-do/components"

export type PostProps = {
    data: PostData
}

const horizontalPadding: React.CSSProperties = {
    paddingLeft: 16,
    paddingRight: 16
}

export const Post = ({ data: { title, date, content } }: PostProps) => {
    return (
        <Column align="center">
            <Text variant="h4">{title}</Text>
            <Row justify="space-between" style={horizontalPadding}>
                <Text>
                    <i>by David Blass</i>
                </Text>
                <Text>
                    <i>{dateToString(date)}</i>
                </Text>
            </Row>
            <br />
            <Column style={horizontalPadding}>{content}</Column>
        </Column>
    )
}
