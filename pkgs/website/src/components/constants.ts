import isMobile from "ismobilejs"

export const layout = {
    header: {
        height: 80,
        slantHeight: 40
    },
    maxWidth: 1200
}

export const copy = {
    subheader: {
        title: `💡A new way to test`,
        content: `Building something great requires good tests, but it shouldn't be your job
            to automate, run, or maintain them. Redo learns how your app works and does
            all that for you.`
    },
    howItWorks: {
        title: `🔨How it works`,
        steps: [
            {
                summary: `Install and open Redo`,
                details: `After launch, Redo will be installable via npm/yarn/pnpm. Redo can be used through our CLI or desktop app.`
            },
            {
                summary: `Interact with your website`,
                details: `Redo will launch a browser you can use to interact with your website. 
                      Whenever you do something on your page, Redo learns how to perform that action automatically.`
            },
            {
                summary: `Save your automated test`,
                details: `After you're done, Redo will use your test and others you've saved to build a transparent,
                      well-structured model of your app, just like an engineer would.
                      You can run your tests anytime, anywhere, and get clear, deterministic results.`
            }
        ]
    }
}
