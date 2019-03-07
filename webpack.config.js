module.exports = {
    devtool: 'sourcemap',
    entry: {
        'undersea': __dirname + '/src/main.js',
        'worker': __dirname + '/src/worker.js'
    },
    output: {
        path: __dirname + '/dist',
        filename: '[name].js'
    }
};