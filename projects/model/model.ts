
export interface _Model {
    _copy(): _Model
    _validate(): boolean

    _unmarshal(d: string)
    _marshal(): string

    _repr(n?: number): string
}

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T

export type Nullable<T> = T | undefined

// interface FieldTool {
//     init(p: any): any
//     valid(p: any): [boolean, any]
//     default(): any
//     marshalOn(p: any, on: object, k: string): [boolean, any]
//     unmarshalOn(p: any, on: object, k: string): [boolean, any]
//     copy(p: any): any
//     repr(p: any, indent: number): string
// }

abstract class FieldTool {
    abstract default(): any

    // Default mapping is a 1:1 marshal
    isMarshaled(val: any): [boolean, any] {
        return this.isUnmarshaled(val)
    }

    abstract isUnmarshaled(val: any): [boolean, any]

    // Default implementation is 1:1 marshal (no conversions)
    marshal(unmarshaled: any, onto: object, key: string): boolean {
        const [valid, marshaled] = this.isUnmarshaled(unmarshaled)
        onto[key] = marshaled
        return valid
    }

    unmarshal(marshaled: any, onto: object, key: string): boolean {
        const [valid, unmarshaled] = this.isMarshaled(marshaled)
        onto[key] = unmarshaled
        return valid
    }

    make(val: any): any {
        return val
    }
    
    // Copy assumes val is valid.
    copy(val: any): any {
        return val
    }

    // Repr assumes val is valid
    repr(val: any): any {
        return `${val}`
    }

    init(val: any): any {
        return val
    }
}

class FieldToolBool extends FieldTool {
    default(): boolean {
        return false
    }

    isUnmarshaled(val: any): [boolean, boolean] {
        const valid = (typeof val == "boolean")
        return [valid, valid ? val : this.default()]
    }
}

class FieldToolInt32 extends FieldTool {
    default(): number {
        return 0
    }

    isUnmarshaled(val: any): [boolean, number] {
        const valid = (typeof val == "number" && val%1 == 0 && val >= -2147483648 && val <= 2147483647)
        return [valid, valid ? val : this.default()]
    }
}

class FieldToolStr extends FieldTool {
    default(): string {
        return ""
    }

    isUnmarshaled(val: any): [boolean, string] {
        const valid = typeof val == "string"
        return [valid, valid ? val : this.default()] 
    }
}

class FieldToolRaw extends FieldTool {
    default(): string {
        return "{}"
    }
    
    isUnmarshaled(val: any): [boolean, string] {
        const valid = typeof val == "string"
        return [valid, valid ? val : this.default()] 
    }
}

class FieldToolArray extends FieldTool {
    constructor(private readonly contains: FieldTool) {
        super()
    }

    default(): Array<any> {
        return []
    }

    isUnmarshaled(val: any): [boolean, Array<any>] {
        if (!Array.isArray(val) ) {
            return [false, this.default()]
        }

        for (const v of val) {
            const [valid, value] = this.contains.isUnmarshaled(v)
            if (!valid) {
                return [false, this.default()]
            }
        }

        return [true, val]
    }

    copy(val: Array<any>) {
        return val.map((v: any) => {
            return this.contains.copy(v)
        })
    }
}

class FieldToolDict extends FieldTool {
    constructor(private readonly contains: FieldTool) {
        super()
    }
    
    default(): Record<string, any> {
        return {}
    }

    isUnmarshaled(val: any): [boolean, Record<string, any>] {
        if (val.constructor !== Object) {
            return [false, this.default()]
        }

        for (const [k,v] of Object.entries(val)) {
            const [valid, value] = this.contains.isUnmarshaled(v)
            if (!valid) {
                return [false, this.default()]
            }
        }

        return [true, val]
    }

    copy(p: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(p).map(
                ([k,v]) => [k, this.contains.copy(v)]
            )
        )
    }
}

class FieldToolNullable extends FieldTool {
    constructor(private readonly contains: FieldTool) {
        super()
    }

    default(): undefined {
        return undefined
    }

    isUnmarshaled(marshaled: any): [boolean, any | undefined] {
        if (typeof marshaled == "undefined") {
            return [true, marshaled]
        }

        const [valid, value] = this.contains.isUnmarshaled(marshaled)
        if (!valid) {
            return [false, this.default()]
        }

        return [true, marshaled]
    }

