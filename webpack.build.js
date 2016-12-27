const webpack = require('webpack')
const webpackConfig = require('./webpack.config')

webpackConfig.output.path = __dirname+"/dist"
webpackConfig.output.filename = "riot-attribute.min.js"
delete webpackConfig.output.publicPath

webpackConfig.plugins.push(new webpack.optimize.UglifyJsPlugin())

module.exports = webpackConfig
