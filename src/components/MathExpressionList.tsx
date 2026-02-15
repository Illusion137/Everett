import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { v4 } from "uuid";
import { useEvaluator } from "../hooks/use_evaluator";
import { array_empty, unit_to_latex, type UnitDimension } from "../utils";
import MathExpressionEditor, { type MathExpressionEditorHandle } from "./MathExpressionEditor";

export interface MathExpressionListHandle {
	force_evaluate: () => void;
}

interface Expression {
	id: string;
	latex: string;
	unit_latex: string;
	evaluated_result?: number | null;
	evaluation_error?: string | null;
	evalulated_unit_latex?: string;
	forced_unit_latex?: string;
}

interface EvaluationResult {
	id: string;
	evaluated_result?: number;
	evaluation_error?: string;
	evalulated_unit_latex?: string;
	forced_unit_latex?: string;
	unit_latex?: string;
}

const MathExpressionList = forwardRef<MathExpressionListHandle, object>((_props, ref) => {
	const [expressions, set_expressions] = useState<Expression[]>(() => [{ id: v4(), latex: "", unit_latex: "" }]);
	const [focused_index, set_focused_index] = useState(0);
	const [refresh_eval_trigger, set_refresh_eval_trigger] = useState(0);
	const editor_refs = useRef<RefObject<MathExpressionEditorHandle>[]>([]);

	const { evaluator } = useEvaluator({
		default_constants: {
			e_c: ["1.602*10^{-19}", "\\C"],
			e_0: ["8.854187817*10^{-12}", "\\frac{\\F}{\\m}"],
			k: ["8.99*10^9", "\\frac{\\N\\m^2}{\\C^2}"],
			c: ["2.99792458*10^8", "\\frac{\\m}{\\s}"],
			m_e: ["9.1938*10^{-31}", "\\kg"],
			m_p: ["1.67262*10^{-27}", "\\kg"],
			N_A: ["6.022*10^{-23}", "\\mol^{-1}"],
		},
	});

	useImperativeHandle(ref, () => ({
		force_evaluate: () => {
			set_refresh_eval_trigger((prev) => prev + 1);
		},
	}));

	const __evaluate__ = useCallback(
		async (expr_list: Array<{ id: string; latex: string; unit_latex?: string }>): Promise<EvaluationResult[]> => {
			if (!evaluator) {
				return expr_list.map((exp) => ({
					id: exp.id,
					evaluation_error: "Evaluator not initialized",
				}));
			}

			try {
				// Extract just the latex expressions for batch evaluation
				const latex_expressions = expr_list.map((exp) => {
					if (!exp.unit_latex) return exp.latex;
					if (!exp.latex.includes("=")) return exp.latex;
					const split = exp.latex.split("=");
					if (split.length != 2) return exp.latex;
					return `${split?.[0] ?? ""} = \\left(${split?.[1] ?? ""}\\right)\\cdot${exp.unit_latex ?? "1"}`;
				});

				// console.log(latex_expressions);

				// Evaluate all expressions in one batch
				const eval_results = evaluator.eval_batch(latex_expressions);
				// Map results back to the original format with IDs
				return expr_list.map((exp, index) => {
					const result = eval_results[index];
					if (result.success) {
						return {
							id: exp.id,
							evaluated_result: result.value,
							evaluation_error: undefined,
							unit_latex: exp.unit_latex,
							evalulated_unit_latex: array_empty(result.unit ?? []) ? "" : unit_to_latex(result.unit as UnitDimension),
							forced_unit_latex: exp.unit_latex || array_empty(result.unit ?? []) ? "" : unit_to_latex(result.unit as UnitDimension),
						};
					} else {
						return {
							id: exp.id,
							evaluated_result: undefined,
							evaluation_error: result.error,
							unit_latex: exp.unit_latex,
							evalulated_unit_latex: "",
							forced_unit_latex: "",
						};
					}
				});
			} catch (error) {
				console.error("Batch evaluation failed:", error);
				return expr_list.map((exp) => ({
					id: exp.id,
					evaluation_error: error instanceof Error ? error.message : "Unknown error",
				}));
			}
		},
		[evaluator]
	);

	// Effect to handle evaluation when expressions change
	useEffect(() => {
		const evaluate_all_expressions = async () => {
			const results = await __evaluate__(
				expressions.map((exp) => ({
					id: exp.id,
					latex: exp.latex,
					unit_latex: exp.unit_latex,
				}))
			);

			set_expressions((prev_expressions) => {
				return prev_expressions.map((prev_exp) => {
					const result = results.find((res) => res.id === prev_exp.id);
					if (result) {
						return {
							...prev_exp,
							evaluated_result: result.evaluated_result ?? 0,
							evaluation_error: result.evaluation_error ?? null,
							forced_unit_latex: result.forced_unit_latex ?? "",
							evalulated_unit_latex: result.evalulated_unit_latex ?? "",
							unit_latex: result.unit_latex ?? prev_exp.latex,
						};
					}
					return prev_exp;
				});
			});
		};

		evaluate_all_expressions();
	}, [JSON.stringify(expressions.map((exp) => ({ id: exp.id, latex: exp.latex, unit_latex: exp.unit_latex }))), refresh_eval_trigger]);

	const handle_latex_change = useCallback((id: string, new_latex: string) => {
		set_expressions((prev_expressions) => {
			const updated_expressions = prev_expressions.map((exp) => (exp.id === id ? { ...exp, latex: new_latex } : exp));
			if (JSON.stringify(updated_expressions) !== JSON.stringify(prev_expressions)) {
				return updated_expressions;
			}
			return prev_expressions;
		});
	}, []);

	const handle_unit_latex_change = useCallback((id: string, new_unit_latex: string) => {
		set_expressions((prev_expressions) => {
			const updated_expressions = prev_expressions.map((exp) => (exp.id === id ? { ...exp, unit_latex: new_unit_latex } : exp));
			if (JSON.stringify(updated_expressions) !== JSON.stringify(prev_expressions)) {
				return updated_expressions;
			}
			return prev_expressions;
		});
	}, []);

	const handle_click = useCallback(
		(id: string) => {
			set_focused_index((prev_index) => {
				const index = expressions.findIndex((exp) => exp.id === id);
				if (index != -1) {
					return index;
				}
				return prev_index;
			});
		},
		[expressions]
	);

	const handle_enter_pressed = useCallback((id: string) => {
		set_expressions((prev_expressions) => {
			const index = prev_expressions.findIndex((exp) => exp.id === id);
			if (index !== -1) {
				if (!prev_expressions[index].latex.trim()) return prev_expressions;
				const new_expressions = [...prev_expressions];
				const new_id = v4(); // Simple ID generation
				new_expressions.splice(index + 1, 0, {
					id: new_id,
					latex: "",
					unit_latex: "",
				});
				set_focused_index(index + 1);
				return new_expressions;
			}
			return prev_expressions;
		});
	}, []);

	const handle_arrow_up = useCallback(
		(id: string) => {
			set_focused_index((prev_index) => {
				const index = expressions.findIndex((exp) => exp.id === id);
				if (index > 0) {
					return index - 1;
				}
				return prev_index;
			});
		},
		[expressions]
	);

	const handle_arrow_down = useCallback(
		(id: string) => {
			const current_index = expressions.findIndex((exp) => exp.id === id);
			if (current_index < expressions.length - 1) {
				set_focused_index(current_index + 1);
			}
		},
		[expressions]
	);

	const handle_backspace_pressed = useCallback(
		(id: string) => {
			set_expressions((prev_expressions) => {
				const index = prev_expressions.findIndex((exp) => exp.id === id);
				if (index !== -1) {
					if (prev_expressions.length === 1 && prev_expressions[0].id === id) {
						// If it's the last expression, clear its content instead of deleting it
						return prev_expressions.map((exp) => (exp.id === id ? { ...exp, latex: "", unit_latex: "" } : exp));
					} else {
						// Otherwise, delete the expression
						const new_expressions = [...prev_expressions];
						new_expressions.splice(index, 1);
						// Adjust focus after deletion
						if (index === focused_index) {
							set_focused_index(Math.max(0, index - 1));
						} else if (index < focused_index) {
							set_focused_index(focused_index - 1);
						}
						return new_expressions;
					}
				}
				return prev_expressions;
			});
		},
		[focused_index]
	);

	// Focus the editor when focused_index changes
	useEffect(() => {
		if (editor_refs.current[focused_index]) {
			editor_refs.current[focused_index]?.current.focus();
		}
	}, [focused_index]);

	return (
		<div className="w-full">
			{expressions.map((exp, index) => (
				<MathExpressionEditor
					key={exp.id}
					ref={editor_refs.current[index]}
					initial_latex={exp.latex}
					initial_unit_latex={exp.unit_latex}
					forced_unit_latex={exp.forced_unit_latex}
					is_focused={focused_index === index}
					evaluated_result={exp.evaluated_result}
					evalulated_unit_latex={exp.evalulated_unit_latex}
					evaluation_error={exp.evaluation_error}
					on_latex_change={(new_latex) => handle_latex_change(exp.id, new_latex)}
					on_unit_latex_change={(new_unit_latex) => handle_unit_latex_change(exp.id, new_unit_latex)}
					on_enter_pressed={() => handle_enter_pressed(exp.id)}
					on_arrow_up={() => handle_arrow_up(exp.id)}
					on_arrow_down={() => handle_arrow_down(exp.id)}
					on_backspace_pressed={() => handle_backspace_pressed(exp.id)}
					on_click={() => handle_click(exp.id)}
				/>
			))}
		</div>
	);
});

export default MathExpressionList;
