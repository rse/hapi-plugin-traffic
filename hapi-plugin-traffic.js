/*
**  hapi-plugin-traffic -- HAPI plugin for network traffic accounting
**  Copyright (c) 2016-2023 Dr. Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*  internal dependencies  */
const pkg = require("./package.json")

/*  the HAPI plugin register function  */
const register = async (server, options, next) => {
    /*  helper function for accounting the traffic on a socket  */
    const traffic = {}
    const trafficOnSocket = (id, socket, field) => {
        if (socket === null)
            return 0
        let fd = "unknown"
        if (typeof socket._handle === "object" && socket._handle !== null && socket._handle.fd >= 0)
            fd = socket._handle.fd  /*  ATTENTION: internal inspection!  */
        const idL = `${id}:${fd}`
        const idR = `${socket.remoteFamily}:${socket.remoteAddress}:${socket.remotePort}`
        if (   traffic[idL] === undefined
            || (typeof traffic[idL] === "object" && traffic[idL].idR !== idR)) {
            traffic[idL] = { idR, bytes: 0 }
        }
        const bytes = (socket[field] || 0) - traffic[idL].bytes
        traffic[idL].bytes = (socket[field] || 0)
        return bytes
    }

    /*  decorate the request object  */
    server.decorate("request", "traffic", (request) => {
        /*  ATTENTION: duck punching the API to get the raw sent traffic at the right time  */
        request.raw.res.end = ((end) => {
            return function () {
                request.plugins.traffic.sentRaw = trafficOnSocket("res", request.raw.res.socket, "bytesWritten")
                return end.apply(request.raw.res, arguments)
            }
        })(request.raw.res.end)

        /*  provide the accounted traffic  */
        return () => {
            return request.plugins.traffic
        }
    }, { apply: true })

    /*  hook into the start of request processing  */
    server.ext("onRequest", async (request, h) => {
        /*  initialize traffic information  */
        const now = new Date()
        request.plugins.traffic = {
            timeStart:    now,
            timeFinish:   now,
            timeDuration: 0,
            recvPayload:  0,
            recvRaw:      0,
            sentPayload:  0,
            sentRaw:      0
        }

        /*  ATTENTION: count the raw received traffic the cruel way, because
            request.raw.req.socket.bytesRead is always 0 (HAPI comes too late,
            the data is already read from the socket and hence has to be estimated)  */
        const req = request.raw.req
        request.plugins.traffic.recvRaw +=
            `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`.length
        if (request.raw.req.rawHeaders instanceof Array)
            for (let i = 0; i < request.raw.req.rawHeaders.length; i += 2)
                request.plugins.traffic.recvRaw +=
                    `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`.length
        request.plugins.traffic.recvRaw += "\r\n".length

        /*  count the raw and payload received traffic  */
        request.events.on("peek", (chunk) => {
            request.plugins.traffic.recvRaw     += chunk.length
            request.plugins.traffic.recvPayload += chunk.length
        })

        return h.continue
    })

    /*  hook into the middle of processing  */
    server.ext("onPreResponse", async (request, h) => {
        /*  count the payload sent traffic  */
        if (request.response.isBoom) {
            /*  special case: Boom error object
                (we can only estimate the serialization)  */
            const json = JSON.stringify(request.response.output.payload)
            request.plugins.traffic.sentPayload += json.length
        }
        else {
            /*  regular case: the standard HAPI response object  */
            request.response.events.on("peek", (chunk) => {
                request.plugins.traffic.sentPayload += chunk.length
            })
        }
        return h.continue
    })

    /*  hook into the processing where lately, when the response was sent  */
    server.events.on("response", async (request) => {
        request.plugins.traffic.timeFinish = new Date()
        request.plugins.traffic.timeDuration =
            request.plugins.traffic.timeFinish.getTime() -
            request.plugins.traffic.timeStart.getTime()
    })
}

/*  export register function, wrapped in a plugin object  */
module.exports = {
    plugin: {
        register,
        pkg
    }
}

