"use strict";

var buster = require("buster"),

    proxyquire = require("proxyquire"),
    httpStub = {},
    childProcessStub = {},
    Agent = proxyquire("buster-ci-agent", {
        "http": httpStub,
        "child_process": childProcessStub
    }),

    assert = buster.assert,
    refute = buster.refute,
    match = buster.sinon.match;

buster.testCase("buster-ci-agent", {

    setUp: function () {
        this.server = httpStub.createServer();
        this.stub(this.server, "listen");
        // this.stub(server, "close") doesn't work, because stub will be removed
        // before the call of this.agent.close() in tearDown
        this.server.close = this.stub();
        this.stub(httpStub, "createServer").returns(this.server);

        this.stub(childProcessStub, "spawn");

        this.stub(console, "log");
    },

    tearDown: function () {
        this.agent.close();
    },

    "listens on specified port": function () {

        var config = {
            port: 8888
        };

        this.agent = new Agent(config);
        this.agent.listen();

        assert.calledWith(this.server.listen, 8888);
    },

    handleRequest: {

        "lists configured browsers at Welcome": function () {

            var config = {
                port: 8888,
                browsers: {
                    "Chrome": {},
                    "IE": {}
                }
            };

            this.agent = new Agent(config);
            var response = this.agent.handleRequest({ command: "Welcome" });

            assert.equals(response.browsers, config.browsers);
        },

        "starts specified browsers": {
            "with startArgs": function () {

                var config = {
                    port: 8888,
                    browsers: {
                        "Chrome": {
                            start: "chromium-browser",
                            startArgs: ["--new-window"]
                        },
                        "IE": {
                            start: "iexplore"
                        },
                        "FF": {
                            start: "firefox"
                        }
                    }
                };

                this.agent = new Agent(config);
                this.agent.handleRequest({
                    command: "start",
                    browsers: {
                        "Chrome": {},
                        "IE": {}
                    }
                });

                assert.calledWith(
                    childProcessStub.spawn,
                    config.browsers.Chrome.start,
                    match(config.browsers.Chrome.startArgs)
                );
                assert.calledWith(
                    childProcessStub.spawn,
                    config.browsers.IE.start
                );
                refute.calledWith(
                    childProcessStub.spawn,
                    config.browsers.FF.start
                );
            },

            "with capture url": function () {
                var config = {
                    port: 8888,
                    browsers: {
                        "Chrome": {
                            start: "chromium-browser",
                            startArgs: ["--new-window"]
                        }
                    }
                };
                var captureUrl = "http://host:port/capture";

                this.agent = new Agent(config);
                this.agent.handleRequest({
                    command: "start",
                    browsers: { "Chrome": {} },
                    url: captureUrl
                });

                assert.calledWith(
                    childProcessStub.spawn,
                    config.browsers.Chrome.start,
                    config.browsers.Chrome.startArgs.concat(captureUrl)
                );
            },

            "with specified ids": function () {

                var config = {
                    port: 8888,
                    browsers: {
                        "Chrome": {
                            start: "chromium-browser"
                        },
                        "IE": {
                            start: "iexplore"
                        }
                    }
                };
                var captureUrl = "http://host:port/capture";
                var idChrome = 123;
                var idIE = 456;

                this.agent = new Agent(config);
                this.agent.handleRequest({
                    command: "start",
                    browsers: {
                        "Chrome": {
                            id: idChrome
                        },
                        "IE": {
                            id: idIE
                        }
                    },
                    url: captureUrl
                });

                assert.calledWith(
                    childProcessStub.spawn,
                    config.browsers.Chrome.start,
                    [captureUrl + "?id=" + idChrome]
                );
                assert.calledWith(
                    childProcessStub.spawn,
                    config.browsers.IE.start,
                    [captureUrl + "?id=" + idIE]
                );
            }
        },

        "kills specified browsers": function () {

            var config = {
                port: 8888,
                browsers: {
                    "Chrome": {
                        start: "chromium-browser"
                    },
                    "IE": {
                        start: "iexplore"
                    }
                }
            };
            var processChrome = {
                kill: this.stub()
            };
            var processIE = {
                kill: this.stub()
            };
            childProcessStub.spawn.withArgs(config.browsers.Chrome.start)
                .returns(processChrome);
            childProcessStub.spawn.withArgs(config.browsers.IE.start)
                .returns(processIE);

            this.agent = new Agent(config);
            this.agent.handleRequest({
                command: "start",
                browsers: {
                    "Chrome": {},
                    "IE": {}
                }
            });
            this.agent.handleRequest({
                command: "stop",
                browsers: {
                    "Chrome": {},
                    "IE": {}
                }
            });

            assert.calledWithExactly(processChrome.kill);
            assert.calledWithExactly(processIE.kill);
        }
    }
});