
export default class LibDeflate {
    protected static native: any;
    public static DecompressorResult: typeof LibDeflateDecompressorResult;
    public static Decompressor: typeof LibDeflateDecompressor;
    public static Compressor: typeof LibDeflateCompressor;

    static async initialize() : Promise<void> {
        return new Promise(async resolve => {

            LibDeflate.DecompressorResult = LibDeflateDecompressorResult;
            LibDeflate.Decompressor = LibDeflateDecompressor;
            LibDeflate.Compressor = LibDeflateCompressor;

            if (typeof fetch === 'function') {
                // if support fetch
                fetch('libdeflate.wasm').then(response => 
                    response.arrayBuffer()
                ).then(bytes => 
                    WebAssembly.instantiate(bytes)
                ).then(obj => {
                    LibDeflate.native = obj.instance.exports;
                    resolve();
                });
            } else if (process !== undefined) {
                // nodejs
                (async () => {
                    const path = await import('path');
                    const url = await import('url');
                    const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
                    const wasm = path.join(__dirname, 'libdeflate.wasm');
                    import('fs').then(fs => 
                        fs.readFileSync(wasm)
                    ).then(bytes => 
                        WebAssembly.instantiate(bytes)
                    ).then(obj => {
                        LibDeflate.native = obj.instance.exports;
                        resolve();
                    });
                })()
            } else {
                let req = new XMLHttpRequest();
                req.open('GET', 'libdeflate.wasm', true);
                req.responseType = 'arraybuffer';
                req.onload = () => {
                    WebAssembly.instantiate(req.response).then(obj =>{
                        LibDeflate.native = obj.instance.exports;
                        resolve();
                    });
                }
                req.send(null);
            }

        });
    }

    /**
     * adler32() updates a running Adler-32 checksum of buffer and returns the updated checksum.  
     * When starting a new checksum, omit the second parameter. 
     * 
     * @param buffer An Uint8Array stores the data
     * @param init Passing the previous result, if updating a running Adler-32 checksum; or omit this to start a new checksum.
     * @returns the Adler-32 checksum
     */
    public static adler32(buffer: Uint8Array, init?: number) : number {
        let init_value = init;
        if (init === undefined) {
            init_value = 1;
        }
        if (buffer.constructor != Uint8Array || typeof init_value !== 'number') {
            throw 'LibDeflate: adler32: Invalid parameters. ';
        }
        let addr = this.alloc(buffer);
        let result = this.native.libdeflate_adler32(init_value, addr, buffer.byteLength);
        this.free(addr);
        return result;
    }

    /**
     * crc32() updates a running CRC-32 checksum of buffer and returns the updated checksum.  
     * When starting a new checksum, omit the second parameter. 
     * 
     * @param buffer An Uint8Array stores the data
     * @param init Passing the previous result, if updating a running CRC-32 checksum; or omit this to start a new checksum.
     * @returns the CRC-32 checksum
     */
    public static crc32(buffer: Uint8Array, init?: number) : number {
        let init_value = init;
        if (init === undefined) {
            init_value = 0;
        }
        if (buffer.constructor != Uint8Array || typeof init_value !== 'number') {
            throw 'LibDeflate: crc32: Invalid parameters. ';
        }
        let addr = this.alloc(buffer);
        let result = this.native.libdeflate_crc32(init_value, addr, buffer.byteLength);
        this.free(addr);
        return result;
    }

    /**
     * Copy JS memory to WebAssembly memory. Internal use.
     * @param data data to be copied
     * @returns Begin address of the memory
     */
    protected static alloc(data: Uint8Array) : number;
    /**
     * Allocate WebAssembly memory. Internal use.
     * @param size memory size in bytes to be allocated
     * @returns Begin address of the memory
     */
    protected static alloc(size: number) : number;
    protected static alloc(data: Uint8Array | number) : number {
        let buffer = new Uint8Array(this.native.memory.buffer);
        if (data.constructor === Uint8Array) {
            let addr = this.native.malloc(data.byteLength);
            if (addr == 0) {
                throw 'Failed to allocate memory';
            }
            buffer.set(data, addr);
            return addr;
        } else {
            return this.native.malloc(data);
        }
    }

