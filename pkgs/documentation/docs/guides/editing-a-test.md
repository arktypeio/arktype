---
sidebar_position: 3
---

# Editing an existing test

## Installing Redo

Install Redo using  ```npm```:

```bash
npm install --save-dev @re-do/test
```

Or install Redo using ```yarn```: 

```bash
yarn add --dev @re-do/test
```

## How to use Redo

You can use Redo with your favorite testing package. Two of the most popular are Jest and Mocha.

### How to use Redo with Jest

#### Step 1: Install Jest

Install Jest using  ```npm```:

```bash
npm install --save-dev jest
```

Or install Redo using ```yarn```: 

```bash
yarn add --dev jest
```

#### Step 2: Add a file to hold the test

Add a \__tests__ folder in your `src` folder so Jest knows where to look for the tests.

Add an index test file in your \__tests___ folder. For example, your structure could look like:

`src/__tests__/index.test.js`

#### Step 3: Add the Jest code

Add the following code to your `src/__tests__/index.test.js` file.

```jsx title="src/__tests__/index.test.js"
import { getTests, run } from "@re-do/test";

describe.each(getTests())("", ({ name, id }) => {
  test(
    name,
    async () => {
      await run({ id });
    },
    30000
  );
});
```

#### Step 4: Launch Redo

From your command line, run:

```bash
npx redo launch
```

#### Step 5: Launch Redo

From your command line, run:

```bash
npx redo launch
```

#### Step 6: Create a free account

So that we can make:

```bash
npx redo launch
```

## Create your first Markdown Page

Create a file at `src/pages/my-markdown-page.md`:

```mdx title="src/pages/my-markdown-page.md"
# My Markdown page

This is a Markdown page
```

A new page is now available at `http://localhost:3000/my-markdown-page`.
