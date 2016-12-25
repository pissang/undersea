var PROD = process.argv.indexOf('-p') >= 0;
var webpack = require('webpack');

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            'typeof __DEV__': JSON.stringify('boolean'),
            __DEV__: PROD ? false : true
        })
    ],
    entry: {
        'undersea': __dirname + '/src/main.js'
    },
    output: {
        path: __dirname + '/dist',
        filename: PROD ? '[name].min.js' : '[name].js'
    }
};