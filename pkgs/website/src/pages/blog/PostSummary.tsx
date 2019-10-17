import React from "react"
import { Card, Text, Row, Link } from "@re-do/components"
import { PostData } from "./common"

export type PostSummaryProps = {
    post: PostData
    linksTo: string
}

export const PostSummary = ({ linksTo, post }: PostSummaryProps) => {
    return (
        <Card style={{ width: "100%" }}>
            <Row justify="space-between" align="baseline">
                <Link to={linksTo}>
                    <Text variant="h5">{post.title}</Text>
                </Link>
                <Text>{post.date}</Text>
            </Row>
            <Text>{post.caption}</Text>
        </Card>
    )
}
