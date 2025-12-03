
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
    const isServer = env.isServer === 'true';
    const label = isServer ? 'server' : 'client';

    console.info(`Bundling ${label} code...`);

    return {
        plugins: [
            new dotenv(),
        ],
        entry: {
            [label]: `./src/${label}/main.ts`,
        },
        target: isServer ? 'node' : 'web',
        optimization: {
            minimize: true,
            minimizer: [new TerserPlugin()],
        },
        externals: isServer ? {
            express: 'commonjs express',
            ws: 'commonjs ws',
        } : {},
        output: {
            path: path.resolve(__dirname, `dist${isServer ? '' : '/public'}`),
            filename: isServer ? 'server.cjs' : 'client.js',
        },
        resolve: {
            alias: {
                '~/shared_types': path.resolve(__dirname, 'src/shared_types'),
                '~/client_types': path.resolve(__dirname, 'src/client/client_types'),
                '~/server_types': path.resolve(__dirname, 'src/server/server_types'),
                '~/client_constants': path.resolve(__dirname, 'src/client/client_constants'),
                '~/server_constants': path.resolve(__dirname, 'src/server/server_constants'),
                '~': path.resolve(__dirname, 'src'),
            },
            extensions: ['.ts', '.js', '.json'],
        },
        devtool: 'source-map', // for development debugging
        mode: 'none',
        module: {
            rules: [{
                test: /\.ts$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            }],
        },
    };
};
