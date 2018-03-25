
hapi-plugin-traffic
===================

[HAPI](http://hapijs.com/) plugin for network traffic accounting.

<p/>
<img src="https://nodei.co/npm/hapi-plugin-traffic.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/hapi-plugin-traffic.png" alt=""/>

Installation
------------

```shell
$ npm install hapi hapi-plugin-traffic
```

About
-----

This is a small plugin for the [HAPI](http://hapijs.com/) server
framework for accounting the network traffic per request (received/sent
payload/raw data plus the start/finish time and duration).

ATTENTION: The information about the network traffic is not 100%
precise, as this plugin has has to partially estimate the numbers
`recvRaw` (because HAPI comes too late and hence the HTTP headers have
to be re-constructed) and `sentPayload` (because in case of Boom error
responses the JSON serialization has to be pre-constructed). Hence, the
information is precise enough for the usual logging purposes, but do not
use at least the partially estimated numbers `recvRaw` and `sentPayload`
for realistic accounting purposes.

Usage
-----

```js
server.register(require("hapi-plugin-traffic"))
[...]
server.on("tail", (request) => {
    let traffic = request.traffic()
    console.log(
        `recv=${traffic.recvPayload}/${traffic.recvRaw} ` +
        `sent=${traffic.sentPayload}/${traffic.sentRaw} ` +
        `start=${new Date(traffic.timeStart)} ` +
        `finish=${new Date(traffic.timeFinish)} ` +
        `duration=${traffic.timeDuration}ms`
    )
})
```

License
-------

Copyright (c) 2016-2018 Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

