import React from "react"
import { Card, Text } from "@re-do/components"
import { CardActionArea } from "@material-ui/core"
import { PostData } from "content"

export type PostPreviewProps = {
    post: PostData
}

export const PostPreview = ({
    post: { title, caption, image, link }
}: PostPreviewProps) => {
    return (
        <Card
            elevation={24}
            style={{ maxWidth: 700, marginBottom: 24, padding: 0 }}
            onClick={() => window.open(link)}
        >
            <CardActionArea style={{ padding: 8 }}>
                <Text align="center" variant="h4">
                    {title}
                </Text>
                <img src={image} alt={title} style={{ width: "100%" }} />
                <Text align="center" style={{ fontSize: 24 }}>
                    <i>{caption}</i>
                </Text>
            </CardActionArea>
        </Card>
    )
}
