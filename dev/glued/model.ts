/* eslint-disable  @typescript-eslint/no-explicit-any */

export class Model {
    constructor(
        private readonly _type: string,
        private readonly _fieldTool: FieldToolModel,
        o?: any
    ) {
        _fieldTool.init({ self: this }, "self", o, this)
    }

    _copy(): Model {
        return this._fieldTool.copy(this)
    }

    _unmarshal(d: string) {
        // console.log("starting unmarshal onto", this)
        let c = { _key: this }
        if (!this._fieldTool.unmarshal(JSON.parse(d), c, "_key")) {
            throw new Error("could not unmarshal")
        }
    }

    _marshal(): string {
        const ret = { _key: {} }
        if (!this._fieldTool.marshal(this, ret, "_key")) {
            throw new Error("could not marshal")
        }

        return JSON.stringify(ret._key)
    }

    _marshalFields(): object {
        const c = { _ret: {} }
        if (!this._fieldTool.marshal(this, c, "_ret")) {
            throw new Error("could not marshal")
        }
        return c._ret
    }

    _unmarshalFields(o: object) {
        let c = { _key: this }
        if (!this._fieldTool.unmarshal(o, c, "_key")) {
            throw new Error("could not marshal")
        }
    }

    _repr(n?: number | undefined): string {
        return this._fieldTool.repr(this)
    }

    _validate(): boolean {
        return this._fieldTool.isUnmarshaled(this)[0]
    }
}

export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]>; } : T

export type Nullable<T> = T | undefined

abstract class FieldTool {
    // Default mapping is a 1:1 marshal
    isMarshaled(val: any): [boolean, any] {
        return this.isUnmarshaled(val)
    }

    abstract isUnmarshaled(val: any): [boolean, any]

    // Default implementation is 1:1 marshal (no conversions)
    marshal(unmarshaled: any, onto: any, key: string): boolean {
        const [valid, marshaled] = this.isUnmarshaled(unmarshaled)
        onto[key] = marshaled
        return valid
    }

    unmarshal(marshaled: any, onto: any, key: string): boolean {
        // console.log("unmarshaling onto**", onto, key)
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

    default(): any {
        return undefined
    }

    init(onto: any, key: string, props?: any, initial?: any) {
        onto[key] = props !== undefined ? props : this.default()
    }
}

export type FieldToolDeferred = () => FieldTool

class FieldToolAny extends FieldTool {
    default(): undefined {
        return undefined
    }

    isUnmarshaled(val: any): [boolean, any] {
        return [true, val]
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
        const valid = (typeof val == "number" && val % 1 == 0 && val >= -2147483648 && val <= 2147483647)
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
    constructor(private readonly contains: FieldToolDeferred) {
        super()
    }

    default(): Array<any> {
        return []
    }

    isUnmarshaled(val: any): [boolean, Array<any>] {
        if (!Array.isArray(val)) {
            return [false, this.default()]
        }

        for (const v of val) {
            const [valid, value] = this.contains().isUnmarshaled(v)
            if (!valid) {
                return [false, this.default()]
            }
        }

        return [true, val]
    }

    copy(val: Array<any>) {
        return val.map((v: any) => {
            return this.contains().copy(v)
        })
    }
}

class FieldToolDict extends FieldTool {
    constructor(private readonly contains: FieldToolDeferred) {
        super()
    }

    default(): Record<string, any> {
        return {}
    }

    isUnmarshaled(val: any): [boolean, Record<string, any>] {
        if (val.constructor !== Object) {
            return [false, this.default()]
        }

        for (const [k, v] of Object.entries(val)) {
            const [valid, value] = this.contains().isUnmarshaled(v)
            if (!valid) {
                return [false, this.default()]
            }
        }

        return [true, val]
    }

    copy(p: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(p).map(
                ([k, v]) => [k, this.contains().copy(v)]
            )
        )
    }
}

class FieldToolNullable extends FieldTool {
    constructor(private readonly contains: FieldToolDeferred) {
        super()
    }

    default(): undefined {
        return undefined
    }

    marshal(unmarshaled: any, onto: any, key: string): boolean {
        if (typeof unmarshaled === "undefined") {
            onto[key] = undefined
            return true
        }

        return this.contains().marshal(unmarshaled, onto, key)
    }

