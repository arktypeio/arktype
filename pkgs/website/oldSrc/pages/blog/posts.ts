import { PostData } from "./common"
// @ts-ignore
import BurningEarth from "./assets/BurningEarth.png"
// @ts-ignore
import ExponentialTesting from "./assets/ExponentialTesting.png"

export const posts: PostData[] = [
    {
        title: "Time for a Redo",
        caption:
            "Web testing is broken. Selenium should have died 10 years ago. Why is it still a thing?",
        image: ExponentialTesting,
        link: "https://bit.ly/time-for-a-redo"
    },
    {
        title: "What founding a startup and global warming have in common",
        caption:
            "The last few months taught me a lot about burnout. It’s not all fire and brimstone.",
        image: BurningEarth,
        link: "https://bit.ly/startups-global-warming"
    }
]
