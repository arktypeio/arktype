import isMobile from "ismobilejs"

export const layout = {
    header: {
        maxWidth: 1250,
        padding: 16,
    },
    content: {
        maxWidth: 600,
        minWidth: 343,
        padding: 16,
    },
    contactInfo: {
        height: 45,
    },
    headerHeight: 225,
    slantHeight: 64,
    middleWidth: 400,
    signUpWidth: 285,
    isMobile: isMobile(window.navigator).any,
}

export const copy = {
    subheader: {
        title: `💡A new way to test`,
        content: `Building something great requires good tests, but it shouldn't be your job
            to automate, run, or maintain them. Redo learns how your app works and does
            all that for you.`,
        features: [
            `😻 Fully open source`,
            `⏱ O(damn) fast`,
            `🚫🎲🧙‍♂️ Deterministic & transparent`,
            `🔌 JS/TS integrations "just work" (npm/🧶, git, Jest, etc.)`,
            `🍫 Incrementally adoptable`,
            `🧬 By and for developers`,
        ],
    },
    howItWorks: {
        title: `🔨How it works`,
        steps: [
            {
                summary: `Install and open Redo`,
                details: `After launch, Redo will be installable via npm/yarn/pnpm. Redo can be used through our CLI or desktop app.`,
            },
            {
                summary: `Interact with your website`,
                details: `Redo will launch a browser you can use to interact with your website. 
                      Whenever you do something on your page, Redo learns how to perform that action automatically.`,
            },
            {
                summary: `Save your automated test`,
                details: `After you're done, Redo will use your test and others you've saved to build a transparent,
                      well-structured model of your app, just like an engineer would.
                      You can run your tests anytime, anywhere, and get clear, deterministic results.`,
            },
        ],
    },
}
