const { createProxyMiddleware } = require('http-proxy-middleware')

// Local development only. The EMR is on the page's own origin, as on test and in
// production: the provider's page downloads a chart document from the EMR's print path
// (/oscar/...) with the provider's EMR session. ehr is called directly
// (http://localhost:3000; src/services/http/ehr.ts), not through this proxy.
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
}