    /**
     * Free WebAssembly memory. Internal use.
     * @param addr Memory address to be freed
     */
    protected static free(addr: number) : void {
        this.native.free(addr);
    }

    /**
     * Get the byte value of specified address. Internal use.
     */
    protected static getValue(addr: number) : number;
    /**
     * Get the byte values of specified address range. Internal use.
     */
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

    /**
     * Get the int32 value of specified address. Internal use.
     */
    protected static getInt32(addr: number) : number {
        let val = new Uint8Array(this.getValue(addr, 4));
        let val32 = new Int32Array(val.buffer);
        return val32[0];
    }
}

export class LibDeflateCompressor extends LibDeflate {
    private compressor: number;
    private compression_level: number;
    private locked: boolean;

    /**
     * Create a new libdeflate compressor with the specified compression level.
     * @param compression_level the compression level to use, from 0 to 12
     */
    constructor(compression_level: number) {
        super();
        this.compression_level = compression_level;
        this.compressor = LibDeflate.native.libdeflate_alloc_compressor(compression_level);
        this.locked = false;
    }

    private checkNotClosed() {
        if (this.compressor == 0) {
            throw 'Compressor is closed.';
        }
        if (this.locked) {
            throw 'This compressor is currently busy. A single compressor is not safe to use simultaneously.';
        }
        this.locked = true;
    }

    private _compress(fun: string, in_data: Uint8Array, out_data: Uint8Array) : Promise<number> {
        this.checkNotClosed();
        let self = this;
        return new Promise(async resolve => {
            let in_addr = LibDeflate.alloc(in_data);
            let out_addr = LibDeflate.alloc(out_data);
            let func = LibDeflate.native[fun];
            let result = func(self.compressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength);
            LibDeflate.free(in_addr);
            if (result > 0)
                out_data.set(LibDeflate.getValue(out_addr, result));
            LibDeflate.free(out_addr);
            this.locked = false;
            resolve(result);
        })
    }

