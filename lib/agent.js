"use strict";

var http  = require("http"),
    faye  = require("faye"),
    cp = require("child_process"),
    formatio = require("formatio");


function Agent(config) {
    this._config = config;
}

Agent.prototype = {

    listen: function (cb) {
        this._server = http.createServer();
        this._bayeux = new faye.NodeAdapter({mount: "/"});
        var client = this._bayeux.getClient();

        this._bayeux.attach(this._server);
        this._server.listen(this._config.port);
        if (typeof cb === "function") {
            this._server.on("listening", cb);
        }

        client.subscribe("/messages", function (request) {
            if (!request.command) {
                return;
            }
            var response = this.handleRequest(request);
            if (response) {
                client.publish("/messages", response);
            }
        }.bind(this));

        console.log("Agent Running, waiting for commands on port " +
            this._config.port);
    },

    handleRequest: function (request) {

        var browser;
        console.log("received command: " + formatio.ascii(request));
        switch (request.command) {
        case "Welcome":
            return {
                browsers: this._config.browsers
            };
        case "start":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    var args = this._config.browsers[browser].startArgs;
                    args = args ? args.slice(0) : [];
                    var id = request.browsers[browser].id;
                    if (request.url) {
                        var url = id
                            ? request.url + "?id=" + id : request.url;
                        args.push(url);
                    }

                    this._config.browsers[browser].process = cp.spawn(
                        this._config.browsers[browser].start,
                        args
                    );
                }
            }
            break;
        case "stop":
            for (browser in request.browsers) {
                if (request.browsers.hasOwnProperty(browser)) {
                    this._config.browsers[browser].process.kill();
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
