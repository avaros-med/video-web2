const { createProxyMiddleware } = require('http-proxy-middleware')

const oscarBaseUrl = 'http://localhost:9001'

module.exports = function(app) {
    app.use(
        '/oscar',
        createProxyMiddleware({
            target: oscarBaseUrl,
            changeOrigin: true,
            onProxyReq(proxyReq) {
                // Fixes 403 forbidden issue
                if (proxyReq.getHeader('origin')) {
                    proxyReq.setHeader('origin', oscarBaseUrl)
                }
            },
        })
    )
}