    copy(p: any | undefined): any | undefined {
        if (typeof p == "undefined") {
            return undefined
        }

        return this.contains.copy(p)
    }
}


class FieldToolModel extends FieldTool {
    constructor(
        private readonly construct: (o?: object) => _Model,
        private readonly fieldMap: Record<string, [string, FieldTool]>,
    ) {
        super()
    }

    default(): object {
        return {}
    }

    isMarshaled(model: any): [boolean, any] {
        if (obj.c)
    }

    isUnmarshaled(obj: object): [boolean, object] {
        if (obj.constructor != Object) {
            return [false, this.default()]
        }

        let valid = false;
        for (const [fieldId, [_, tool]] of Object.entries(this.fieldMap)) {
            if (fieldId in obj) {
                const [fValid, _] = tool.isUnmarshaled(obj[fieldId])
                valid &&= fValid
            }
        }

        return [valid, obj]
    }

    marshal(marshaled: any, onto: object, key: string): boolean {
        let valid = true
        onto[key] = {}
        for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldUnmarshalMap)) {
            if (fieldId in marshaled) {
                const [fValid, val] = tool.valid(marshaled[fieldId])
                tool.marshal(val, onto[key], fieldName)
                onto[key][fieldName] = val
                valid &&= fValid
            } else {
                tool.marshal(tool.default(), onto[key], fieldName)
            }
        }

        return valid
    }

    unmarshal(marshaled: any, onto: object, key: string): boolean {
        
    }
    
}

// class FieldToolModel extends FieldTool {
//     constructor(
//         private readonly construct: (o?: object) => _Model,
//         private readonly fieldUnmarshalMap: Record<string, [string, FieldTool]>,
//         private readonly fieldMarshalMap: Record<string, [string, FieldTool]>
//     ) {
//         super()
//     }

//     default(): _Model {
//         return this.construct({})
//     }

//     _stub: _Model = this.construct()

//     valid(obj: any): [boolean, _Model] {
//         if (this._stub.constructor != obj.constructor) {
//             return [false, this.default()]
//         }

//         let valid = true
//         for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldUnmarshalMap)) {
//             if (fieldName in obj) {
//                 const [fValid, _] = tool.valid(obj[fieldName])
//                 valid &&= fValid
//             }
//         }

//         return [true, valid ? obj : this.default()]
//     }

//     // unmarshalOnto(marshaled: any, onto: object, key: string): boolean {

//     //     let valid = true
//     //     for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldIdMap)) {
//     //         if (fieldId in p) {
//     //             const [fValid, _] = tool.valid(p[fieldId])
//     //             valid &&= fValid
//     //         }
//     //     }

//     //     // return [true, valid ? p : this.default()]

//     //     // const [valid, unmarshaled] = this.valid(marshaled)
//     //     // onto[key] = unmarshaled
//     //     // return valid
//     // }

//     // marshalOnto(unmarshaled: _Model, onto: object, key: string): boolean {
//     //     const [valid, marshaled] = this.valid(unmarshaled)
//     //     onto[key] = marshaled
//     //     return valid
//     // }

// }

export class FieldTools {
    static indent(s: string, n: number) {
        return "\t".repeat(n) + s
    }

    static bool: FieldTool = new FieldToolBool()
    static int32: FieldTool = new FieldToolInt32()
    static raw: FieldTool = new FieldToolRaw()
    static str: FieldTool = new FieldToolStr()
    static array: ((contains: FieldTool) => FieldTool) = (contains: FieldTool) => {
        return new FieldToolArray(contains)
    }
    static dict: ((contains: FieldTool) => FieldTool) = (contains: FieldTool) => {
        return new FieldToolDict(contains)
    }
    static nullable: ((contains: FieldTool) => FieldTool) = (contains: FieldTool) => {
        return new FieldToolNullable(contains)
    }


    // static init(
    //     obj: object,
    //     fieldNameMap: Record<string, 
    // )

    // static isFields(
    //     inObj: object,
    //     fieldMap: Record<string, [string, FieldTool]>
    // ): boolean {
    //    for (const [fieldId, [_, tool]] of Object.entries(fieldMap)) {
    //         if (fieldId in inObj) {
    //             const [valid, def] = tool.valid(inObj[fieldId])

    //             if (!valid) {
      
    //             }
    //         } else {

    //         }
    //     }
    // }

