# Typescript + React + Parcel = ❤️

This repository has basic settings for buildling react application in Typescript.

The original source code of the provided example is in [here](https://kentcdodds.com/blog/compound-components-with-react-hooks).

## Built in settings

- React + ReactDOM (16.8+)
- Typescript (with TSLint setting)
- Prettier + tslint-config-prettier
- Test configuration using Jest and [react-testing-library](https://github.com/kentcdodds/react-testing-library)
- Parcel bundler (1.12+)

## How to set up the project

**Disclaimer**  
Since I only use Yarn as my primary package manager, this repository will ignore `package-lock.json` file on commit.  
If you prefer npm to Yarn, Please modify `.gitignore` file following your flavor.

```
git clone git@github.com:adhrinae/ts-react-parcel.git
cd ts-react-parcel
yarn install
```

## How to start development for the application

    # With type checking
    yarn develop

    # Transpile only
    yarn start

Execute the command and you can run & test the application on `localhost:1234` in the browser.

## How to build the application

    yarn build

The default output directory is `/dist`. You can change the destination wherever you want.

```
// package.json
// ...
"scripts": {
  // ...
  "build": "... parcel build ./src/index.html -d YOUR_OUTPUT_DIR --public-url '/'" <- Change here
}
// ...
```

## How to test the application

    yarn test       # run test once
    yarn test:watch # watch mode

You have to create `__tests__` directory at the same location of files which you want to test.
Test file's name should be `SOURCE.test.ts/tsx/js` or `SOURCE.spec.ts/tsx/js`.

## Miscellaneous

This Project uses pre-commit hook for `prettier` and testing application.  
If you don't like it, remove the `husky` package from your repository and erase following scripts.

    yarn remove husky

then

```
// package.json
// ...
"husky": {
  "hooks": {
    "pre-commit": "npm run prettify && npm run test"
  }
},
// ...
```
