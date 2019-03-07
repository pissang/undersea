import Flocking from './Flocking';

let flocking;
onmessage = function (e) {
    const data = e.data;

    if (data.action === 'init') {
        flocking = new Flocking({
            count: data.count,
            box: data.box
        });

        postMessage({
            type: 'inited'
        });
    }
    else if (data.action === 'update') {
        flocking.update(data.deltaTime, data.avoid);

        const dataArr = flocking.getData();

        postMessage({
            type: 'updated',
            data: dataArr
        }, [dataArr.buffer]);
    }
};