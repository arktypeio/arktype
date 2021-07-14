# Getting started

Before you can start testing you'll need to install redo using your package manager of choice (npm, yarn, pnpm, etc.):

```bash
npm install @re-do/test
```

Now you can launch the app, which will install your release automatically:

```bash
npx redo launch
```

After you click the "+" icon in the top left corner of the app to create a new test, a browser will launch. Use it to navigate to the site you'd like to test, and start interacting with it the way you would normally. You'll see steps
representing each action you take. Highlighting a text value will assert its presence.

When you're done with your test, name it and click the "✔" icon to save.

All of the data needed to run your test will be stored in a `redo.json` file in your current directory. Your tests can be easily integrated with test runners like `jest` as follows:

```js
import { getTests, run } from "@re-do/test"

describe.each(getTests())(
    "",
    ({ name, id }) => {
        test(name, async () => {
            await run({ id })
        }, 30000)
    }
)
```

The snippet above tells jest to run every test in your `redo.json` data.

We are still in beta and have lots more functionality to document and build, but we've love to hear your feedback! If you run into any problems or would like to suggest a feature, please create an issue for us [on GitHub](https://github.com/re-do/redo) or email me at david@redo.qa 😻
