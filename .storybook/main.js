module.exports = {
    stories: [
        '../src/**/*.stories.mdx',
        '../src/**/*.stories.@(js|jsx|ts|tsx)',
    ],
    addons: [
        '@storybook/addon-links',
        {
            name: '@storybook/addon-essentials',
            options: { backgrounds: false, docs: false },
        },
        '@storybook/preset-create-react-app',
    ],
    framework: '@storybook/react',
    webpackFinal: config => {
        config.resolve.alias['twilio-video'] = require.resolve(
            '../src/stories/mocks/twilio-video.js'
        )
        // @react-spring (pulled in by @twilio/video-room-monitor) ships modern
        // syntax that Storybook's webpack 4 cannot parse. CRA's build transpiles
        // node_modules; do the same here.
        config.module.rules.push({
            test: /\.js$/,
            include: /node_modules[\\/]@react-spring/,
            use: {
                loader: require.resolve('babel-loader'),
                options: {
                    babelrc: false,
                    configFile: false,
                    presets: [
                        [
                            require.resolve('@babel/preset-env'),
                            { targets: 'defaults' },
                        ],
                    ],
                },
            },
        })
        return config
    },
}
