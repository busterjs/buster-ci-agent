"use strict";

var http  = require("http"),
    faye  = require("faye"),
    cp = require("child_process"),
    formatio = require("formatio"),
    logger = require("evented-logger"),
    closeWindows = require("./close-windows");


function processLog(error, stdout, stderr) {
    /*jshint validthis: true */
    if (stdout) {
        this._logger.debug(stdout);
    }
    if (stderr) {
        this._logger.error(stderr);
    }
    if (error) {
        this._logger.error(error);
    }
}

function browserClosedLog(browser) {
    /*jshint validthis: true */
    this._logger.info("browser " + browser + " closed");
}

function startBrowser(browserName, browser, url, id) {
    /*jshint validthis: true */
    if (browser.prepareStart) {
        this._logger.info("prepare start");
        var prepareStartCommand = browser.prepareStart;
        this._logger.debug(prepareStartCommand);
        cp.exec(
            prepareStartCommand,
            processLog.bind(this)
        );
    }

    var startCommand = browser.start;
    var startArgs = browser.startArgs;
    startArgs = startArgs ? startArgs.slice(0) : [];
    if (url) {
        url = id ? url + "?id=" + id : url;
        startArgs.push(url);
    }

    this._logger.info("start browser " + browserName);
    
    var process = cp.spawn(startCommand, startArgs);
    process.stdout.on('data', this._logger.debug);
    process.stderr.on('data', this._logger.error);
    process.on('close', browserClosedLog.bind(this, browserName));
    browser.process = process;
}

function stopBrowser(browserName, browser) {
    /*jshint validthis: true */
    if (browser.stop) {
        if (browser.stop.command) {
            this._logger.info("stop browser " + browserName + " by command");
            var command = browser.stop.command.replace(/\$\{PID\}/g,
                browser.process.pid
            );
            this._logger.debug(command);
            cp.exec(command, processLog.bind(this));
        }
        if (browser.stop.windowTitle) {
            this._logger.info("stop browser " + browserName
                + " by closing window");
            try {
                closeWindows(browser.stop.windowTitle);
            } catch (err) {
                this._logger.error(err.message);
            }
        }
    } else {
        this._logger.info("stop browser " + browserName);
        browser.process.kill();
    }
    delete browser.process;
}


function Agent(config) {
    this._config = config;
    this._server = http.createServer();
    this._bayeux = new faye.NodeAdapter({mount: "/"});
    this._client = this._bayeux.getClient();
    var levels = ["error", "warn", "log", "info", "debug"];
    this._logger = logger.create({ levels: levels });
    var localReporter = {
        log: process.stdout,
        info: process.stdout,
        debug: process.stdout,
        warn: process.stderr,
        error: process.stderr
    };
    this._logger.on("log", function (msg) {
        localReporter[msg.level].write(msg.message + "\n");
        this._client.publish("/messages", msg);
    }.bind(this));
    this._logger.level = this._config.logLevel !== undefined
        ? this._config.logLevel
        : "info";

    this._bayeux.attach(this._server);
}

Agent.prototype = {

    listen: function (cb) {
        this._server.listen(this._config.port);
        if (typeof cb === "function") {
            this._server.on("listening", cb);
        }

        this._client.subscribe("/messages", function (request) {
            if (!request.command) {
                return;
            }
            var response = this.handleRequest(request);
            if (response) {
                this._client.publish("/messages", response);
            }
        }.bind(this));

        this._logger.info("Agent Running, waiting for commands on port " +
            this._config.port);
    },

    handleRequest: function (request) {

        var browser;
        this._logger.debug("received command: " + formatio.ascii(request));
        switch (request.command) {
        case "Welcome":
            return {
                browsers: this._config.browsers
            };
        case "start":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    startBrowser.call(this,
                        browser,
                        this._config.browsers[browser],
                        request.url,
                        request.browsers[browser].id
                    );
                }
            }
            break;
        case "stop":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    stopBrowser.call(this,
                        browser, this._config.browsers[browser]);
                }
            }
            break;

        default:
            break;
        }
    },

    close: function (cb) {
        if (this._bayeux) {
            this._bayeux.close();
        }
        if (this._server) {
            this._server.close(cb);
        }
    }
};

module.exports = Agent;
