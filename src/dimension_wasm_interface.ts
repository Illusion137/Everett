// types.ts
export interface EvalResult {
    success: boolean;
    value?: number;
    unit?: number[];
    unit_latex?: string;
    value_scientific?: string;
    error?: string;
}

export interface BatchResult {
    results: EvalResult[];
}

export interface Expression {
    value_expr: string;
    unit_expr: string;
}

export interface FormulaResult {
    name: string;
    latex: string;
    category: string;
}

export interface WasmModule {
    _dv_init(): boolean;
    _dv_destroy(): void;
    _dv_is_initialized(): boolean;
    _dv_set_constant(name_ptr: number, value_expr_ptr: number, unit_expr_ptr: number): boolean;
    _dv_remove_constant(name_ptr: number): boolean;
    _dv_clear_constants(): void;
    _dv_get_constant_count(): number;
    _dv_eval(value_expr_ptr: number, unit_expr_ptr: number): number;
    _dv_eval_batch(value_exprs_ptr: number, unit_exprs_ptr: number, count: number): number;
    _dv_free_batch_result(batch_ptr: number): void;
    _dv_get_available_formulas(target_unit_ptr: number): number;
    _dv_free_formula_list(list_ptr: number): void;
    _dv_get_variable(name_ptr: number, out_value_ptr: number): boolean;
    _dv_clear_variables(): void;
    _dv_get_variable_count(): number;
    _dv_get_last_formula_results(): number;
    _dv_unit_latex_to_unit(unit_latex_ptr: number, out_unit_ptr: number): void;
    _dv_unit_to_latex(unit_ptr: number): number;
    _dv_value_to_scientific(value: number): number;
    _dv_free(ptr: number): void;
    _dv_version(): number;
    _malloc(size: number): number;
    HEAPF64: Float64Array;
    HEAP32: Int32Array;
    HEAPU32: Uint32Array;
    HEAPU8: Uint8Array;
    HEAP8: Uint8Array;
}

// dimensional_evaluator.ts
export class DimensionalEvaluator {
    private module: WasmModule;
    private text_encoder: TextEncoder;
    private text_decoder: TextDecoder;
    private is_destroyed: boolean = false;

    constructor(wasm_module: WasmModule) {
        this.module = wasm_module;
        this.text_encoder = new TextEncoder();
        this.text_decoder = new TextDecoder();

        if (!this.module._dv_init()) {
            throw new Error('Failed to initialize evaluator');
        }
    }

    destroy(): void {
        if (!this.is_destroyed) {
            this.module._dv_destroy();
            this.is_destroyed = true;
        }
    }

    is_initialized(): boolean {
        return !this.is_destroyed && this.module._dv_is_initialized();
    }

    // ========================================================================
    // Constants Management
    // ========================================================================

    set_constant(name: string, value_expr: string, unit_expr: string): boolean {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const value_expr_ptr = this._alloc_string(value_expr);
        const unit_expr_ptr = this._alloc_string(unit_expr);
        const result = this.module._dv_set_constant(name_ptr, value_expr_ptr, unit_expr_ptr);
        this.module._dv_free(name_ptr);
        this.module._dv_free(value_expr_ptr);
        this.module._dv_free(unit_expr_ptr);
        return result;
    }

    remove_constant(name: string): boolean {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const result = this.module._dv_remove_constant(name_ptr);
        this.module._dv_free(name_ptr);
        return result;
    }

    clear_constants(): void {
        this._check_initialized();
        this.module._dv_clear_constants();
    }

    get_constant_count(): number {
        this._check_initialized();
        return this.module._dv_get_constant_count();
    }

    // ========================================================================
    // Expression Evaluation
    // ========================================================================

    eval(value_expr: string, unit_expr: string = ""): EvalResult {
        this._check_initialized();
        const value_expr_ptr = this._alloc_string(value_expr);
        const unit_expr_ptr = this._alloc_string(unit_expr);
        const result_ptr = this.module._dv_eval(value_expr_ptr, unit_expr_ptr);

        // struct dv_result layout (WASM):
        //   0: long double value (8 bytes)
        //   8: int8_t unit[7] (7 bytes)
        //  15: bool success (1 byte)
        //  16: char error[256]
        // 272: char unit_latex[256]
        // 528: char value_scientific[256]

        const value = this.module.HEAPF64[result_ptr / 8];

        const unit: number[] = [];
        for (let i = 0; i < 7; i++) {
            unit.push(this.module.HEAP8[result_ptr + 8 + i]);
        }

        const success = this.module.HEAPU8[result_ptr + 15] !== 0;

        let result: EvalResult;
        if (success) {
            const unit_latex = this._read_fixed_string(result_ptr + 272, 256);
            const value_scientific = this._read_fixed_string(result_ptr + 528, 256);
            result = { success: true, value, unit, unit_latex, value_scientific };
        } else {
            const error = this._read_fixed_string(result_ptr + 16, 256);
            result = { success: false, error };
        }

        this.module._dv_free(value_expr_ptr);
        this.module._dv_free(unit_expr_ptr);

        return result;
    }

