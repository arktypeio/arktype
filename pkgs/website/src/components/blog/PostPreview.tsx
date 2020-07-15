import React from "react"
import { Card, Text, Row } from "@re-do/components"
import { PostData } from "./common"

export type PostPreviewProps = {
    post: PostData
}

export const PostPreview = ({
    post: { title, caption, image, link }
}: PostPreviewProps) => {
    return (
        <Card style={{ width: "100%", marginBottom: 8 }}>
            <Row justify="space-between" align="baseline">
                <a href={link} target="_blank">
                    <Text variant="h5">{title}</Text>
                    <img src={image} alt={title} style={{ width: "100%" }} />
                </a>
            </Row>
            <Text variant="subtitle1">{caption}</Text>
        </Card>
    )
}
