
function title (s) {
  return `${s[0].toUpperCase()}${s.substring(1)}`
}

class ReaderWriter {
  constructor (endpoint) {
    this.endpoint = endpoint
  }
}

class PartialReaderWriter extends ReaderWriter {
  async read (pos, num) {
    const res = await fetch(this.endpoint, {
      headers: {
        Range: `bytes=${pos}-${num}`
      }
    })

    if (res.status === 206) {
      return new Int8Array(await res.arrayBuffer())
    } else {
      throw new Error('host does not support partial responses or godb is bad')
    }
  }

  async write (pos, num, i8arr) {
    throw new Error('writes are not supported on this interface')
  }
}

class Int8ArrayReaderWriter extends ReaderWriter {
  constructor (i8arr) {
    super()
    this.i8arr = i8arr
  }

  async read (pos, num) {
    while (this.i8arr.length < (pos + num)) {
      this.i8arr.push(0)
    }

    return this.i8arr.subarray(pos, pos + num)
  }

  async write (pos, i8arr) {
    while (this.i8arr.length < (pos + i8arr.length)) {
      this.i8arr.push(0)
    }

    for (let i = 0; i < pos + i8arr.length; i++) {
      this.i8arr[i] = i8arr[i]
    }
  }
}

function cyrb53 (str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed; let h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

class StructView {
  constructor (rw) {
    this._rw = rw
    this._byteLength = 0
    this._base = 0
    this._i8 = new Int8Array()
  }

  _getSize () {
    return this._byteLength
  }

  _setSize (s) {
    this._byteLength = s
  }

  _setBase (base) {
    this._base = base
  }

  _getArrayBuffer (ab) {
    return this._i8.buffer
  }

  _setArrayBuffer (ab) {
    this._i8 = new Int8Array(ab)
  }

  _getI8Arr () {
    return this._i8
  }

  _getReader () {
    return this.rw
  }

  _getWriter () {
    return this.rw
  }

  _bool (fName) {
    const offset = this._getSize()
    this[`get${title(fName)}`] = () => {
      return this._getReader().read(this._base + offset, 1)[0]
    }

    this[`set${title(fName)}`] = (val) => {
      this._getWriter().write(this._base + offset, new ArrayBuffer(new Int8Array([0])))
    }

    this._setSize(this._getSize() + 1)
  }

  _i32 (fName) {
    const offset = this._getSize()
    this[`get${title(fName)}`] = () => {
      return new Int32Array(this._getReader().read(this._base + offset, 4).buffer)[0]
    }

    this[`set${title(fName)}`] = (val) => {
      this._getWriter().write(this._base + offset, new Int32Array([val]).buffer)
    }

    this._setSize(this._getSize() + 4)
    return this
  }

  _str (fName, maxLen) {
    const offset = this._getSize()
    this[`get${title(fName)}`] = () => {
      return new TextDecoder().decode(this._getReader().read(this._base + offset, maxLen))
    }

    this[`set${title(fName)}`] = (val) => {
      const encoder = new TextEncoder()
      this._getWriter().write(this._base + offset, encoder.encode(val).buffer)
    }

    this._setSize(this._getSize() + maxLen)
    return this
  }

  _i8arr (fName, len) {
    const offset = this._getSize()
    this[`get${title(fName)}`] = () => {
      return new Int8Array(this._getReader().read(this._base + offset, len))
    }

    this[`set${title(fName)}`] = (val) => {
      this._getWriter().write(this._base + offset, val)
    }

    this.byteLength += len
    return this
  }

  _structViewArr (fName, len, sv) {
    const offset = this._getSize()

    this[`get${title(fName)}`] = () => {
      return sv.from(this._getReader().read(this._base + offset, sv._getSize()))
    }

    this[`set${title(fName)}`] = (val) => {
      for (let i = 0; i < val.length; i++) {
        this._getI8Arr()[offset + i] = val[i]
      }
    }

    // this.byteLength += (len
    // return this
  }
}

const GoDBHeader = new StructView()
  ._str('header', 4)
  ._i32('numBuckets')
  ._i32('bucketStartOffset')

const GoDBBucket = new StructView()
  ._i32('linkedListOffset')

const GoDBEntry = new StructView()
  ._i32('nextOffset')
  ._bool('enabled')
  ._str('shortened', 48)
  ._str('category', 16)
  ._i32('rounds')
  ._i8arr('salt', 16)

class GoDB {
  constructor (rw) {
    this.rw = rw
  }

  lookupEntry (shortened) {

  }
}
