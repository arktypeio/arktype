/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "../../common/temp/node_modules/dotenv/config.js":
/*!****************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/dotenv/config.js ***!
  \****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* @flow */

(function () {
  __webpack_require__(/*! ./lib/main */ "../../common/temp/node_modules/dotenv/lib/main.js").config(
    Object.assign(
      {},
      __webpack_require__(/*! ./lib/env-options */ "../../common/temp/node_modules/dotenv/lib/env-options.js"),
      __webpack_require__(/*! ./lib/cli-options */ "../../common/temp/node_modules/dotenv/lib/cli-options.js")(process.argv)
    )
  )
})()


/***/ }),

/***/ "../../common/temp/node_modules/dotenv/lib/cli-options.js":
/*!*************************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/dotenv/lib/cli-options.js ***!
  \*************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* @flow */

const re = /^dotenv_config_(encoding|path|debug)=(.+)$/

module.exports = function optionMatcher (args /*: Array<string> */) {
  return args.reduce(function (acc, cur) {
    const matches = cur.match(re)
    if (matches) {
      acc[matches[1]] = matches[2]
    }
    return acc
  }, {})
}


/***/ }),

/***/ "../../common/temp/node_modules/dotenv/lib/env-options.js":
/*!*************************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/dotenv/lib/env-options.js ***!
  \*************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* @flow */

// ../config.js accepts options via environment variables
const options = {}

if (process.env.DOTENV_CONFIG_ENCODING != null) {
  options.encoding = process.env.DOTENV_CONFIG_ENCODING
}

if (process.env.DOTENV_CONFIG_PATH != null) {
  options.path = process.env.DOTENV_CONFIG_PATH
}

if (process.env.DOTENV_CONFIG_DEBUG != null) {
  options.debug = process.env.DOTENV_CONFIG_DEBUG
}

module.exports = options


/***/ }),

/***/ "../../common/temp/node_modules/dotenv/lib/main.js":
/*!******************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/dotenv/lib/main.js ***!
  \******************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* @flow */
/*::

type DotenvParseOptions = {
  debug?: boolean
}

// keys and values from src
type DotenvParseOutput = { [string]: string }

type DotenvConfigOptions = {
  path?: string, // path to .env file
  encoding?: string, // encoding of .env file
  debug?: string // turn on logging for debugging purposes
}

type DotenvConfigOutput = {
  parsed?: DotenvParseOutput,
  error?: Error
}

*/

const fs = __webpack_require__(/*! fs */ "fs")
const path = __webpack_require__(/*! path */ "path")

function log (message /*: string */) {
  console.log(`[dotenv][DEBUG] ${message}`)
}

const NEWLINE = '\n'
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/
const RE_NEWLINES = /\\n/g

// Parses src into an Object
function parse (src /*: string | Buffer */, options /*: ?DotenvParseOptions */) /*: DotenvParseOutput */ {
  const debug = Boolean(options && options.debug)
  const obj = {}

  // convert Buffers before splitting into lines and processing
  src.toString().split(NEWLINE).forEach(function (line, idx) {
    // matching "KEY' and 'VAL' in 'KEY=VAL'
    const keyValueArr = line.match(RE_INI_KEY_VAL)
    // matched?
    if (keyValueArr != null) {
      const key = keyValueArr[1]
      // default undefined or missing values to empty string
      let val = (keyValueArr[2] || '')
      const end = val.length - 1
      const isDoubleQuoted = val[0] === '"' && val[end] === '"'
      const isSingleQuoted = val[0] === "'" && val[end] === "'"

      // if single or double quoted, remove quotes
      if (isSingleQuoted || isDoubleQuoted) {
        val = val.substring(1, end)

        // if double quoted, expand newlines
        if (isDoubleQuoted) {
          val = val.replace(RE_NEWLINES, NEWLINE)
        }
      } else {
        // remove surrounding whitespace
        val = val.trim()
      }

      obj[key] = val
    } else if (debug) {
      log(`did not match key and value when parsing line ${idx + 1}: ${line}`)
    }
  })

  return obj
}

