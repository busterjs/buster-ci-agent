# buster-ci-agent


[![Build status](https://secure.travis-ci.org/busterjs/buster-ci-agent.png?branch=master)](http://travis-ci.org/busterjs/buster-ci-agent)
[![Build status](https://ci.appveyor.com/api/projects/status/github/busterjs/buster-ci-agent?branch=master&svg=true)](https://ci.appveyor.com/project/dominykas/buster-ci-agent)

Used to start, capture and stop browsers for [buster-ci](http://docs.busterjs.org/en/latest/modules/buster-ci/),
locally and remote.


## Changelog

**0.2.0** (2016-Jan-05)

* Potentially breaking dependency updates (includes `ffi@2.x` with latest `node-gyp`)
* BREAKING: added an engine requirement (node LTS) in package.json

**0.1.6** (2015-Jul-21)

* [Version of ref updated to 1.0](https://github.com/busterjs/buster-ci-agent/pull/3)

**0.1.5** (2015-Jul-13)

* [Version of node-ffi updated to 1.3 for node.js 0.12 compatibility](https://github.com/busterjs/buster-ci-agent/pull/2)

**0.1.4** (2015-Mar-13)

* [Call callback of close even if server.close throws error](https://github.com/busterjs/buster-ci-agent/commit/7c0e69b)

**0.1.3** (2015-Mar-04)

* Close all browsers on exit, part of issue [#447](https://github.com/busterjs/buster/issues/447)

**0.1.2** (2015-Jan-30)

* [Log the child process stdout and stderr properly](https://github.com/busterjs/buster-ci-agent/pull/1)

**0.1.1** (2014-Oct-21)

* browser can now be killed via configured command
* browser can now be closed via native window api (only on Windows yet)
