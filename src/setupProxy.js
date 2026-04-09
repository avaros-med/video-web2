const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function(app) {
    app.use(
        '/oscar',
        createProxyMiddleware({
            target: 'http://localhost:8080',
            changeOrigin: true,
            onProxyReq(proxyReq) {
                // Fixes 403 forbidden issue
                if (proxyReq.getHeader('origin')) {
                    proxyReq.setHeader('origin', 'http://localhost:8080')
                }
            },
        })
    )

    app.use(
        '/av/api/schedule-mysql',
        createProxyMiddleware({
            target: 'http://localhost:8810',
            changeOrigin: true,
        })
    )
}
