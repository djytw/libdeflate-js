
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
            init_value = 0;
        }
        if (buffer.constructor != Uint8Array || typeof init_value !== 'number') {
            throw 'Invalid parameters. ';
        }
        let addr = this.alloc(buffer);
        let result = this.native.libdeflate_crc32(init_value, addr, buffer.byteLength);
        this.free(addr);
        return result;
    }

    protected static alloc(data: Uint8Array) : number;
    protected static alloc(size: number) : number;
    protected static alloc(data: Uint8Array | number) : number {
        let buffer = new Uint8Array(this.native.memory.buffer);
        if (data.constructor === Uint8Array) {
            let addr = this.native.malloc(data.byteLength);
            buffer.set(data, addr);
            return addr;
        } else {
            return this.native.malloc(data);
        }
    }

    protected static free(addr: number) : void {
        this.native.free(addr);
    }

    protected static getValue(addr: number) : number;
    protected static getValue(addr: number, length: number) : Uint8Array;
    protected static getValue(addr: number, length?: number) : Uint8Array | number {
        let buffer = new Uint8Array(this.native.memory.buffer);
        if (typeof length === 'number' && length > 0) {
            let data = buffer.subarray(addr, addr + length);
            return data;
        }
        else {
            return buffer[addr];
        }
    }

    protected static getInt32(addr: number) : number {
        let val = this.getValue(addr, 4);
        let val32 = new Int32Array(val);
        return val32[0];
    }
}

export class LibDeflateCompressor extends LibDeflate {
    private compressor: number;
    private compression_level: number;

    constructor(compression_level: number) {
        super();
        this.compression_level = compression_level;
        this.compressor = LibDeflate.native.libdeflate_alloc_compressor(compression_level);
    }

    private checkNotClosed() {
        if (this.compressor == 0) {
            throw 'Compressor is closed.';
        }
    }

    private _compress(fun: string, in_data: Uint8Array, out_data: Uint8Array) : number {
        this.checkNotClosed();
        let in_addr = LibDeflate.alloc(in_data);
        let out_addr = LibDeflate.alloc(out_data);
        let func = LibDeflate.native[fun];
        let result = func(this.compressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength);
        LibDeflate.free(in_addr);
        out_data.set(LibDeflate.getValue(out_addr, result));
        LibDeflate.free(out_addr);
        return result;
    }

    public deflate_compress(in_data: Uint8Array, out_data: Uint8Array) : number {
        return this._compress("libdeflate_deflate_compress", in_data, out_data);
    }

    public deflate_bound(in_bytes: number) : number {
        this.checkNotClosed();
        return LibDeflate.native.libdeflate_deflate_compress_bound(this.compressor, in_bytes);
    }

    public static deflate_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_deflate_compress_bound(0, in_bytes);
    }

    public zlib_compress(in_data: Uint8Array, out_data: Uint8Array) : number {
        return this._compress("libdeflate_zlib_compress", in_data, out_data);
    }

    public zlib_bound(in_bytes: number) : number {
        this.checkNotClosed();
        return LibDeflate.native.libdeflate_zlib_compress_bound(this.compressor, in_bytes);
    }

    public static zlib_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_zlib_compress_bound(0, in_bytes);
    }

    public gzip_compress(in_data: Uint8Array, out_data: Uint8Array) : number {
        return this._compress("libdeflate_gzip_compress", in_data, out_data);
    }

    public gzip_bound(in_bytes: number) : number {
        this.checkNotClosed();
        return LibDeflate.native.libdeflate_gzip_compress_bound(this.compressor, in_bytes);
    }

    public static gzip_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_gzip_compress_bound(0, in_bytes);
    }

    public close() : void {
        this.checkNotClosed();
        LibDeflate.native.libdeflate_free_compressor(this.compressor);
        this.compressor = 0;
    }
}

export class LibDeflateDecompressor extends LibDeflate {
    private decompressor: number;

    constructor() {
        super();
        this.decompressor = LibDeflate.native.libdeflate_alloc_decompressor();
    }

    private checkNotClosed() {
        if (this.decompressor == 0) {
            throw 'Decompressor is closed.';
        }
    }
    
    private _decompress(func: string, in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number] {
        this.checkNotClosed();
        let in_addr = LibDeflate.alloc(in_data);
        let out_addr = LibDeflate.alloc(out_data);
        let result_length_addr = LibDeflate.alloc(4);
        let funct = LibDeflate.native[func];
        let result = funct(this.decompressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength, result_length_addr);
        let result_length = LibDeflate.getInt32(result_length_addr);
        out_data.set(LibDeflate.getValue(out_addr, result_length));
        LibDeflate.free(result_length_addr);
        LibDeflate.free(in_addr);
        LibDeflate.free(out_addr);
        return [result, result_length];
    }
    
    private _decompress_ex(func: string, in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number, number] {
        this.checkNotClosed();
        let in_addr = LibDeflate.alloc(in_data);
        let out_addr = LibDeflate.alloc(out_data);
        let result_in_length_addr = LibDeflate.alloc(4);
        let result_out_length_addr = LibDeflate.alloc(4);
        let funct = LibDeflate.native[func];
        let result = funct(this.decompressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength, result_in_length_addr, result_out_length_addr);
        let result_in_length = LibDeflate.getInt32(result_in_length_addr);
        let result_out_length = LibDeflate.getInt32(result_out_length_addr);
        out_data.set(LibDeflate.getValue(out_addr, result_out_length));
        LibDeflate.free(result_in_length_addr);
        LibDeflate.free(result_out_length_addr);
        LibDeflate.free(in_addr);
        LibDeflate.free(out_addr);
        return [result, result_in_length, result_out_length];
    }

    public deflate_decompress(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number] {
        return this._decompress("libdeflate_deflate_decompress", in_data, out_data);
    }

    public deflate_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number, number] {
        return this._decompress_ex("libdeflate_deflate_decompress_ex", in_data, out_data);
    }

    public zlib_decompress(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number] {
        return this._decompress("libdeflate_zlib_decompress", in_data, out_data);
    }

    public zlib_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number, number] {
        return this._decompress_ex("libdeflate_zlib_decompress_ex", in_data, out_data);
    }

    public gzip_decompress(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number] {
        return this._decompress("libdeflate_gzip_decompress", in_data, out_data);
    }

    public gzip_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : [DecompressorResult, number, number] {
        return this._decompress_ex("libdeflate_gzip_decompress_ex", in_data, out_data);
    }

    public close() : void {
        this.checkNotClosed();
        LibDeflate.native.libdeflate_free_decompressor(this.decompressor);
        this.decompressor = 0;
    }
}

export enum DecompressorResult {
    /* Decompression was successful.  */
    LIBDEFLATE_SUCCESS = 0,

    /* Decompressed failed because the compressed data was invalid, corrupt,
     * or otherwise unsupported.  */
    LIBDEFLATE_BAD_DATA = 1,

    /* A NULL 'actual_out_nbytes_ret' was provided, but the data would have
     * decompressed to fewer than 'out_nbytes_avail' bytes.  */
    LIBDEFLATE_SHORT_OUTPUT = 2,

    /* The data would have decompressed to more than 'out_nbytes_avail'
     * bytes.  */
    LIBDEFLATE_INSUFFICIENT_SPACE = 3,
}

LibDeflate.initialize();
