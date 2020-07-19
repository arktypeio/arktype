export type PostData = {
    title: string
    caption: string
    image: string
    link: string
}

export const posts: PostData[] = [
    {
        title: "Time for a Redo",
        caption:
            "Web testing is broken. Selenium should have died 10 years ago. Why is it still a thing?",
        image: "ExponentialTesting.png",
        link: "https://bit.ly/time-for-a-redo"
    },
    {
        title: "What founding a startup and global warming have in common",
        caption:
            "The last few months taught me a lot about burnout. It’s not all fire and brimstone.",
        image: "BurningEarth.png",
        link: "https://bit.ly/startups-global-warming"
    }
]
