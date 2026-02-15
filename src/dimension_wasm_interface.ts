// types.ts
export interface EvalResult {
    success: boolean;
    value?: number;
    unit?: number[];
    error?: string;
}

export interface BatchResult {
    results: EvalResult[];
}

export interface WasmModule {
    _dv_init(): boolean;
    _dv_destroy(): void;
    _dv_is_initialized(): boolean;
    _dv_set_constant(name_ptr: number, expression_ptr: number, unit_expression_ptr: number): boolean;
    _dv_remove_constant(name_ptr: number): boolean;
    _dv_clear_constants(): void;
    _dv_get_constant_count(): number;
    _dv_eval(expr_ptr: number): number;
    _dv_eval_batch(exprs_ptr: number, count: number): number;
    _dv_free_batch_result(batch_ptr: number): void;
    _dv_get_variable(name_ptr: number, out_value_ptr: number): boolean;
    _dv_clear_variables(): void;
    _dv_get_variable_count(): number;
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

    /**
     * Clean up the evaluator and free resources
     */
    destroy(): void {
        if (!this.is_destroyed) {
            this.module._dv_destroy();
            this.is_destroyed = true;
        }
    }

    /**
     * Check if the evaluator is still active
     */
    is_initialized(): boolean {
        return !this.is_destroyed && this.module._dv_is_initialized();
    }

    // ========================================================================
    // Constants Management
    // ========================================================================

    /**
     * Set a constant value that can be used in expressions
     * @param name - The name of the constant (e.g., 'pi', 'e', 'c')
     * @param value - The numeric value
     * @returns true if successful
     */
    set_constant(name: string, expression: string, unit_expression: string): boolean {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const expression_ptr = this._alloc_string(expression);
        const unit_expression_ptr = this._alloc_string(unit_expression);
        const result = this.module._dv_set_constant(name_ptr, expression_ptr, unit_expression_ptr);
        this.module._dv_free(name_ptr);
        this.module._dv_free(expression_ptr);
        this.module._dv_free(unit_expression_ptr);
        return result;
    }

    /**
     * Remove a constant
     * @param name - The name of the constant to remove
     * @returns true if the constant existed and was removed
     */
    remove_constant(name: string): boolean {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const result = this.module._dv_remove_constant(name_ptr);
        this.module._dv_free(name_ptr);
        return result;
    }

    /**
     * Clear all constants
     */
    clear_constants(): void {
        this._check_initialized();
        this.module._dv_clear_constants();
    }

    /**
     * Get the number of defined constants
     */
    get_constant_count(): number {
        this._check_initialized();
        return this.module._dv_get_constant_count();
    }

    // ========================================================================
    // Expression Evaluation
    // ========================================================================

    /**
     * Evaluate a single expression
     * @param expression - The mathematical expression to evaluate
     * @returns Result object with success flag, value, unit array, or error message
     * 
     * @example
     * ```typescript
     * const result = evaluator.eval('2 + 2');
     * if (result.success) {
     *     console.log(result.value); // 4
     *     console.log(result.unit);  // Unit dimension array
     * } else {
     *     console.error(result.error);
     * }
     * ```
     */
    eval(expression: string): EvalResult {
        this._check_initialized();
        const expr_ptr = this._alloc_string(expression);
        const result_ptr = this.module._dv_eval(expr_ptr);

        // Read result struct: struct { double value; int8_t unit[7]; bool success; char error[256]; }
        // Layout:
        // - value: 8 bytes (double) at offset 0
        // - unit: 7 bytes (int8_t[7]) at offset 8
        // - success: 1 byte (bool) at offset 15
        // - error: 256 bytes (char[256]) at offset 16

        const value = this.module.HEAPF64[result_ptr / 8];

        // Read the unit array (7 int8_t values)
        const unit: number[] = [];
        for (let i = 0; i < 7; i++) {
            unit.push(this.module.HEAP8[result_ptr + 8 + i]);
        }

        const success = this.module.HEAPU8[result_ptr + 15] !== 0;
        const error_ptr = result_ptr + 16;

        let result: EvalResult;
        if (success) {
            result = { success: true, value, unit };
        } else {
            const error_bytes = this.module.HEAPU8.subarray(error_ptr, error_ptr + 256);
            const null_index = error_bytes.indexOf(0);
            const error = this.text_decoder.decode(error_bytes.subarray(0, null_index));
            result = { success: false, error };
        }

        this.module._dv_free(expr_ptr);

        return result;
    }

