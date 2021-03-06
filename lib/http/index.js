var app, connect, eventMiddleware, fileUtils, fs, loadStaticDirs, pathlib, router, settings, staticDirs, staticFiles, transformURL, useAfterStack;

fs = require('fs');

pathlib = require('path');

connect = require('connect');

fileUtils = require('../utils/file');

router = new (require('./router').Router);

staticDirs = [];

staticFiles = [];

settings = {
  static: {
    maxAge: 30 * 1000
  }
};

app = connect();

app.prepend = app.use;

useAfterStack = [];

app.append = function() {
  var args;
  args = Array.prototype.slice.call(arguments);
  return useAfterStack.push(args);
};

module.exports = function(root) {
  return {
    connect: connect,
    middleware: app,
    router: router,
    set: function(newSettings) {
      var k, v, _results;
      if (typeof newSettings !== 'object') {
        throw new Error('ss.http.set() takes an object e.g. {static: {maxAge: 60000}}');
      }
      _results = [];
      for (k in newSettings) {
        v = newSettings[k];
        _results.push(settings[k] = v);
      }
      return _results;
    },
    load: function(staticPath, sessionStore, sessionOptions) {
      staticPath = pathlib.join(root, staticPath);
      loadStaticDirs(staticPath);
      app.use(connect.cookieParser('SocketStream')).use(connect.favicon(staticPath + '/favicon.ico')).use(connect.session({
        cookie: {
          path: '/',
          httpOnly: false,
          maxAge: sessionOptions.maxAge
        },
        store: sessionStore
      }));
      useAfterStack.forEach(function(m) {
        return app.use.apply(app, m);
      });
      app.use(eventMiddleware).use(connect.static(staticPath, settings.static));
      return app;
    },
    route: function(url, fn) {
      if (fn) {
        return router.on(url, fn);
      } else {
        return {
          serveClient: function(name) {
            var cb;
            cb = function(req, res) {
              return res.serveClient(name);
            };
            return router.on(url, cb);
          }
        };
      }
    }
  };
};

eventMiddleware = function(req, res, next) {
  var initialDir;
  initialDir = req.url.split('/')[1];
  if (initialDir === '_serveDev') req.url = transformURL(req.url);
  if (staticDirs.indexOf(initialDir) >= 0 || !router.route(req.url, req, res)) {
    return next();
  }
};

transformURL = function(url) {
  var i, x;
  i = 0;
  for (x = 0; x <= 1; x++) {
    i = url.indexOf('/', i + 1);
  }
  if (url[i] === '/') {
    url = url.replace('?', '&');
    url = url.substr(0, i) + '?' + url.substr(i + 1);
  }
  return url;
};

loadStaticDirs = function(path) {
  var pathLength;
  if (pathlib.existsSync(path)) {
    staticDirs = fs.readdirSync(path);
    if (!(staticDirs.indexOf('assets') >= 0)) staticDirs.push('assets');
    pathLength = path.length;
    staticFiles = fileUtils.readDirSync(path).files;
    return staticFiles = staticFiles.map(function(file) {
      return file.substr(pathLength);
    });
  }
};
