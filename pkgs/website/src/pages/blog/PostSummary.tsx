import React from "react"
import { Card, Text, Row, Link } from "@re-do/components"
import { PostData, dateToString } from "./common"

export type PostSummaryProps = {
    post: PostData
    linksTo: string
}

export const PostSummary = ({
    linksTo,
    post: { title, date, caption }
}: PostSummaryProps) => {
    return (
        <Card style={{ width: "100%", marginBottom: 8 }}>
            <Row justify="space-between" align="baseline">
                <Link to={linksTo}>
                    <Text variant="h5">{title}</Text>
                </Link>
                <Text>{dateToString(date)}</Text>
            </Row>
            <Text>{caption}</Text>
        </Card>
    )
}