// Populates process.env from .env file
function config (options /*: ?DotenvConfigOptions */) /*: DotenvConfigOutput */ {
  let dotenvPath = path.resolve(process.cwd(), '.env')
  let encoding /*: string */ = 'utf8'
  let debug = false

  if (options) {
    if (options.path != null) {
      dotenvPath = options.path
    }
    if (options.encoding != null) {
      encoding = options.encoding
    }
    if (options.debug != null) {
      debug = true
    }
  }

  try {
    // specifying an encoding returns a string instead of a buffer
    const parsed = parse(fs.readFileSync(dotenvPath, { encoding }), { debug })

    Object.keys(parsed).forEach(function (key) {
      if (!process.env.hasOwnProperty(key)) {
        process.env[key] = parsed[key]
      } else if (debug) {
        log(`"${key}" is already defined in \`process.env\` and will not be overwritten`)
      }
    })

    return { parsed }
  } catch (e) {
    return { error: e }
  }
}

module.exports.config = config
module.exports.parse = parse


/***/ }),

/***/ "./src/main/index.ts":
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
__webpack_require__(/*! dotenv/config */ "../../common/temp/node_modules/dotenv/config.js");
const electron_1 = __webpack_require__(/*! electron */ "electron");
// import electronDevtoolsInstaller, {
//     REACT_DEVELOPER_TOOLS,
//     APOLLO_DEVELOPER_TOOLS
// } from "electron-devtools-installer"
let mainWindow;
const isDev = () => "development" === "development";
const installExtensions = () => {
    // const extensions = {
    //     REACT_DEVELOPER_TOOLS,
    //     APOLLO_DEVELOPER_TOOLS
    // }
    // Object.entries(extensions).forEach(async extension => {
    //     const [name, reference] = extension
    //     try {
    //         console.log(`Installing ${name}...`)
    //         await electronDevtoolsInstaller(reference)
    //     } catch (e) {
    //         console.log(`Failed to install ${name}:`)
    //         console.log(e)
    //     }
    // })
};
const createWindow = () => __awaiter(this, void 0, void 0, function* () {
    const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false
        },
        width,
        height,
        show: false
    });
    // Waiting until devtools is open to show the window
    // avoids an issue that causes Apollo dev tools not to load
    mainWindow.webContents.on("devtools-opened", () => {
        mainWindow.show();
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    yield mainWindow.loadURL(isDev() ? `http://localhost:8080/` : `file://${__dirname}/index.html`);
    mainWindow.webContents.openDevTools();
});
electron_1.app.on("ready", () => __awaiter(this, void 0, void 0, function* () {
    yield installExtensions();
    createWindow();
}));
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWFpbi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEseUJBQXNCO0FBQ3RCLHVDQUFxRDtBQUNyRCxzQ0FBc0M7QUFDdEMsNkJBQTZCO0FBQzdCLDZCQUE2QjtBQUM3Qix1Q0FBdUM7QUFFdkMsSUFBSSxVQUFnQyxDQUFBO0FBRXBDLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLGFBQWEsQ0FBQTtBQUUxRCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtJQUMzQix1QkFBdUI7SUFDdkIsNkJBQTZCO0lBQzdCLDZCQUE2QjtJQUM3QixJQUFJO0lBQ0osMERBQTBEO0lBQzFELDBDQUEwQztJQUMxQyxZQUFZO0lBQ1osK0NBQStDO0lBQy9DLHFEQUFxRDtJQUNyRCxvQkFBb0I7SUFDcEIsb0RBQW9EO0lBQ3BELHlCQUF5QjtJQUN6QixRQUFRO0lBQ1IsS0FBSztBQUNULENBQUMsQ0FBQTtBQUVELE1BQU0sWUFBWSxHQUFHLEdBQVMsRUFBRTtJQUM1QixNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLGlCQUFNLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxZQUFZLENBQUE7SUFDakUsVUFBVSxHQUFHLElBQUksd0JBQWEsQ0FBQztRQUMzQixjQUFjLEVBQUU7WUFDWixXQUFXLEVBQUUsS0FBSztZQUNsQixlQUFlLEVBQUUsSUFBSTtZQUNyQixnQkFBZ0IsRUFBRSxLQUFLO1NBQzFCO1FBQ0QsS0FBSztRQUNMLE1BQU07UUFDTixJQUFJLEVBQUUsS0FBSztLQUNkLENBQUMsQ0FBQTtJQUNGLG9EQUFvRDtJQUNwRCwyREFBMkQ7SUFDM0QsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzlDLFVBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUNGLFVBQVUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUN6QixVQUFVLEdBQUcsSUFBSSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxDQUNwQixLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLFVBQVUsU0FBUyxhQUFhLENBQ3hFLENBQUE7SUFDRCxVQUFVLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFBO0FBQ3pDLENBQUMsQ0FBQSxDQUFBO0FBRUQsY0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBUyxFQUFFO0lBQ3ZCLE1BQU0saUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixZQUFZLEVBQUUsQ0FBQTtBQUNsQixDQUFDLENBQUEsQ0FBQyxDQUFBO0FBRUYsY0FBRyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRTtRQUMvQixjQUFHLENBQUMsSUFBSSxFQUFFLENBQUE7S0FDYjtBQUNMLENBQUMsQ0FBQyxDQUFBO0FBRUYsY0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLElBQUksVUFBVSxLQUFLLElBQUksRUFBRTtRQUNyQixZQUFZLEVBQUUsQ0FBQTtLQUNqQjtBQUNMLENBQUMsQ0FBQyxDQUFBIn0=

