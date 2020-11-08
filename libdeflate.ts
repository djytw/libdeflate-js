
export class LibDeflate {
    public static native: any;
    static initialize() {
        WebAssembly.instantiateStreaming(fetch('libdeflate.wasm'), {}).then(obj => {
            LibDeflate.native = obj.instance.exports;
        });
    }

    public static adler32(buffer: Uint8Array, init?: number) : number {
        let init_value = init;
        if (init === undefined) {
            init_value = 1;
        }
        if (buffer.constructor != Uint8Array || typeof init_value !== 'number') {
            throw 'Invalid parameters. ';
        }
        let addr = this.alloc(buffer);
        let result = this.native.libdeflate_adler32(init_value, addr, buffer.byteLength);
        this.free(addr);
        return result;
    }

    public static crc32(buffer: Uint8Array, init?: number) : number {
        let init_value = init;
        if (init === undefined) {
            init_value = 1;
        }
        if (buffer.constructor != Uint8Array || typeof init_value !== 'number') {
            throw 'Invalid parameters. ';
        }
        let addr = this.alloc(buffer);
        let result = this.native.libdeflate_crc32(init_value, addr, buffer.byteLength);
        this.free(addr);
        return result;
    }

    public static alloc(data: Uint8Array) : number {
        let buffer = new Uint8Array(this.native.memory.buffer);
        let addr = this.native.malloc(data.byteLength);
        buffer.set(data, addr);
        return addr;
    }

    public static free(addr: number) : void {
        this.native.free(addr);
    }
}
LibDeflate.initialize();
