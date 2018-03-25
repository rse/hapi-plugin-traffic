
const HAPI        = require("hapi")
const HAPITraffic = require("./hapi-plugin-traffic")
const Request     = require("request-promise")

;(async () => {
    const server = HAPI.server({
        host:  "127.0.0.1",
        port:  12345,
        debug: { request: [ "error" ] }
    })

    await server.register(HAPITraffic)

    server.route({
        method:  "GET",
        path:    "/foo",
        handler: async (request, reply) => {
            return "OK"
        }
    })

    server.events.on("response", (request) => {
        let traffic = request.traffic()
        console.log(
            `recv=${traffic.recvPayload}/${traffic.recvRaw} ` +
            `sent=${traffic.sentPayload}/${traffic.sentRaw} ` +
            `start=${new Date(traffic.timeStart)} ` +
            `finish=${new Date(traffic.timeFinish)} ` +
            `duration=${traffic.timeDuration}ms`
        )
    })

    await server.start()

    let response = await server.inject({
        method:  "GET",
        url:     "/foo"
    })
    if (response.result === "OK")
        console.log("-- internal request: /foo: OK")
    else
        console.log("-- internal request: /foo: ERROR: invalid response: ", response.result)

    response = await Request({ uri: "http://127.0.0.1:12345/foo", json: true })
    if (response === "OK")
        console.log("-- external request: /foo: OK")
    else
        console.log("-- external request: /foo: ERROR: invalid response: ", response)

    await server.stop({ timeout: 1000 })
    process.exit(0)
})().catch((err) => {
    console.log("ERROR", err)
})

