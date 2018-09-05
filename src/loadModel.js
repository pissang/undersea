import SwanGLTFLoader from './SwanGLTFLoader';
import {loader as clayLoader} from 'claygl';

const isSwan = typeof swan !== 'undefined' && swan.getFileSystemManager;

export default function loadModel(url, opts) {

    const Loader = isSwan ? SwanGLTFLoader : clayLoader.GLTF;

    return new Promise((resolve, reject) => {
        const loader = new Loader(Object.assign({}, opts));
        loader.success(resolve);
        loader.error(reject);
        loader.load(url);
    });
}