(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GIF = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){

/* CoffeeScript version of the browser detection from MooTools */
var UA, browser, mode, platform, ua;

ua = navigator.userAgent.toLowerCase();

platform = navigator.platform.toLowerCase();

UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0];

mode = UA[1] === 'ie' && document.documentMode;

browser = {
  name: UA[1] === 'version' ? UA[3] : UA[1],
  version: mode || parseFloat(UA[1] === 'opera' && UA[4] ? UA[4] : UA[2]),
  platform: {
    name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
  }
};

browser[browser.name] = true;

browser[browser.name + parseInt(browser.version, 10)] = true;

browser.platform[browser.platform.name] = true;

module.exports = browser;


},{}],3:[function(require,module,exports){
var EventEmitter, GIF, browser,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  slice = [].slice;

EventEmitter = require('events').EventEmitter;

browser = require('./browser.coffee');

GIF = (function(superClass) {
  var defaults, frameDefaults;

  extend(GIF, superClass);

  defaults = {
    workerScript: 'gif.worker.js',
    workers: 2,
    repeat: 0,
    background: '#fff',
    quality: 10,
    width: null,
    height: null,
    transparent: null,
    debug: false,
    dither: false
  };

  frameDefaults = {
    delay: 500,
    copy: false,
    dispose: -1
  };

  function GIF(options) {
    var base, key, value;
    this.running = false;
    this.options = {};
    this.frames = [];
    this.freeWorkers = [];
    this.activeWorkers = [];
    this.setOptions(options);
    for (key in defaults) {
      value = defaults[key];
      if ((base = this.options)[key] == null) {
        base[key] = value;
      }
    }
  }

  GIF.prototype.setOption = function(key, value) {
    this.options[key] = value;
    if ((this._canvas != null) && (key === 'width' || key === 'height')) {
      return this._canvas[key] = value;
    }
  };

  GIF.prototype.setOptions = function(options) {
    var key, results, value;
    results = [];
    for (key in options) {
      if (!hasProp.call(options, key)) continue;
      value = options[key];
      results.push(this.setOption(key, value));
    }
    return results;
  };

  GIF.prototype.addFrame = function(image, options) {
    var frame, key;
    if (options == null) {
      options = {};
    }
    frame = {};
    frame.transparent = this.options.transparent;
    for (key in frameDefaults) {
      frame[key] = options[key] || frameDefaults[key];
    }
    if (this.options.width == null) {
      this.setOption('width', image.width);
    }
    if (this.options.height == null) {
      this.setOption('height', image.height);
    }
    if ((typeof ImageData !== "undefined" && ImageData !== null) && image instanceof ImageData) {
      frame.data = image.data;
    } else if (((typeof CanvasRenderingContext2D !== "undefined" && CanvasRenderingContext2D !== null) && image instanceof CanvasRenderingContext2D) || ((typeof WebGLRenderingContext !== "undefined" && WebGLRenderingContext !== null) && image instanceof WebGLRenderingContext)) {
      if (options.copy) {
        frame.data = this.getContextData(image);
      } else {
        frame.context = image;
      }
    } else if (image.childNodes != null) {
      if (options.copy) {
        frame.data = this.getImageData(image);
      } else {
        frame.image = image;
      }
    } else {
      throw new Error('Invalid image');
    }
    return this.frames.push(frame);
  };

  GIF.prototype.render = function() {
    var i, j, numWorkers, ref;
    if (this.running) {
      throw new Error('Already running');
    }
    if ((this.options.width == null) || (this.options.height == null)) {
      throw new Error('Width and height must be set prior to rendering');
    }
    this.running = true;
    this.nextFrame = 0;
    this.finishedFrames = 0;
    this.imageParts = (function() {
      var j, ref, results;
      results = [];
      for (i = j = 0, ref = this.frames.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        results.push(null);
      }
      return results;
    }).call(this);
    numWorkers = this.spawnWorkers();
    if (this.options.globalPalette === true) {
      this.renderNextFrame();
    } else {
      for (i = j = 0, ref = numWorkers; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        this.renderNextFrame();
      }
    }
    this.emit('start');
    return this.emit('progress', 0);
  };

  GIF.prototype.abort = function() {
    var worker;
    while (true) {
      worker = this.activeWorkers.shift();
      if (worker == null) {
        break;
      }
      this.log('killing active worker');
      worker.terminate();
    }
    this.running = false;
    return this.emit('abort');
  };

  GIF.prototype.spawnWorkers = function() {
    var j, numWorkers, ref, results;
    numWorkers = Math.min(this.options.workers, this.frames.length);
    (function() {
      results = [];
      for (var j = ref = this.freeWorkers.length; ref <= numWorkers ? j < numWorkers : j > numWorkers; ref <= numWorkers ? j++ : j--){ results.push(j); }
      return results;
    }).apply(this).forEach((function(_this) {
      return function(i) {
        var worker;
        _this.log("spawning worker " + i);
        worker = new Worker(_this.options.workerScript);
        worker.onmessage = function(event) {
          _this.activeWorkers.splice(_this.activeWorkers.indexOf(worker), 1);
          _this.freeWorkers.push(worker);
          return _this.frameFinished(event.data);
        };
        return _this.freeWorkers.push(worker);
      };
    })(this));
    return numWorkers;
  };

  GIF.prototype.frameFinished = function(frame) {
    var i, j, ref;
    this.log("frame " + frame.index + " finished - " + this.activeWorkers.length + " active");
    this.finishedFrames++;
    this.emit('progress', this.finishedFrames / this.frames.length);
    this.imageParts[frame.index] = frame;
    if (this.options.globalPalette === true) {
      this.options.globalPalette = frame.globalPalette;
      this.log('global palette analyzed');
      if (this.frames.length > 2) {
        for (i = j = 1, ref = this.freeWorkers.length; 1 <= ref ? j < ref : j > ref; i = 1 <= ref ? ++j : --j) {
          this.renderNextFrame();
        }
      }
    }
    if (indexOf.call(this.imageParts, null) >= 0) {
      return this.renderNextFrame();
    } else {
      return this.finishRendering();
    }
  };

  GIF.prototype.finishRendering = function() {
    var data, frame, i, image, j, k, l, len, len1, len2, len3, offset, page, ref, ref1, ref2;
    len = 0;
    ref = this.imageParts;
    for (j = 0, len1 = ref.length; j < len1; j++) {
      frame = ref[j];
      len += (frame.data.length - 1) * frame.pageSize + frame.cursor;
    }
    len += frame.pageSize - frame.cursor;
    this.log("rendering finished - filesize " + (Math.round(len / 1000)) + "kb");
    data = new Uint8Array(len);
    offset = 0;
    ref1 = this.imageParts;
    for (k = 0, len2 = ref1.length; k < len2; k++) {
      frame = ref1[k];
      ref2 = frame.data;
      for (i = l = 0, len3 = ref2.length; l < len3; i = ++l) {
        page = ref2[i];
        data.set(page, offset);
        if (i === frame.data.length - 1) {
          offset += frame.cursor;
        } else {
          offset += frame.pageSize;
        }
      }
    }
    image = new Blob([data], {
      type: 'image/gif'
    });
    return this.emit('finished', image, data);
  };

  GIF.prototype.renderNextFrame = function() {
    var frame, task, worker;
    if (this.freeWorkers.length === 0) {
      throw new Error('No free workers');
    }
    if (this.nextFrame >= this.frames.length) {
      return;
    }
    frame = this.frames[this.nextFrame++];
    worker = this.freeWorkers.shift();
    task = this.getTask(frame);
    this.log("starting frame " + (task.index + 1) + " of " + this.frames.length);
    this.activeWorkers.push(worker);
    return worker.postMessage(task);
  };

  GIF.prototype.getContextData = function(ctx) {
    return ctx.getImageData(0, 0, this.options.width, this.options.height).data;
  };

  GIF.prototype.getImageData = function(image) {
    var ctx;
    if (this._canvas == null) {
      this._canvas = document.createElement('canvas');
      this._canvas.width = this.options.width;
      this._canvas.height = this.options.height;
    }
    ctx = this._canvas.getContext('2d');
    ctx.fillStyle = this.options.background;
    ctx.fillRect(0, 0, this.options.width, this.options.height);
    ctx.drawImage(image, 0, 0);
    return this.getContextData(ctx);
  };

  GIF.prototype.getTask = function(frame) {
    var index, task;
    index = this.frames.indexOf(frame);
    task = {
      index: index,
      last: index === (this.frames.length - 1),
      delay: frame.delay,
      dispose: frame.dispose,
      transparent: frame.transparent,
      width: this.options.width,
      height: this.options.height,
      quality: this.options.quality,
      dither: this.options.dither,
      globalPalette: this.options.globalPalette,
      repeat: this.options.repeat,
      canTransfer: browser.name === 'chrome'
    };
    if (frame.data != null) {
      task.data = frame.data;
    } else if (frame.context != null) {
      task.data = this.getContextData(frame.context);
    } else if (frame.image != null) {
      task.data = this.getImageData(frame.image);
    } else {
      throw new Error('Invalid frame');
    }
    return task;
  };

  GIF.prototype.log = function() {
    var args;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (!this.options.debug) {
      return;
    }
    return console.log.apply(console, args);
  };

  return GIF;

})(EventEmitter);

module.exports = GIF;


},{"./browser.coffee":2,"events":1}]},{},[3])(3)
});
