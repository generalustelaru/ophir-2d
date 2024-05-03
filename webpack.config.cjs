
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: {
        'client': './src/client/main.ts',
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'client.js',
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    // devtool: 'eval-source-map', // for development debugging
    mode: 'none',
    module: {
        rules: [{
            test: /\.ts$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
        }]
    },
};

// TODO: How do I split configuration between client and server?