    eval_batch(expressions: Expression[]): EvalResult[] {
        this._check_initialized();

        if (expressions.length === 0) {
            return [];
        }

        const count = expressions.length;
        const ptr_size = 4;
        const value_array_ptr = this.module._malloc(count * ptr_size);
        const unit_array_ptr = this.module._malloc(count * ptr_size);
        const string_ptrs: number[] = [];

        try {
            for (let i = 0; i < count; i++) {
                const v_ptr = this._alloc_string(expressions[i].value_expr);
                const u_ptr = this._alloc_string(expressions[i].unit_expr);
                string_ptrs.push(v_ptr, u_ptr);
                this.module.HEAPU32[value_array_ptr / 4 + i] = v_ptr;
                this.module.HEAPU32[unit_array_ptr / 4 + i] = u_ptr;
            }

            const batch_ptr = this.module._dv_eval_batch(value_array_ptr, unit_array_ptr, count);

            if (batch_ptr === 0) {
                throw new Error('Batch evaluation failed');
            }

            // struct dv_batch_result layout (WASM, 32-bit pointers):
            //  0: long double* values
            //  4: int8_t** units
            //  8: bool* successes
            // 12: char** errors
            // 16: char** unit_latexes
            // 20: char** value_scientifics
            // 24: int count
            const values_ptr = this.module.HEAPU32[batch_ptr / 4];
            const units_ptr = this.module.HEAPU32[batch_ptr / 4 + 1];
            const successes_ptr = this.module.HEAPU32[batch_ptr / 4 + 2];
            const errors_ptr = this.module.HEAPU32[batch_ptr / 4 + 3];
            const unit_latexes_ptr = this.module.HEAPU32[batch_ptr / 4 + 4];
            const value_scientifics_ptr = this.module.HEAPU32[batch_ptr / 4 + 5];
            const result_count = this.module.HEAP32[batch_ptr / 4 + 6];

            const results: EvalResult[] = [];
            for (let i = 0; i < result_count; i++) {
                const value = this.module.HEAPF64[values_ptr / 8 + i];
                const success = this.module.HEAPU8[successes_ptr + i] !== 0;

                const unit_arr_ptr = this.module.HEAPU32[units_ptr / 4 + i];
                const unit: number[] = [];
                for (let j = 0; j < 7; j++) {
                    unit.push(this.module.HEAP8[unit_arr_ptr + j]);
                }

                if (success) {
                    const latex_str_ptr = this.module.HEAPU32[unit_latexes_ptr / 4 + i];
                    const sci_str_ptr = this.module.HEAPU32[value_scientifics_ptr / 4 + i];
                    const unit_latex = this._read_string(latex_str_ptr);
                    const value_scientific = this._read_string(sci_str_ptr);
                    results.push({ success: true, value, unit, unit_latex, value_scientific });
                } else {
                    const error_str_ptr = this.module.HEAPU32[errors_ptr / 4 + i];
                    const error = this._read_string(error_str_ptr);
                    results.push({ success: false, error });
                }
            }

            this.module._dv_free_batch_result(batch_ptr);

            return results;
        } finally {
            string_ptrs.forEach(ptr => this.module._dv_free(ptr));
            this.module._dv_free(value_array_ptr);
            this.module._dv_free(unit_array_ptr);
        }
    }

    // ========================================================================
    // Formula Search
    // ========================================================================

    get_available_formulas(target_unit: number[]): FormulaResult[] {
        this._check_initialized();

        const unit_ptr = this.module._malloc(7);
        for (let i = 0; i < 7; i++) {
            this.module.HEAP8[unit_ptr + i] = target_unit[i] ?? 0;
        }

        const list_ptr = this.module._dv_get_available_formulas(unit_ptr);
        this.module._dv_free(unit_ptr);

        if (list_ptr === 0) {
            return [];
        }

        // struct dv_formula_list layout:
        //  0: char** names
        //  4: char** latexes
        //  8: char** categories
        // 12: int count
        const names_ptr = this.module.HEAPU32[list_ptr / 4];
        const latexes_ptr = this.module.HEAPU32[list_ptr / 4 + 1];
        const categories_ptr = this.module.HEAPU32[list_ptr / 4 + 2];
        const count = this.module.HEAP32[list_ptr / 4 + 3];

        const formulas: FormulaResult[] = [];
        for (let i = 0; i < count; i++) {
            const name = this._read_string(this.module.HEAPU32[names_ptr / 4 + i]);
            const latex = this._read_string(this.module.HEAPU32[latexes_ptr / 4 + i]);
            const category = this._read_string(this.module.HEAPU32[categories_ptr / 4 + i]);
            formulas.push({ name, latex, category });
        }

        this.module._dv_free_formula_list(list_ptr);

        return formulas;
    }

