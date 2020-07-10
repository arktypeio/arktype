import React from "react"
import { Route, Switch } from "react-router-dom"
import { Column, Card, Text } from "@re-do/components"
import { layout } from "../../constants"
import { PostPreview } from "./PostPreview"
import { posts } from "./posts"

export const Blog = () => {
    return (
        <>
            <Switch>
                <Route path="/blog">
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
                        <div style={{ height: layout.contactInfo.height }} />
                    </Column>
                </Route>
            </Switch>
        </>
    )
}
