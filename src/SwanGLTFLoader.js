import {loader} from 'claygl';

const fs = typeof swan !== 'undefined'
    && swan.getFileSystemManager
    && swan.getFileSystemManager();

export default loader.GLTF.extend({
    load(path) {
        const self = this;

        const isBinary = path.endsWith('.glb');

        if (this.rootPath == null) {
            this.rootPath = path.slice(0, path.lastIndexOf('/'));
        }

        fs.readFile({
            filePath: path,
            encoding: isBinary ? null : 'utf-8',
            success(res) {
                let data = res.data;
                if (isBinary) {
                    self.parseBinary(data);
                }
                else {
                    try {
                        data = JSON.parse(data);
                        self.parse(data);
                    }
                    catch (e) {
                        throw new Error('glTF Parse Error:', e);
                    }
                }
            },
            fail(res) {
                console.error(res);
                console.error(path);
            }
        });
    },

    loadBuffer(path, onsuccess, onerror) {
        fs.readFile({
            filePath: path,
            success(res) {
                onsuccess(res.data);
            },
            fail(res) {
                console.error(res);
                console.error(path);
                onerror();
            }
        });
    }
});