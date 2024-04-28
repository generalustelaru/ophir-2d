
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: {
        'my-lib': './src/main.js',
        'my-lib.min': './src/main.js',
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'bundle.js',
        libraryTarget: 'umd',
        library: 'MyLib',
        umdNamedDefine: true,
    },
    resolve: {
        extensions: ['ts', '.js', '.json'],
    },
    devtool: 'source-map',
    mode: 'development',
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }
        }]
    },
};