    // Assumes partial is valid(!)
    static initModel(
        fieldNameMap: Record<string, [string, FieldTool]>,
        partial: object,
        onto: object
    ) {
        for (const [fieldName, [_, tool]] of Object.entries(fieldNameMap)) {
            if (fieldName in partial) {
                onto[fieldName] = tool.init(partial[fieldName])
            } else {
                onto[fieldName] = tool.default()
            }
        }
    }
    
    static marshalFields(
        inObj: object,
        fieldMap: Record<string, [string, FieldTool]>,
        outObj: object
    ) { 
        for (const [fieldName, f] of Object.entries(inObj)) {
            if (fieldName in fieldMap) {
                const [fieldNo, tool] = fieldMap[fieldName]
                tool.marshalOn(f, outObj, fieldNo)
            }
        }
    }

    static unmarshalFields(
        inObj: any,
        propMap: Record<string, [string, FieldTool]>,
        outObj: object
    ): boolean {
        if (inObj.constructor !== Object) {
            return false
        }

        let valid = true
        
        for (const [fNo, [propName, validator]] of Object.entries(propMap)) {
            if (fNo in inObj) {
                const val = validator.unmarshalOn(inObj[fNo])
                const [fValid, value] = validator.isUnmarshaled(val)
                outObj[propName] = value
                valid &&= fValid
            } else {
                outObj[propName] = validator.default()
            }
        }

        return valid
    }
}



interface _Test {
    str: string,
    bool: boolean,
    num: number,
    f: _Test
}


export class Test implements _Test, _Model {
    str: string
    bool: boolean
    num: number
    f: Test

    static {

    }
    
    // static __fieldIdMap: Record<string, [string, FieldTool]> = {
    //     "0": ["str", FieldTools.str],
    //     "4": ["m2", Test.__fieldTool()],
    // }

    // static __fieldNameMap: Record<string, [string, FieldTool]> = {
    //     "str": ["0", FieldTools.str],
    //     "m2": ["4", new FieldToolModelMarshalled(this.__fieldNameMap)],
    // }

    constructor(o?: DeepPartial<Test>) {
        // FieldTools.initModel(Test.__fieldNameMap, o !== undefined ? o : {}, this)
    }

    // _marshal(): string {
    //     return JSON.stringify(Test.__fieldTool().marshalOn(this))
    // }

    // _unmarshal(d: string) {
    //     Test.__fieldTool
    // }

    // _copy(): Test {
    //    return Test.__fieldTool().copy(this) as Test
    // }

    _validate(): boolean {
        const [valid, _] = Test.__fieldTool().isUnmarshaled(this)
        return valid
    }

    static __fieldTool(): FieldTool {
        return {
            init(p: any): any {
                return new Test(p)
            },
            isUnmarshaled(p: any): [boolean, any] {
                let valid = true
                for (const [fieldId, [fieldName, tool]] of Object.entries(Test.__fieldIdMap)) {
                    if (fieldId in p) {
                        const [fValid, val] = tool.valid(p[fieldId])
                        valid &&= fValid
                    }
                }

                return [true, valid ? p : this.default()]
            },
            marshalOn(p: Test): [boolean, object] {
                let ret = {}
                let valid = true
                for (const [fieldName, [fieldId, tool]] of Object.entries(Test.__fieldNameMap)) {
                    const [fValid, marshaled] = tool.marshalOn(this[fieldName])
                    ret[fieldId] = marshaled
                    valid &&= fValid
                }
                return [valid, ret] 
            },
            unmarshalOn(p: any): [boolean, object] {   
                let ret = {}     
                let valid = true
                for (const [fieldId, [fieldName, validator]] of Object.entries(Test.__fieldIdMap)) {
                    if (fieldId in p) {
                        const [fValid, value] = validator.unmarshalOn(p[fieldId])
                        ret[fieldName] = value
                        valid &&= fValid
                    } else {
                        ret[fieldName] = validator.default()
                    }
                }

                return [valid, ret]
            },
            default(): any {
                return this.init({})
            },
            copy(p: any): Test {
                let ret = new Test()
                for (const [_, [fieldName, tool]] of Object.entries(Test.__fieldIdMap)) {
                    ret[fieldName] = tool.copy(p[fieldName])
                }
                return ret
            },
            repr: p => "Test {}"
        }    
    }
}