import React from "react"
import { Column, Card, Text } from "@re-do/components"
import { PostPreview } from "./PostPreview"
import { posts } from "./posts"

export const Blog = () => {
    return (
        <Column justify="space-between">
            <Card style={{ padding: 16, width: "100%" }}>
                <Text
                    variant="h4"
                    color="primary"
                    style={{ paddingBottom: 24 }}
                >
                    Recent Posts
                </Text>
                {posts.map((post) => (
                    <PostPreview key={post.title} post={post} />
                ))}
            </Card>
        </Column>
    )
}
