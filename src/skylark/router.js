define([
    "skylark/skylark",
    "skylark/langx",
    "skylark/browser",
    "skylark/datax",
    "skylark/eventer",
    "skylark/async"
], function(skylark, langx, browser, datax, eventer,async) {

    var _curCtx,
        _prevCtx,
        _baseUrl,
        _homePath,
        _routes = {},
        _cache = {},
        _hub = new langx.Evented();

    var Route = langx.Evented.inherit({
        klassName: "Route",
        init: function(name, setting) {
            setting = langx.mixin({}, setting);
            var pathto = setting.pathto || "",
                pattern = pathto,
                paramNames = pattern.match(/\:([a-zA-Z0-9_]+)/g);
            if (paramNames !== null) {
                paramNames = paramNames.map(function(paramName) {
                    return paramName.substring(1);
                });
                pattern = pattern.replace(/\:([a-zA-Z0-9_]+)/g, '(.*?)');
            } else {
                paramNames = [];
            }
            if (pattern === "*") {
                pattern = "(.*)";
            } else {
                pattern = pattern.replace("/", "\\/");
            }

            this._setting = setting;
            this.name = name;
            this.pathto = pathto;
            this.paramNames = paramNames;
            this.params = pattern;
            this.regex = new RegExp("^" + pattern + "$", "");

            var self = this;
            ["entering", "entered", "exiting", "exited"].forEach(function(eventName) {
                if (langx.isFunction(setting[eventName])) {
                    self.on(eventName, setting[eventName]);
                }
            });
        },

        enter: function(ctx,query) {
            if (query) {
                var r = this._entering(ctx);

                return async.Deferred.when(r).then(function(){
                    var e = eventer.create("entering", {
                        route: this,
                        result: true
                    });

                    eventer.trigger(this, e);

                    return e.result;
                });
            } else {
                this._entered(ctx);

                eventer.trigger(this, "entered", langx.safeMixin({
                    route: this
                }, ctx));
                return this;
            }
        },

        exit: function(ctx, query) {
            if (query) {
                var ok = this._exiting(ctx);
                if (!ok) {
                    return false;
                }

                var e = eventer.create("exiting", {
                    route: this,
                    result: true
                });

                eventer.trigger(this, e);

                return e.result;
            } else {
                this._exited(ctx);
                eventer.trigger(this, "exited", langx.safeMixin({
                    route: this
                }, ctx));

                return this;
            }
        },

        match: function(path) {
            var names = this.paramNames,
                x = path.indexOf('?'),
                path = ~x ? path.slice(0, x) : decodeURIComponent(path),
                m = this.regex.exec(path);

            if (!m) {
                return false
            };

            var params = {};
            for (var i = 1, len = m.length; i < len; ++i) {
                var name = names[i - 1],
                    val = decodeURIComponent(m[i]);
                params[name] = val;
            }

            return params;
        },

        path: function(params) {
            var path = this.pathto;
            if (params) {
                path = path.replace(/:([a-zA-Z0-9_]+)/g, function(match, paramName) {
                    return params[paramName];
                });
            }
            return path;
        },

        _entering: function(ctx) {
            return true;
        },
        _entered: function(ctx) {
            return true;
        },
        _exiting: function(ctx) {
            return true;
        },
        _exited: function(ctx) {
            return true;
        },
    });

    function current() {
        return _curCtx;
    }

    // refresh the current route
    function dispatch(ctx) {

        if (_prevCtx) {
            var ret = _prevCtx.route.exit({
                path: _prevCtx.path,
                params: _prevCtx.params
            }, true);
            if (!ret) {
                return;
            }
        }

        _prevCtx = _curCtx;
        _curCtx = ctx;
        if (!_curCtx.route) {
            var m = map(_curCtx.path);
            _curCtx.route = m.route;
            _curCtx.params = m.params;
        }

        var r = _curCtx.route.enter({
            path: _curCtx.path,
            params: _curCtx.params
        },true);

        async.Deferred.when(r).then(function() {
            eventer.trigger(_hub, "routing", {
                current: _curCtx,
                previous: _prevCtx
            });

            _curCtx.route.enter({
                path: _curCtx.path,
                params: _curCtx.params
            },false);

            if (_prevCtx) {
                _prevCtx.route.exit({
                    path: _prevCtx.path,
                    params: _prevCtx.params
                }, false);
            }

            eventer.trigger(_hub, "routed", {
                current: _curCtx,
                previous: _prevCtx
            });
        });
    }

    function go(path, force) {
        if (!force && _curCtx && _curCtx.path == path) {
            return false;
        }
        var ctx = map(path);
        if (ctx) {
            ctx.path = path;

            if (router.useHistoryApi) {
                var state = {
                    path: path
                }

                window.history.pushState(state, document.title, (_baseUrl + path).replace("//", "/"));
                eventer.trigger(window, eventer.create("popstate", {
                    state: state
                }));
            } else if (router.useHashbang) {
                var newHash = "#!" + path;
                if (window.location.hash !== newHash) {
                    window.location.hash = newHash;
                } else {
                    dispatch(ctx);
                };
            } else {
                dispatch(ctx);
            }
        }
        return true;
    }

    function map(path, noCache) {
        var finded = false;
        if (!noCache) {
            finded = _cache[path];
            if (finded) {
                return finded;
            }
        }
        langx.each(_routes, function(name, route) {
            var ret = route.match(path);
            if (ret) {
                finded = {
                    route: route,
                    params: ret
                }
                return false;
            }
            return true;
        });
        if (finded && !noCache) {
            _cache[path] = finded;
        }
        return finded;
    }

    function path(routeName, params) {
        var route = _routes[routeName],
            path;
        if (route) {
            path = route.path(params);
        }
        return path;
    }

    function previous() {
        return _prevCtx;
    }

    function baseUrl(path) {
        if (langx.isDefined(path)) {
            _baseUrl = path;
            return this;
        } else {
            return _baseUrl;
        }
    }

    function hub(){
        return _hub;
    }

    function homePath(path) {
        if (langx.isDefined(path)) {
            _homePath = path;
            return this;
        } else {
            return _homePath;
        }
    }

    function route(name, setting) {
        if (langx.isDefined(setting)) {
            var settings = {};
            settings[name] = setting;
            routes(settings);
            return this;
        } else {
            return _routes[name];
        }
    }

    function routes(settings) {
        if (!langx.isDefined(settings)) {
            return langx.mixin({}, _routes);
        } else {
            for (var name in settings) {
                _routes[name] = new router.Route(name, settings[name]);
            }
        }
    }

    //starts routing urls
    function start() {
        if (router.useHashbang == null && router.useHistoryApi == null) {
            if (window.location.host) {
                //web access
                router.useHistoryApi = true;
            } else {
                // local access
                router.useHashbang = true;
            }
        }

        var initPath;

        if (router.useHistoryApi) {
            initPath = window.location.pathname;
            if (_baseUrl === undefined) {
                _baseUrl = initPath.replace(/\/$/, "");
            }
            initPath = initPath.replace(_baseUrl, "") || _homePath || "/";
        } else if (router.useHashbang) {
            initPath = window.location.hash.replace("#!", "") || _homePath || "/";
        } else {
            initPath = "/";
        }

        eventer.on(document.body, "click", "a[href]", function(e) {
            var elm = e.currentTarget,
                url = datax.attr(elm, "href");

            if (url == "#") {
                return;
            }
            if (url && langx.isSameOrigin(elm.href)) {
                if (url.indexOf(_baseUrl) === 0) {
                    url = url.substr(_baseUrl.length);
                    eventer.stop(e);
                    url = url.replace('#!', '');
                    go(url);
                }
            }

        });
        if (router.useHistoryApi) {
            eventer.on(window, "popstate", function(e) {
                if(e.state) dispatch(e.state);
                eventer.stop(e);
            });
        } else if (router.useHashbang) {
            eventer.on(window, "hashchange", function(e) {
                dispatch({
                    path: window.location.hash.replace(/^#!/, "")
                });
                eventer.stop(e);
            });
        }

        go(initPath);
    }

    var router = function() {
        return router;
    };

    langx.mixin(router, {
        "Route": Route,

        // Current path being processed
        "current": current,

        // Changes the current path
        "go": go,

        "map": map,

        "hub": hub,

        "off": function() {
            _hub.off.apply(_hub, arguments);
        },

        "on": function() {
            _hub.on.apply(_hub, arguments);
        },

        "one": function() {
            _hub.one.apply(_hub, arguments);
        },

        // Returns the path of the named route
        "path": path,

        "previous": previous,

        "baseUrl": baseUrl,

        "homePath": homePath,

        "route": route,

        "routes": routes,

        //starts routing urls
        "start": start,

        "trigger": function(type, props) {
            eventer.trigger(_hub, type, props);
            return this;
        },

        "useHistoryApi": null,
        "useHashbang": null
    });

    return skylark.router = router;
});
