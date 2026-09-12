const webpack = require('webpack');
const process = require('process');

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "zlib": require.resolve("browserify-zlib"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process/browser"),
        "assert": require.resolve("assert"),
        "util": require.resolve("util"),
        "url": require.resolve("url"),
        "path": require.resolve("path-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "constants": require.resolve("constants-browserify"),
    });
    config.resolve.fallback = fallback;

    // Add explicit alias for process/browser
    config.resolve.alias = {
        ...config.resolve.alias,
        'process/browser': require.resolve('process/browser'),
    };

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        })
    ]);

    // Suppress source map warnings from dependencies
    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
};
