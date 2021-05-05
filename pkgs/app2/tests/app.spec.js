const {Application} = require('spectron');
const {strict: assert} = require('assert');

const app = new Application({
  path: require('electron'),
  requireName: 'electronRequire',
  args: ['.'],
});

app.start()
  .then(async () => {
    const isVisible = await app.browserWindow.isVisible();
    assert.ok(isVisible, 'Main window not visible');
  })

  .then(async () => {
    const isDevtoolsOpen = await app.webContents.isDevToolsOpened();
    assert.ok(!isDevtoolsOpen, 'DevTools opened');
  })

  .then(async function () {
    // Get the window content
    const content = await app.client.$('#app');
    assert.notStrictEqual(await content.getHTML(), '<div id="app"></div>', 'Window content is empty');
  })

  .then(function () {
    if (app && app.isRunning()) {
      return app.stop();
    }
  })

  .then(() => process.exit(0))

  .catch(function (error) {
    console.error(error);
    if (app && app.isRunning()) {
      app.stop();
    }
    process.exit(1);
  });

