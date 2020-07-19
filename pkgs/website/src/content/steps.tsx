export type StepData = {
    summary: string
    details: string
}

export const steps = [
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