    /**
     * Evaluate multiple expressions in a batch
     * @param expressions - Array of mathematical expressions
     * @returns Array of result objects
     * 
     * @example
     * ```typescript
     * const results = evaluator.eval_batch([
     *     'x = 5!',
     *     '2^2',
     *     'x + 4'
     * ]);
     * results.forEach((r, i) => {
     *     if (r.success) {
     *         console.log(`Expression ${i}: ${r.value}`);
     *     } else {
     *         console.error(`Expression ${i}: ${r.error}`);
     *     }
     * });
     * ```
     */
    /**
     * Evaluate multiple expressions in a batch
     * @param expressions - Array of mathematical expressions
     * @returns Array of result objects
     * 
     * @example
     * ```typescript
     * const results = evaluator.eval_batch([
     *     'x = 5!',
     *     '2^2',
     *     'x + 4'
     * ]);
     * results.forEach((r, i) => {
     *     if (r.success) {
     *         console.log(`Expression ${i}: ${r.value}`);
     *         console.log(`Unit ${i}: ${r.unit}`);
     *     } else {
     *         console.error(`Expression ${i}: ${r.error}`);
     *     }
     * });
     * ```
     */
    eval_batch(expressions: string[]): EvalResult[] {
        this._check_initialized();

        if (expressions.length === 0) {
            return [];
        }

        // Allocate array of string pointers
        const ptr_size = 4; // Assuming 32-bit pointers in WASM
        const array_ptr = this.module._malloc(expressions.length * ptr_size);
        const string_ptrs: number[] = [];

        try {
            // Allocate each string
            for (let i = 0; i < expressions.length; i++) {
                const str_ptr = this._alloc_string(expressions[i]);
                string_ptrs.push(str_ptr);
                this.module.HEAPU32[array_ptr / 4 + i] = str_ptr;
            }

            // Call batch evaluation
            const batch_ptr = this.module._dv_eval_batch(array_ptr, expressions.length);

            if (batch_ptr === 0) {
                throw new Error('Batch evaluation failed');
            }

            // Read batch result struct:
            // struct { double* values; int8_t** units; bool* successes; char** errors; int count; }
            const values_ptr = this.module.HEAPU32[batch_ptr / 4];
            const units_ptr = this.module.HEAPU32[batch_ptr / 4 + 1];
            const successes_ptr = this.module.HEAPU32[batch_ptr / 4 + 2];
            const errors_ptr = this.module.HEAPU32[batch_ptr / 4 + 3];
            const count = this.module.HEAP32[batch_ptr / 4 + 4];

            const results: EvalResult[] = [];
            for (let i = 0; i < count; i++) {
                const value = this.module.HEAPF64[values_ptr / 8 + i];
                const success = this.module.HEAPU8[successes_ptr + i] !== 0;

                // Read unit array for this expression
                const unit_array_ptr = this.module.HEAPU32[units_ptr / 4 + i];
                const unit: number[] = [];
                for (let j = 0; j < 7; j++) {
                    unit.push(this.module.HEAP8[unit_array_ptr + j]);
                }

                if (success) {
                    results.push({ success: true, value, unit });
                } else {
                    const error_str_ptr = this.module.HEAPU32[errors_ptr / 4 + i];
                    const error = this._read_string(error_str_ptr);
                    results.push({ success: false, error });
                }
            }

            // Cleanup batch result
            this.module._dv_free_batch_result(batch_ptr);

            return results;
        } finally {
            // Cleanup string allocations
            string_ptrs.forEach(ptr => this.module._dv_free(ptr));
            this.module._dv_free(array_ptr);
        }
    }


    // ========================================================================
    // Variables Management
    // ========================================================================

    /**
     * Get the value of a variable that was evaluated in an expression
     * @param name - The variable name
     * @returns The value if it exists, null otherwise
     * 
     * @example
     * ```typescript
     * evaluator.eval('x = 42');
     * const x = evaluator.get_variable('x');
     * console.log(x); // 42
     * ```
     */
    get_variable(name: string): number | null {
        this._check_initialized();
        const name_ptr = this._alloc_string(name);
        const value_ptr = this.module._malloc(8); // double = 8 bytes

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

    /**
     * Clear all evaluated variables
     */
    clear_variables(): void {
        this._check_initialized();
        this.module._dv_clear_variables();
    }

    /**
     * Get the number of evaluated variables
     */
    get_variable_count(): number {
        this._check_initialized();
        return this.module._dv_get_variable_count();
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Get the version of the evaluator
     */
    get_version(): string {
        const version_ptr = this.module._dv_version();
        return this._read_string(version_ptr);
    }

    /**
     * Reset the evaluator state (clear all constants and variables)
     */
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
}