/***/ }),

/***/ 0:
/*!*********************************!*\
  !*** multi ./src/main/index.ts ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/ssalbdivad/redo/redo/pkgs/redo-app/src/main/index.ts */"./src/main/index.ts");


/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("electron");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("path");

/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy9ob21lL3NzYWxiZGl2YWQvcmVkby9yZWRvL2NvbW1vbi90ZW1wL25vZGVfbW9kdWxlcy9kb3RlbnYvY29uZmlnLmpzIiwid2VicGFjazovLy8vaG9tZS9zc2FsYmRpdmFkL3JlZG8vcmVkby9jb21tb24vdGVtcC9ub2RlX21vZHVsZXMvZG90ZW52L2xpYi9jbGktb3B0aW9ucy5qcyIsIndlYnBhY2s6Ly8vL2hvbWUvc3NhbGJkaXZhZC9yZWRvL3JlZG8vY29tbW9uL3RlbXAvbm9kZV9tb2R1bGVzL2RvdGVudi9saWIvZW52LW9wdGlvbnMuanMiLCJ3ZWJwYWNrOi8vLy9ob21lL3NzYWxiZGl2YWQvcmVkby9yZWRvL2NvbW1vbi90ZW1wL25vZGVfbW9kdWxlcy9kb3RlbnYvbGliL21haW4uanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL21haW4vaW5kZXgudHMiLCJ3ZWJwYWNrOi8vL2V4dGVybmFsIFwiZWxlY3Ryb25cIiIsIndlYnBhY2s6Ly8vZXh0ZXJuYWwgXCJmc1wiIiwid2VicGFjazovLy9leHRlcm5hbCBcInBhdGhcIiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7OztBQUdBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxrREFBMEMsZ0NBQWdDO0FBQzFFO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsZ0VBQXdELGtCQUFrQjtBQUMxRTtBQUNBLHlEQUFpRCxjQUFjO0FBQy9EOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpREFBeUMsaUNBQWlDO0FBQzFFLHdIQUFnSCxtQkFBbUIsRUFBRTtB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QyxxQzs7Ozs7Ozs7Ozs7QUNBQSwrQjs7Ozs7Ozs7Ozs7QUNBQSxpQyIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IDApO1xuIiwiLyogQGZsb3cgKi9cblxuKGZ1bmN0aW9uICgpIHtcbiAgcmVxdWlyZSgnLi9saWIvbWFpbicpLmNvbmZpZyhcbiAgICBPYmplY3QuYXNzaWduKFxuICAgICAge30sXG4gICAgICByZXF1aXJlKCcuL2xpYi9lbnYtb3B0aW9ucycpLFxuICAgICAgcmVxdWlyZSgnLi9saWIvY2xpLW9wdGlvbnMnKShwcm9jZXNzLmFyZ3YpXG4gICAgKVxuICApXG59KSgpXG4iLCIvKiBAZmxvdyAqL1xuXG5jb25zdCByZSA9IC9eZG90ZW52X2NvbmZpZ18oZW5jb2Rpbmd8cGF0aHxkZWJ1Zyk9KC4rKSQvXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gb3B0aW9uTWF0Y2hlciAoYXJncyAvKjogQXJyYXk8c3RyaW5nPiAqLykge1xuICByZXR1cm4gYXJncy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgY3VyKSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IGN1ci5tYXRjaChyZSlcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgYWNjW21hdGNoZXNbMV1dID0gbWF0Y2hlc1syXVxuICAgIH1cbiAgICByZXR1cm4gYWNjXG4gIH0sIHt9KVxufVxuIiwiLyogQGZsb3cgKi9cblxuLy8gLi4vY29uZmlnLmpzIGFjY2VwdHMgb3B0aW9ucyB2aWEgZW52aXJvbm1lbnQgdmFyaWFibGVzXG5jb25zdCBvcHRpb25zID0ge31cblxuaWYgKHByb2Nlc3MuZW52LkRPVEVOVl9DT05GSUdfRU5DT0RJTkcgIT0gbnVsbCkge1xuICBvcHRpb25zLmVuY29kaW5nID0gcHJvY2Vzcy5lbnYuRE9URU5WX0NPTkZJR19FTkNPRElOR1xufVxuXG5pZiAocHJvY2Vzcy5lbnYuRE9URU5WX0NPTkZJR19QQVRIICE9IG51bGwpIHtcbiAgb3B0aW9ucy5wYXRoID0gcHJvY2Vzcy5lbnYuRE9URU5WX0NPTkZJR19QQVRIXG59XG5cbmlmIChwcm9jZXNzLmVudi5ET1RFTlZfQ09ORklHX0RFQlVHICE9IG51bGwpIHtcbiAgb3B0aW9ucy5kZWJ1ZyA9IHByb2Nlc3MuZW52LkRPVEVOVl9DT05GSUdfREVCVUdcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBvcHRpb25zXG4iLCIvKiBAZmxvdyAqL1xuLyo6OlxuXG50eXBlIERvdGVudlBhcnNlT3B0aW9ucyA9IHtcbiAgZGVidWc/OiBib29sZWFuXG59XG5cbi8vIGtleXMgYW5kIHZhbHVlcyBmcm9tIHNyY1xudHlwZSBEb3RlbnZQYXJzZU91dHB1dCA9IHsgW3N0cmluZ106IHN0cmluZyB9XG5cbnR5cGUgRG90ZW52Q29uZmlnT3B0aW9ucyA9IHtcbiAgcGF0aD86IHN0cmluZywgLy8gcGF0aCB0byAuZW52IGZpbGVcbiAgZW5jb2Rpbmc/OiBzdHJpbmcsIC8vIGVuY29kaW5nIG9mIC5lbnYgZmlsZVxuICBkZWJ1Zz86IHN0cmluZyAvLyB0dXJuIG9uIGxvZ2dpbmcgZm9yIGRlYnVnZ2luZyBwdXJwb3Nlc1xufVxuXG50eXBlIERvdGVudkNvbmZpZ091dHB1dCA9IHtcbiAgcGFyc2VkPzogRG90ZW52UGFyc2VPdXRwdXQsXG4gIGVycm9yPzogRXJyb3Jcbn1cblxuKi9cblxuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpXG5jb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpXG5cbmZ1bmN0aW9uIGxvZyAobWVzc2FnZSAvKjogc3RyaW5nICovKSB7XG4gIGNvbnNvbGUubG9nKGBbZG90ZW52XVtERUJVR10gJHttZXNzYWdlfWApXG59XG5cbmNvbnN0IE5FV0xJTkUgPSAnXFxuJ1xuY29uc3QgUkVfSU5JX0tFWV9WQUwgPSAvXlxccyooW1xcdy4tXSspXFxzKj1cXHMqKC4qKT9cXHMqJC9cbmNvbnN0IFJFX05FV0xJTkVTID0gL1xcXFxuL2dcblxuLy8gUGFyc2VzIHNyYyBpbnRvIGFuIE9iamVjdFxuZnVuY3Rpb24gcGFyc2UgKHNyYyAvKjogc3RyaW5nIHwgQnVmZmVyICovLCBvcHRpb25zIC8qOiA/RG90ZW52UGFyc2VPcHRpb25zICovKSAvKjogRG90ZW52UGFyc2VPdXRwdXQgKi8ge1xuICBjb25zdCBkZWJ1ZyA9IEJvb2xlYW4ob3B0aW9ucyAmJiBvcHRpb25zLmRlYnVnKVxuICBjb25zdCBvYmogPSB7fVxuXG4gIC8vIGNvbnZlcnQgQnVmZmVycyBiZWZvcmUgc3BsaXR0aW5nIGludG8gbGluZXMgYW5kIHByb2Nlc3NpbmdcbiAgc3JjLnRvU3RyaW5nKCkuc3BsaXQoTkVXTElORSkuZm9yRWFjaChmdW5jdGlvbiAobGluZSwgaWR4KSB7XG4gICAgLy8gbWF0Y2hpbmcgXCJLRVknIGFuZCAnVkFMJyBpbiAnS0VZPVZBTCdcbiAgICBjb25zdCBrZXlWYWx1ZUFyciA9IGxpbmUubWF0Y2goUkVfSU5JX0tFWV9WQUwpXG4gICAgLy8gbWF0Y2hlZD9cbiAgICBpZiAoa2V5VmFsdWVBcnIgIT0gbnVsbCkge1xuICAgICAgY29uc3Qga2V5ID0ga2V5VmFsdWVBcnJbMV1cbiAgICAgIC8vIGRlZmF1bHQgdW5kZWZpbmVkIG9yIG1pc3NpbmcgdmFsdWVzIHRvIGVtcHR5IHN0cmluZ1xuICAgICAgbGV0IHZhbCA9IChrZXlWYWx1ZUFyclsyXSB8fCAnJylcbiAgICAgIGNvbnN0IGVuZCA9IHZhbC5sZW5ndGggLSAxXG4gICAgICBjb25zdCBpc0RvdWJsZVF1b3RlZCA9IHZhbFswXSA9PT0gJ1wiJyAmJiB2YWxbZW5kXSA9PT0gJ1wiJ1xuICAgICAgY29uc3QgaXNTaW5nbGVRdW90ZWQgPSB2YWxbMF0gPT09IFwiJ1wiICYmIHZhbFtlbmRdID09PSBcIidcIlxuXG4gICAgICAvLyBpZiBzaW5nbGUgb3IgZG91YmxlIHF1b3RlZCwgcmVtb3ZlIHF1b3Rlc1xuICAgICAgaWYgKGlzU2luZ2xlUXVvdGVkIHx8IGlzRG91YmxlUXVvdGVkKSB7XG4gICAgICAgIHZhbCA9IHZhbC5zdWJzdHJpbmcoMSwgZW5kKVxuXG4gICAgICAgIC8vIGlmIGRvdWJsZSBxdW90ZWQsIGV4cGFuZCBuZXdsaW5lc1xuICAgICAgICBpZiAoaXNEb3VibGVRdW90ZWQpIHtcbiAgICAgICAgICB2YWwgPSB2YWwucmVwbGFjZShSRV9ORVdMSU5FUywgTkVXTElORSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcmVtb3ZlIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2VcbiAgICAgICAgdmFsID0gdmFsLnRyaW0oKVxuICAgICAgfVxuXG4gICAgICBvYmpba2V5XSA9IHZhbFxuICAgIH0gZWxzZSBpZiAoZGVidWcpIHtcbiAgICAgIGxvZyhgZGlkIG5vdCBtYXRjaCBrZXkgYW5kIHZhbHVlIHdoZW4gcGFyc2luZyBsaW5lICR7aWR4ICsgMX06ICR7bGluZX1gKVxuICAgIH1cbiAgfSlcblxuICByZXR1cm4gb2JqXG59XG5cbi8vIFBvcHVsYXRlcyBwcm9jZXNzLmVudiBmcm9tIC5lbnYgZmlsZVxuZnVuY3Rpb24gY29uZmlnIChvcHRpb25zIC8qOiA/RG90ZW52Q29uZmlnT3B0aW9ucyAqLykgLyo6IERvdGVudkNvbmZpZ091dHB1dCAqLyB7XG4gIGxldCBkb3RlbnZQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52JylcbiAgbGV0IGVuY29kaW5nIC8qOiBzdHJpbmcgKi8gPSAndXRmOCdcbiAgbGV0IGRlYnVnID0gZmFsc2VcblxuICBpZiAob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLnBhdGggIT0gbnVsbCkge1xuICAgICAgZG90ZW52UGF0aCA9IG9wdGlvbnMucGF0aFxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5lbmNvZGluZyAhPSBudWxsKSB7XG4gICAgICBlbmNvZGluZyA9IG9wdGlvbnMuZW5jb2RpbmdcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMuZGVidWcgIT0gbnVsbCkge1xuICAgICAgZGVidWcgPSB0cnVlXG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBzcGVjaWZ5aW5nIGFuIGVuY29kaW5nIHJldHVybnMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhIGJ1ZmZlclxuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlKGZzLnJlYWRGaWxlU3luYyhkb3RlbnZQYXRoLCB7IGVuY29kaW5nIH0pLCB7IGRlYnVnIH0pXG5cbiAgICBPYmplY3Qua2V5cyhwYXJzZWQpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgaWYgKCFwcm9jZXNzLmVudi5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHByb2Nlc3MuZW52W2tleV0gPSBwYXJzZWRba2V5XVxuICAgICAgfSBlbHNlIGlmIChkZWJ1Zykge1xuICAgICAgICBsb2coYFwiJHtrZXl9XCIgaXMgYWxyZWFkeSBkZWZpbmVkIGluIFxcYHByb2Nlc3MuZW52XFxgIGFuZCB3aWxsIG5vdCBiZSBvdmVyd3JpdHRlbmApXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB7IHBhcnNlZCB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4geyBlcnJvcjogZSB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMuY29uZmlnID0gY29uZmlnXG5tb2R1bGUuZXhwb3J0cy5wYXJzZSA9IHBhcnNlXG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBfX2F3YWl0ZXIgPSAodGhpcyAmJiB0aGlzLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xucmVxdWlyZShcImRvdGVudi9jb25maWdcIik7XG5jb25zdCBlbGVjdHJvbl8xID0gcmVxdWlyZShcImVsZWN0cm9uXCIpO1xuLy8gaW1wb3J0IGVsZWN0cm9uRGV2dG9vbHNJbnN0YWxsZXIsIHtcbi8vICAgICBSRUFDVF9ERVZFTE9QRVJfVE9PTFMsXG4vLyAgICAgQVBPTExPX0RFVkVMT1BFUl9UT09MU1xuLy8gfSBmcm9tIFwiZWxlY3Ryb24tZGV2dG9vbHMtaW5zdGFsbGVyXCJcbmxldCBtYWluV2luZG93O1xuY29uc3QgaXNEZXYgPSAoKSA9PiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJkZXZlbG9wbWVudFwiO1xuY29uc3QgaW5zdGFsbEV4dGVuc2lvbnMgPSAoKSA9PiB7XG4gICAgLy8gY29uc3QgZXh0ZW5zaW9ucyA9IHtcbiAgICAvLyAgICAgUkVBQ1RfREVWRUxPUEVSX1RPT0xTLFxuICAgIC8vICAgICBBUE9MTE9fREVWRUxPUEVSX1RPT0xTXG4gICAgLy8gfVxuICAgIC8vIE9iamVjdC5lbnRyaWVzKGV4dGVuc2lvbnMpLmZvckVhY2goYXN5bmMgZXh0ZW5zaW9uID0+IHtcbiAgICAvLyAgICAgY29uc3QgW25hbWUsIHJlZmVyZW5jZV0gPSBleHRlbnNpb25cbiAgICAvLyAgICAgdHJ5IHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKGBJbnN0YWxsaW5nICR7bmFtZX0uLi5gKVxuICAgIC8vICAgICAgICAgYXdhaXQgZWxlY3Ryb25EZXZ0b29sc0luc3RhbGxlcihyZWZlcmVuY2UpXG4gICAgLy8gICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKGBGYWlsZWQgdG8gaW5zdGFsbCAke25hbWV9OmApXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgIC8vICAgICB9XG4gICAgLy8gfSlcbn07XG5jb25zdCBjcmVhdGVXaW5kb3cgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBlbGVjdHJvbl8xLnNjcmVlbi5nZXRQcmltYXJ5RGlzcGxheSgpLndvcmtBcmVhU2l6ZTtcbiAgICBtYWluV2luZG93ID0gbmV3IGVsZWN0cm9uXzEuQnJvd3NlcldpbmRvdyh7XG4gICAgICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICB3ZWJTZWN1cml0eTogZmFsc2UsXG4gICAgICAgICAgICBub2RlSW50ZWdyYXRpb246IHRydWUsXG4gICAgICAgICAgICBjb250ZXh0SXNvbGF0aW9uOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBzaG93OiBmYWxzZVxuICAgIH0pO1xuICAgIC8vIFdhaXRpbmcgdW50aWwgZGV2dG9vbHMgaXMgb3BlbiB0byBzaG93IHRoZSB3aW5kb3dcbiAgICAvLyBhdm9pZHMgYW4gaXNzdWUgdGhhdCBjYXVzZXMgQXBvbGxvIGRldiB0b29scyBub3QgdG8gbG9hZFxuICAgIG1haW5XaW5kb3cud2ViQ29udGVudHMub24oXCJkZXZ0b29scy1vcGVuZWRcIiwgKCkgPT4ge1xuICAgICAgICBtYWluV2luZG93LnNob3coKTtcbiAgICB9KTtcbiAgICBtYWluV2luZG93Lm9uKFwiY2xvc2VkXCIsICgpID0+IHtcbiAgICAgICAgbWFpbldpbmRvdyA9IG51bGw7XG4gICAgfSk7XG4gICAgeWllbGQgbWFpbldpbmRvdy5sb2FkVVJMKGlzRGV2KCkgPyBgaHR0cDovL2xvY2FsaG9zdDo4MDgwL2AgOiBgZmlsZTovLyR7X19kaXJuYW1lfS9pbmRleC5odG1sYCk7XG4gICAgbWFpbldpbmRvdy53ZWJDb250ZW50cy5vcGVuRGV2VG9vbHMoKTtcbn0pO1xuZWxlY3Ryb25fMS5hcHAub24oXCJyZWFkeVwiLCAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgeWllbGQgaW5zdGFsbEV4dGVuc2lvbnMoKTtcbiAgICBjcmVhdGVXaW5kb3coKTtcbn0pKTtcbmVsZWN0cm9uXzEuYXBwLm9uKFwid2luZG93LWFsbC1jbG9zZWRcIiwgKCkgPT4ge1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcImRhcndpblwiKSB7XG4gICAgICAgIGVsZWN0cm9uXzEuYXBwLnF1aXQoKTtcbiAgICB9XG59KTtcbmVsZWN0cm9uXzEuYXBwLm9uKFwiYWN0aXZhdGVcIiwgKCkgPT4ge1xuICAgIGlmIChtYWluV2luZG93ID09PSBudWxsKSB7XG4gICAgICAgIGNyZWF0ZVdpbmRvdygpO1xuICAgIH1cbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKbWFXeGxJam9pYVc1a1pYZ3Vhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjeUk2V3lJdUxpOHVMaTl6Y21NdmJXRnBiaTlwYm1SbGVDNTBjeUpkTENKdVlXMWxjeUk2VzEwc0ltMWhjSEJwYm1keklqb2lPenM3T3pzN096czdPMEZCUVVFc2VVSkJRWE5DTzBGQlEzUkNMSFZEUVVGeFJEdEJRVU55UkN4elEwRkJjME03UVVGRGRFTXNOa0pCUVRaQ08wRkJRemRDTERaQ1FVRTJRanRCUVVNM1FpeDFRMEZCZFVNN1FVRkZka01zU1VGQlNTeFZRVUZuUXl4RFFVRkJPMEZCUlhCRExFMUJRVTBzUzBGQlN5eEhRVUZITEVkQlFVY3NSVUZCUlN4RFFVRkRMRTlCUVU4c1EwRkJReXhIUVVGSExFTkJRVU1zVVVGQlVTeExRVUZMTEdGQlFXRXNRMEZCUVR0QlFVVXhSQ3hOUVVGTkxHbENRVUZwUWl4SFFVRkhMRWRCUVVjc1JVRkJSVHRKUVVNelFpeDFRa0ZCZFVJN1NVRkRka0lzTmtKQlFUWkNPMGxCUXpkQ0xEWkNRVUUyUWp0SlFVTTNRaXhKUVVGSk8wbEJRMG9zTUVSQlFUQkVPMGxCUXpGRUxEQkRRVUV3UXp0SlFVTXhReXhaUVVGWk8wbEJRMW9zSzBOQlFTdERPMGxCUXk5RExIRkVRVUZ4UkR0SlFVTnlSQ3h2UWtGQmIwSTdTVUZEY0VJc2IwUkJRVzlFTzBsQlEzQkVMSGxDUVVGNVFqdEpRVU42UWl4UlFVRlJPMGxCUTFJc1MwRkJTenRCUVVOVUxFTkJRVU1zUTBGQlFUdEJRVVZFTEUxQlFVMHNXVUZCV1N4SFFVRkhMRWRCUVZNc1JVRkJSVHRKUVVNMVFpeE5RVUZOTEVWQlFVVXNTMEZCU3l4RlFVRkZMRTFCUVUwc1JVRkJSU3hIUVVGSExHbENRVUZOTEVOQlFVTXNhVUpCUVdsQ0xFVkJRVVVzUTBGQlF5eFpRVUZaTEVOQlFVRTdTVUZEYWtVc1ZVRkJWU3hIUVVGSExFbEJRVWtzZDBKQlFXRXNRMEZCUXp0UlFVTXpRaXhqUVVGakxFVkJRVVU3V1VGRFdpeFhRVUZYTEVWQlFVVXNTMEZCU3p0WlFVTnNRaXhsUVVGbExFVkJRVVVzU1VGQlNUdFpRVU55UWl4blFrRkJaMElzUlVGQlJTeExRVUZMTzFOQlF6RkNPMUZCUTBRc1MwRkJTenRSUVVOTUxFMUJRVTA3VVVGRFRpeEpRVUZKTEVWQlFVVXNTMEZCU3p0TFFVTmtMRU5CUVVNc1EwRkJRVHRKUVVOR0xHOUVRVUZ2UkR0SlFVTndSQ3d5UkVGQk1rUTdTVUZETTBRc1ZVRkJWU3hEUVVGRExGZEJRVmNzUTBGQlF5eEZRVUZGTEVOQlFVTXNhVUpCUVdsQ0xFVkJRVVVzUjBGQlJ5eEZRVUZGTzFGQlF6bERMRlZCUVZjc1EwRkJReXhKUVVGSkxFVkJRVVVzUTBGQlFUdEpRVU4wUWl4RFFVRkRMRU5CUVVNc1EwRkJRVHRKUVVOR0xGVkJRVlVzUTBGQlF5eEZRVUZGTEVOQlFVTXNVVUZCVVN4RlFVRkZMRWRCUVVjc1JVRkJSVHRSUVVONlFpeFZRVUZWTEVkQlFVY3NTVUZCU1N4RFFVRkJPMGxCUTNKQ0xFTkJRVU1zUTBGQlF5eERRVUZCTzBsQlEwWXNUVUZCVFN4VlFVRlZMRU5CUVVNc1QwRkJUeXhEUVVOd1FpeExRVUZMTEVWQlFVVXNRMEZCUXl4RFFVRkRMRU5CUVVNc2QwSkJRWGRDTEVOQlFVTXNRMEZCUXl4RFFVRkRMRlZCUVZVc1UwRkJVeXhoUVVGaExFTkJRM2hGTEVOQlFVRTdTVUZEUkN4VlFVRlZMRU5CUVVNc1YwRkJWeXhEUVVGRExGbEJRVmtzUlVGQlJTeERRVUZCTzBGQlEzcERMRU5CUVVNc1EwRkJRU3hEUVVGQk8wRkJSVVFzWTBGQlJ5eERRVUZETEVWQlFVVXNRMEZCUXl4UFFVRlBMRVZCUVVVc1IwRkJVeXhGUVVGRk8wbEJRM1pDTEUxQlFVMHNhVUpCUVdsQ0xFVkJRVVVzUTBGQlFUdEpRVU42UWl4WlFVRlpMRVZCUVVVc1EwRkJRVHRCUVVOc1FpeERRVUZETEVOQlFVRXNRMEZCUXl4RFFVRkJPMEZCUlVZc1kwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eHRRa0ZCYlVJc1JVRkJSU3hIUVVGSExFVkJRVVU3U1VGRE4wSXNTVUZCU1N4UFFVRlBMRU5CUVVNc1VVRkJVU3hMUVVGTExGRkJRVkVzUlVGQlJUdFJRVU12UWl4alFVRkhMRU5CUVVNc1NVRkJTU3hGUVVGRkxFTkJRVUU3UzBGRFlqdEJRVU5NTEVOQlFVTXNRMEZCUXl4RFFVRkJPMEZCUlVZc1kwRkJSeXhEUVVGRExFVkJRVVVzUTBGQlF5eFZRVUZWTEVWQlFVVXNSMEZCUnl4RlFVRkZPMGxCUTNCQ0xFbEJRVWtzVlVGQlZTeExRVUZMTEVsQlFVa3NSVUZCUlR0UlFVTnlRaXhaUVVGWkxFVkJRVVVzUTBGQlFUdExRVU5xUWp0QlFVTk1MRU5CUVVNc1EwRkJReXhEUVVGQkluMD0iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJlbGVjdHJvblwiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJwYXRoXCIpOyJdLCJzb3VyY2VSb290IjoiIn0=