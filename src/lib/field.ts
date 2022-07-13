export type FieldError = string | null

export type TextFieldValue = string | null
export interface TextField {
    value: TextFieldValue
    error: FieldError
}

export type NumberFieldValue = number | null
export interface NumberField {
    value: NumberFieldValue
    error: FieldError
}

export type DateFieldValue = Date | null
export interface DateField {
    value: DateFieldValue
    error: FieldError
}

export type BooleanFieldValue = boolean | null
export interface BooleanField {
    value: BooleanFieldValue
    error: FieldError
}

export type FieldValue =
    | TextFieldValue
    | NumberFieldValue
    | BooleanFieldValue
    | DateFieldValue

export const initialFieldError: FieldError = null

export const initialTextField: TextField = {
    value: null,
    error: initialFieldError,
}

export const initialNumberField: NumberField = {
    value: null,
    error: initialFieldError,
}

export const initialDateField: DateField = {
    value: null,
    error: initialFieldError,
}

export const initialBooleanField: BooleanField = {
    value: null,
    error: initialFieldError,
}
