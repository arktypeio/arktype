import React from "react"
import { Card, Column, Text } from "@re-do/components"
import { posts } from "./content"
import { PostSummary } from "./PostSummary"
import { getUrlSuffix } from "./common"

export const PostViewer = () => {
    return (
        <Card style={{ padding: 16, width: "100%" }}>
            <Text variant="h4" color="primary" style={{ paddingBottom: 24 }}>
                Recent Posts
            </Text>
            {posts.map(post => (
                <PostSummary
                    key={post.title}
                    post={post}
                    linksTo={`/blog/${getUrlSuffix(post)}`}
                />
            ))}
        </Card>
    )
}
