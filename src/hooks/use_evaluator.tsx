// src/hooks/use_evaluator.ts
import { useEffect, useState } from "react";
import { DimensionalEvaluator, type WasmModule } from "../dimension_wasm_interface";

interface UseEvaluatorOptions {
	default_constants?: Record<string, [string, string]>;
}

interface UseEvaluatorReturn {
	evaluator: DimensionalEvaluator | null;
	is_loading: boolean;
	is_ready: boolean;
	error: Error | null;
}

declare global {
	interface Window {
		Module?: () => Promise<WasmModule>;
	}
}

let glob_eval: DimensionalEvaluator;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rcast<T>(a: any) {
	return a as T;
}

export function useEvaluator(options: UseEvaluatorOptions = {}): UseEvaluatorReturn {
	const { default_constants = {} } = options;

	const [state, set_state] = useState({
		evaluator: null as DimensionalEvaluator | null,
		is_loading: true,
		is_ready: false,
		error: null as Error | null,
	});

	useEffect(() => {
		let mounted = true;
		let local_evaluator: DimensionalEvaluator | null = null;
		const init = async () => {
			try {
				if (glob_eval) {
					set_state({
						evaluator: glob_eval,
						is_loading: false,
						is_ready: true,
						error: null,
					});
					Object.entries(default_constants).forEach(([name, expression]) => {
						glob_eval!.set_constant(name, expression[0], expression[1]);
					});
					return;
				}
				// Check for existing global instance (handles StrictMode)
				if (window.Module) {
					if (mounted) {
						glob_eval = new DimensionalEvaluator(await window.Module());
						set_state({
							evaluator: glob_eval,
							is_loading: false,
							is_ready: true,
							error: null,
						});
						Object.entries(default_constants).forEach(([name, expression]) => {
							glob_eval!.set_constant(name, expression[0], expression[1]);
						});
					}
					return;
				}

				// Wait for WASM module
				let attempts = 0;
				while (!window.Module && attempts < 100) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					attempts++;
				}

				if (!window.Module) {
					throw new Error("WASM module not loaded");
				}

				if (!mounted) return;

				// Initialize module
				const wasm_module: WasmModule = typeof window.Module === "function" ? await rcast<{ Module: () => Promise<WasmModule> }>(window).Module() : await window.Module;

				if (!mounted) return;

				// Create evaluator
				local_evaluator = new DimensionalEvaluator(wasm_module);

				// Set constants
				Object.entries(default_constants).forEach(([name, expression]) => {
					local_evaluator!.set_constant(name, expression[0], expression[1]);
				});

				// Store globally (survives StrictMode remounts)
				window.Module = rcast(local_evaluator);

				if (mounted) {
					set_state({
						evaluator: local_evaluator,
						is_loading: false,
						is_ready: true,
						error: null,
					});
				}
			} catch (err) {
				if (mounted) {
					set_state({
						evaluator: null,
						is_loading: false,
						is_ready: false,
						error: err instanceof Error ? err : new Error(String(err)),
					});
				}
			}
		};

		init();

		return () => {
			mounted = false;
			// Don't destroy - let it persist globally
		};
	}, []); // Run once

	return state;
}