    unmarshal(marshaled: any, onto: any, key: string): boolean {
        if (typeof marshaled === "undefined") {
            onto[key] = undefined
            return true
        }

        return this.contains().unmarshal(marshaled, onto, key)
    }

    isUnmarshaled(marshaled: any): [boolean, any | undefined] {
        if (typeof marshaled === "undefined") {
            // console.log("is undefined yes")
            return [true, marshaled]
        }

        // console.log("fuck", marshaled)

        const [valid, value] = this.contains().isUnmarshaled(marshaled)
        if (!valid) {
            return [false, this.default()]
        }

        return [true, value]
    }

    copy(p: any | undefined): any | undefined {
        if (typeof p === "undefined") {
            return undefined
        }

        return this.contains().copy(p)
    }
}


class FieldToolModel extends FieldTool {
    constructor(
        public blank: (o?: object) => Model,
    ) {
        super()
    }

    public fieldMap: Record<string, [string, FieldToolDeferred]> = {}

    field(id: string, name: string, tool: FieldToolDeferred): FieldToolModel {
        this.fieldMap[id] = [name, tool]
        return this
    }


    init(onto: any, key: string, props?: any, initial?: any) {
        const ret = initial || this.blank()

        let initProps = (props == undefined || props.constructor != Object) ? {} : props

        for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
            if (fieldName in initProps) {
                tool().init(ret, fieldName, initProps[fieldName])
            } else {
                tool().init(ret, fieldName)
            }
        }
    }

    isMarshaled(obj: any): [boolean, any] {
        if (obj.constructor != Object) {
            return [false, {}]
        }

        let valid = true;
        for (const [fieldId, [_, tool]] of Object.entries(this.fieldMap)) {
            if (fieldId in obj) {
                const [fValid, _] = tool().isMarshaled(obj[fieldId])
                valid &&= fValid
            }
        }

        return [valid, obj]
    }

    isUnmarshaled(model: object): [boolean, object] {
        if (model instanceof Model) {
            return [true, model]
        }

        return [false, this.default()]
    }

    marshal(unmarshaled: any, onto: any, key: string): boolean {
        let valid = true
        onto[key] = {}

        for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
            // console.log(`marshaling ${fieldId} [${fieldName}], raw: ${unmarshaled[fieldName]}`)

            if (unmarshaled !== undefined && fieldName in unmarshaled) {
                let fValid = tool().marshal(unmarshaled[fieldName], onto[key], fieldId)
                // console.log("field valid? ", fValid)
                valid &&= fValid
            } else {
                tool().marshal(undefined, onto[key], fieldId)
            }
        }

        return valid
    }

    default() {
        return this.blank()
    }

    unmarshal(marshaled: any, onto: any, key: string): boolean {
        let valid = true
        onto[key] = this.default()

        console.log("unmarshaling onto", onto, key)

        for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
            if (marshaled !== undefined && fieldId in marshaled) {
                console.log("marshaled[fieldId]", marshaled[fieldId], fieldName)
                let fValid = tool().unmarshal(marshaled[fieldId], onto[key], fieldName)
                console.log("field valid? ", fieldId, fieldName, fValid)
                valid &&= fValid
            } else {
                tool().unmarshal(undefined, onto[key], fieldName)
            }
        }

        return valid
    }

    copy(val: any): Model {
        let ret = this.default() as any

        for (const [fieldId, [fieldName, tool]] of Object.entries(this.fieldMap)) {
            if (fieldName in val) {
                ret[fieldName] = tool().copy(val[fieldName])
            }
        }

        return ret

    }

}

export class FieldTools {
    static indent(s: string, n: number) {
        return "\t".repeat(n) + s
    }

    static bool: FieldTool = new FieldToolBool()
    static int32: FieldTool = new FieldToolInt32()
    static raw: FieldTool = new FieldToolRaw()
    static str: FieldTool = new FieldToolStr()
    static any: FieldTool = new FieldToolAny()
    static array(contains: FieldToolDeferred) {
        return new FieldToolArray(contains)
    }
    static dict(contains: FieldToolDeferred) {
        return new FieldToolDict(contains)
    }
    static nullable(contains: FieldToolDeferred) {
        return new FieldToolNullable(contains)
    }
    static model(construct: (o?: any) => Model) {
        return new FieldToolModel(construct)
    }
}
