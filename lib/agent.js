"use strict";

var http  = require("http"),
    faye  = require("faye"),
    cp = require("child_process"),
    formatio = require("formatio"),
    logger = require("evented-logger");


function createReporter(out, err) {

    return {
        log: out,
        info: out,
        debug: out,
        warn: err,
        error: err
    };
}

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
        this._logger.info("received command: " + formatio.ascii(request));
        switch (request.command) {
        case "Welcome":
            return {
                browsers: this._config.browsers
            };
        case "start":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    if (this._config.browsers[browser].prepareStart) {
                        this._logger.info("prepare start");
                        this._logger.debug(
                            this._config.browsers[browser].prepareStart
                        );
                        var preStartProc = cp.exec(
                            this._config.browsers[browser].prepareStart,
                            processLog.bind(this)
                        );
                    }

                    var args = this._config.browsers[browser].startArgs;
                    args = args ? args.slice(0) : [];
                    var id = request.browsers[browser].id;
                    if (request.url) {
                        var url = id
                            ? request.url + "?id=" + id : request.url;
                        args.push(url);
                    }

                    this._logger.info("start browser " + browser);
                    
                    var process = cp.spawn(
                        this._config.browsers[browser].start,
                        args
                    );
                    process.stdout.on('data', this._logger.debug);
                    process.stderr.on('data', this._logger.error);
                    process.on('close', browserClosedLog.bind(this, browser));
                    this._config.browsers[browser].process = process;
                }
            }
            break;
        case "stop":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    this._config.browsers[browser].process.kill();
                    delete this._config.browsers[browser].process;
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