    /**
     * Performs raw DEFLATE compression on a buffer. An output buffer should be created before calling this.
     * The return value is the compressed size in bytes, or 0 if output buffer cannot hold all compressed data.
     * 
     * @param in_data Data to be compressed
     * @param out_data Output data buffer
     * @returns Compressed size in bytes
     */
    public deflate_compress(in_data: Uint8Array, out_data: Uint8Array) : Promise<number> {
        return this._compress("libdeflate_deflate_compress", in_data, out_data);
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data.
     * Mathematically, this bound will necessarily be a number greater than or equal to 'in_nbytes'.
     * It may be an overestimate of the true upper bound. The return value is guaranteed to be the same 
     * for all invocations with the same compressor and same 'in_nbytes'.
     * 
     * Note that this function is not necessary in many applications. With block-based compression, it is 
     * usually preferable to separately store the uncompressed size of each block and to store any blocks
     * that did not compress to less than their original size uncompressed. In that scenario, there is no
     * need to know the worst-case compressed size, since the maximum number of bytes of compressed data that
     * may be used would always be one less than the input length. You can just pass a buffer of that size to
     * deflate_compress() and store the data uncompressed if deflate_compress() returns 0, indicating that 
     * the compressed data did not fit into the provided output buffer.
     *
     * @param in_bytes data size
     */
    public deflate_bound(in_bytes: number) : number {
        this.checkNotClosed();
        let retval = LibDeflate.native.libdeflate_deflate_compress_bound(this.compressor, in_bytes);
        this.locked = false;
        return retval;
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data
     * for **any** compression levels.
     * @see LibDeflateCompressor.deflate_bound
     * 
     * @param in_bytes data size
     */
    public static deflate_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_deflate_compress_bound(0, in_bytes);
    }

    /**
     * Like {@see deflate_compress}, but stores the data in the zlib wrapper format.
     */
    public zlib_compress(in_data: Uint8Array, out_data: Uint8Array) : Promise<number> {
        return this._compress("libdeflate_zlib_compress", in_data, out_data);
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data
     * to zlib wrapper format.
     * @see LibDeflateCompressor.deflate_bound
     * 
     * @param in_bytes data size
     */
    public zlib_bound(in_bytes: number) : number {
        this.checkNotClosed();
        let retval = LibDeflate.native.libdeflate_zlib_compress_bound(this.compressor, in_bytes);
        this.locked = false;
        return retval;
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data
     * to zlib wrapper format for **any** compression levels.
     * @see LibDeflateCompressor.deflate_bound
     * 
     * @param in_bytes data size
     */
    public static zlib_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_zlib_compress_bound(0, in_bytes);
    }

    /**
     * Like {@see deflate_compress}, but stores the data in the gzip wrapper format.
     */
    public gzip_compress(in_data: Uint8Array, out_data: Uint8Array) : Promise<number> {
        return this._compress("libdeflate_gzip_compress", in_data, out_data);
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data
     * to gzip wrapper format.
     * @see LibDeflateCompressor.deflate_bound
     * 
     * @param in_bytes data size
     */
    public gzip_bound(in_bytes: number) : number {
        this.checkNotClosed();
        let retval = LibDeflate.native.libdeflate_gzip_compress_bound(this.compressor, in_bytes);
        this.locked = false;
        return retval;
    }

    /**
     * Returns a worst-case upper bound of compressed size when compressing {@param in_bytes} bytes data
     * to gzip wrapper format for **any** compression levels.
     * @see LibDeflateCompressor.deflate_bound
     * 
     * @param in_bytes data size
     */
    public static gzip_bound(in_bytes: number) : number {
        return LibDeflate.native.libdeflate_gzip_compress_bound(0, in_bytes);
    }

    /**
     * Close the compressor and free the memory.
     */
    public close() : void {
        this.checkNotClosed();
        LibDeflate.native.libdeflate_free_compressor(this.compressor);
        this.compressor = 0;
    }
}

export class LibDeflateDecompressor extends LibDeflate {
    private decompressor: number;
    private locked: boolean;

    /**
     * Create a new libdeflate decompressor.
     */
    constructor() {
        super();
        this.decompressor = LibDeflate.native.libdeflate_alloc_decompressor();
        this.locked = false;
    }

    private checkNotClosed() {
        if (this.decompressor == 0) {
            throw 'Decompressor is closed.';
        }
        if (this.locked) {
            throw 'This decompressor is currently busy. A single decompressor is not safe to use simultaneously.';
        }
        this.locked = true;
    }
    
    private _decompress(func: string, in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number]> {
        this.checkNotClosed();
        let self = this;
        return new Promise(async resolve => {
            let in_addr = LibDeflate.alloc(in_data);
            let out_addr = LibDeflate.alloc(out_data);
            let result_length_addr = LibDeflate.alloc(4);
            let funct = LibDeflate.native[func];
            let result = funct(self.decompressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength, result_length_addr);
            if (result !== LibDeflateDecompressorResult.LIBDEFLATE_SUCCESS) {
                LibDeflate.free(result_length_addr);
                LibDeflate.free(in_addr);
                LibDeflate.free(out_addr);
                this.locked = false;
                resolve([result, 0]);
                return;
            }
            let result_length = LibDeflate.getInt32(result_length_addr);
            out_data.set(LibDeflate.getValue(out_addr, result_length));
            LibDeflate.free(result_length_addr);
            LibDeflate.free(in_addr);
            LibDeflate.free(out_addr);
            this.locked = false;
            resolve([result, result_length]);
        })
    }
    
    private _decompress_ex(func: string, in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number, number]> {
        this.checkNotClosed();
        let self = this;
        return new Promise(async resolve => {
            let in_addr = LibDeflate.alloc(in_data);
            let out_addr = LibDeflate.alloc(out_data);
            let result_in_length_addr = LibDeflate.alloc(4);
            let result_out_length_addr = LibDeflate.alloc(4);
            let funct = LibDeflate.native[func];
            let result = funct(self.decompressor, in_addr, in_data.byteLength, out_addr, out_data.byteLength, result_in_length_addr, result_out_length_addr);
            if (result !== LibDeflateDecompressorResult.LIBDEFLATE_SUCCESS) {
                LibDeflate.free(result_in_length_addr);
                LibDeflate.free(result_out_length_addr);
                LibDeflate.free(in_addr);
                LibDeflate.free(out_addr);
                this.locked = false;
                resolve([result, 0, 0]);
                return;
            }
            let result_in_length = LibDeflate.getInt32(result_in_length_addr);
            let result_out_length = LibDeflate.getInt32(result_out_length_addr);
            out_data.set(LibDeflate.getValue(out_addr, result_out_length));
            LibDeflate.free(result_in_length_addr);
            LibDeflate.free(result_out_length_addr);
            LibDeflate.free(in_addr);
            LibDeflate.free(out_addr);
            this.locked = false;
            resolve([result, result_in_length, result_out_length]);
        })
    }

    /**
     * Decompresses the DEFLATE-compressed stream from the buffer 'in_data'. The uncompressed data is written to 'out_data'.
     * Decompression stops at the end of the DEFLATE stream (as indicated by the BFINAL flag), even if not all input data is 
     * consumed.
     * 
     * If the actual uncompressed size is unknown, create an output buffer with some size that you think is large enough to 
     * hold all the uncompressed data.  It will return LIBDEFLATE_INSUFFICIENT_SPACE if the provided buffer was not large 
     * enough but no other problems were encountered.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of uncompressed data if result is
     * LIBDEFLATE_SUCCESS. 
     */
    public deflate_decompress(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number]> {
        return this._decompress("libdeflate_deflate_decompress", in_data, out_data);
    }

    /**
     * Like deflate_decompress, but returns both consumed compressed data size and output uncompressed data size.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, in_size, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of consumed input data, the third is the size
     * of uncompressed data if result is LIBDEFLATE_SUCCESS. 
     */
    public deflate_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number, number]> {
        return this._decompress_ex("libdeflate_deflate_decompress_ex", in_data, out_data);
    }

    /**
     * Like deflate_decompress, but use zlib wrapper format.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of uncompressed data if result is
     * LIBDEFLATE_SUCCESS. 
     */
    public zlib_decompress(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number]> {
        return this._decompress("libdeflate_zlib_decompress", in_data, out_data);
    }


    /**
     * Like deflate_decompress_ex, but use zlib wrapper format.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, in_size, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of consumed input data, the third is the size
     * of uncompressed data if result is LIBDEFLATE_SUCCESS. 
     */
    public zlib_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number, number]> {
        return this._decompress_ex("libdeflate_zlib_decompress_ex", in_data, out_data);
    }

    /**
     * Like deflate_decompress, but use gzip wrapper format.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of uncompressed data if result is
     * LIBDEFLATE_SUCCESS. 
     */
    public gzip_decompress(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number]> {
        return this._decompress("libdeflate_gzip_decompress", in_data, out_data);
    }

    /**
     * Like deflate_decompress_ex, but use gzip wrapper format.
     * 
     * @param in_data Data to be decompressed
     * @param out_data Output data buffer
     * 
     * @returns A tuple [DecompressorResult, in_size, output_size]. The first element indicates the result of decompress.
     * See enum DecompressorResult for detail. The second element is the size of consumed input data, the third is the size
     * of uncompressed data if result is LIBDEFLATE_SUCCESS. 
     */
    public gzip_decompress_ex(in_data: Uint8Array, out_data: Uint8Array) : Promise<[LibDeflateDecompressorResult, number, number]> {
        return this._decompress_ex("libdeflate_gzip_decompress_ex", in_data, out_data);
    }

    /**
     * Close the decompressor and free the memory.
     */
    public close() : void {
        this.checkNotClosed();
        LibDeflate.native.libdeflate_free_decompressor(this.decompressor);
        this.decompressor = 0;
    }
}

export enum LibDeflateDecompressorResult {
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
