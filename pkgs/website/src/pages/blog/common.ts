export type PostData = {
    title: string
    date: Date
    caption: string
    content: JSX.Element
}

export type UpdateData = {
    date: Date
    goals: Record<string, boolean>
}

export const getUrlSuffix = (post: PostData) =>
    post.title
        .toLowerCase()
        .replace(/\s/g, "-")
        .replace(/[^0-9a-z\-]/g, "")

export const dateToString = (date: Date) => date.toLocaleDateString()