    // ========================================================================
    // Last Formula Results
    // ========================================================================

    get_last_formula_results(): FormulaResult[] {
        this._check_initialized();

        const list_ptr = this.module._dv_get_last_formula_results();

        if (list_ptr === 0) {
            return [];
        }

        // Same layout as dv_formula_list
        const names_ptr = this.module.HEAPU32[list_ptr / 4];
        const latexes_ptr = this.module.HEAPU32[list_ptr / 4 + 1];
        const categories_ptr = this.module.HEAPU32[list_ptr / 4 + 2];
        const count = this.module.HEAP32[list_ptr / 4 + 3];

        const formulas: FormulaResult[] = [];
        for (let i = 0; i < count; i++) {
            const name = this._read_string(this.module.HEAPU32[names_ptr / 4 + i]);
            const latex = this._read_string(this.module.HEAPU32[latexes_ptr / 4 + i]);
            const category = this._read_string(this.module.HEAPU32[categories_ptr / 4 + i]);
            formulas.push({ name, latex, category });
        }

        this.module._dv_free_formula_list(list_ptr);

        return formulas;
    }

    // ========================================================================
    // Value Utilities
    // ========================================================================

    unit_latex_to_unit(unit_latex: string): number[] {
        this._check_initialized();
        const latex_ptr = this._alloc_string(unit_latex);
        const out_ptr = this.module._malloc(7);

        try {
            this.module._dv_unit_latex_to_unit(latex_ptr, out_ptr);
            const unit: number[] = [];
            for (let i = 0; i < 7; i++) {
                unit.push(this.module.HEAP8[out_ptr + i]);
            }
            return unit;
        } finally {
            this.module._dv_free(latex_ptr);
            this.module._dv_free(out_ptr);
        }
    }

    unit_to_latex(unit: number[]): string {
        this._check_initialized();
        const unit_ptr = this.module._malloc(7);
        for (let i = 0; i < 7; i++) {
            this.module.HEAP8[unit_ptr + i] = unit[i] ?? 0;
        }

        const result_ptr = this.module._dv_unit_to_latex(unit_ptr);
        this.module._dv_free(unit_ptr);

        if (result_ptr === 0) {
            return '';
        }

        const result = this._read_string(result_ptr);
        this.module._dv_free(result_ptr);
        return result;
    }

    value_to_scientific(value: number): string {
        const result_ptr = this.module._dv_value_to_scientific(value);

        if (result_ptr === 0) {
            return '';
        }

        const result = this._read_string(result_ptr);
        this.module._dv_free(result_ptr);
        return result;
    }

    // ========================================================================
    // Variables Management
    // ========================================================================

    get_variable(name: string): number | null {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const value_ptr = this.module._malloc(8);

        try {
            const success = this.module._dv_get_variable(name_ptr, value_ptr);

            if (success) {
                return this.module.HEAPF64[value_ptr / 8];
            }

            return null;
        } finally {
            this.module._dv_free(name_ptr);
            this.module._dv_free(value_ptr);
        }
    }

    clear_variables(): void {
        this._check_initialized();
        this.module._dv_clear_variables();
    }

    get_variable_count(): number {
        this._check_initialized();
        return this.module._dv_get_variable_count();
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    get_version(): string {
        const version_ptr = this.module._dv_version();
        return this._read_string(version_ptr);
    }

    reset(): void {
        this.clear_constants();
        this.clear_variables();
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private _check_initialized(): void {
        if (this.is_destroyed) {
            throw new Error('Evaluator has been destroyed');
        }
        if (!this.module._dv_is_initialized()) {
            throw new Error('Evaluator is not initialized');
        }
    }

    private _alloc_string(str: string): number {
        const bytes = this.text_encoder.encode(str + '\0');
        const ptr = this.module._malloc(bytes.length);
        this.module.HEAPU8.set(bytes, ptr);
        return ptr;
    }

    private _read_string(ptr: number): string {
        const bytes: number[] = [];
        let offset = 0;
        while (this.module.HEAPU8[ptr + offset] !== 0) {
            bytes.push(this.module.HEAPU8[ptr + offset]);
            offset++;
        }
        return this.text_decoder.decode(new Uint8Array(bytes));
    }

    private _read_fixed_string(ptr: number, max_len: number): string {
        // const end = ptr + max_len;
        let len = 0;
        while (len < max_len && this.module.HEAPU8[ptr + len] !== 0) {
            len++;
        }
        const bytes = this.module.HEAPU8.subarray(ptr, ptr + len);
        return this.text_decoder.decode(bytes);
    }
}
