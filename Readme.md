# buster-ci-agent


[![Build status](https://secure.travis-ci.org/busterjs/buster-ci-agent.png?branch=master)](http://travis-ci.org/busterjs/buster-ci-agent)

Used to start, capture and stop browsers for [buster-ci](http://docs.busterjs.org/en/latest/modules/buster-ci/),
locally and remote.


## Changelog

**0.1.3** (04.03.2015)

* Close all browsers on exit, part of issue [#447](https://github.com/busterjs/buster/issues/447)

**0.1.2** (30.01.2015)

* [Log the child process stdout and stderr properly](https://github.com/busterjs/buster-ci-agent/pull/1)

**0.1.1** (21.10.2014)

* browser can now be killed via configured command
* browser can now be closed via native window api (only on Windows yet)
