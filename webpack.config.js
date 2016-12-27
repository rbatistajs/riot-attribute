const webpack = require('webpack')

module.exports = {
    entry: './src/riot-attribute.js',
    output: {
        path: '/dist',
        filename: 'riot-attribute.js',
        publicPath: '/public/'
    },
    plugins: [],
    module: {
        loaders: [
            { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
        ]
    }
}
