module.exports = {
    devtool: 'sourcemap',
    entry: {
        'undersea': __dirname + '/src/main.js'
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].js'
    }
};