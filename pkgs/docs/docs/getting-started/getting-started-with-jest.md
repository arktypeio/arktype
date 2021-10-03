---
sidebar_position: 1
---

# Get started with Jest

## Installing Redo

Install Redo using  ```npm```:

```bash
npm install --save-dev @re-do/test
```

Or install Redo using ```yarn```:

```bash
yarn add --dev @re-do/test
```

## How to use Redo with Jest

You can use Redo with your favorite testing package. Two of the most popular are Jest and Mocha.

### Step 1: Install Jest

Install Jest using  ```npm```:

```bash
npm install --save-dev jest
```

Or install Redo using ```yarn```:

```bash
yarn add --dev jest
```

### Step 2: Add a file to hold the test

Add a \__tests__ folder in your `src` folder so Jest knows where to look for the tests.

Add an index test file in your \__tests___ folder. For example, your structure could look like:

`src/__tests__/index.test.js`

### Step 3: Add the Jest code

Add the following code to your `src/__tests__/index.test.js` file.

```javascript title="src/__tests__/index.test.js"
import { getTests, run } from "@re-do/test";

describe.each(getTests())("", ({ name, id }) => {
  test(
    name,
    async () => {
      await run({ id });
    },
    30000
  )
})
```

Note: If you are using TypeScript, you will likely need to either update babel (see the Jest with TypeScript documentation [here](https://jestjs.io/docs/getting-started#using-typescript)) or install and use ts-jest (see ts-jest [here](https://www.npmjs.com/package/ts-jest)).

### Step 4: Create your first test

To learn how to create your first test, see the guide entitled, [Creating your first test](/guides/creating-your-first-test).
