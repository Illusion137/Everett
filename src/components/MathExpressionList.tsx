import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { v4 } from "uuid";
import MathExpressionEditor, { type MathExpressionEditorHandle } from "./MathExpressionEditor";

export interface MathExpressionListHandle {
	force_evaluate: () => void;
}

interface Expression {
	id: string;
	latex: string;
	unit_latex: string;
	evaluated_result?: string | null;
	evaluation_error?: string | null;
	has_unit_from_evaluation?: boolean;
}

// Placeholder for the external evaluation function
// This will be replaced by the actual __evaluate__ function later
const __evaluate__ = async (expressions: { id: string; latex: string; unit_latex: string }[]) => {
	console.log("Evaluating expressions:", expressions);
	// Simulate async evaluation
	return new Promise<
		{
			id: string;
			evaluated_result: string | null;
			evaluation_error: string | null;
			has_unit_from_evaluation: boolean;
			unit_latex: string;
		}[]
	>((resolve) => {
		setTimeout(() => {
			const results = expressions.map((exp) => {
				let evaluated_result: string | null = null;
				let evaluation_error: string | null = null;
				let has_unit_from_evaluation = false;
				let unit_latex = exp.unit_latex;

				// Simple dummy evaluation logic
				if ((exp.latex ?? "").includes("error")) {
					evaluation_error = "Syntax Error";
				} else if (exp.latex === "") {
					evaluated_result = null;
				} else if (exp.latex === "2+2") {
					evaluated_result = "4";
				} else if (exp.latex.includes("\\pi")) {
					evaluated_result = "3.14159";
					has_unit_from_evaluation = true;
					unit_latex = "\\text{rad}";
				} else if (exp.latex === "5\\text{cm}") {
					evaluated_result = "5";
					has_unit_from_evaluation = true;
					unit_latex = "\\text{cm}";
				} else {
					evaluated_result = exp.latex;
				}

				return {
					id: exp.id,
					evaluated_result,
					evaluation_error,
					has_unit_from_evaluation,
					unit_latex,
				};
			});
			resolve(results);
		}, 300);
	});
};

const MathExpressionList = forwardRef<MathExpressionListHandle, object>((_props, ref) => {
	const [expressions, set_expressions] = useState<Expression[]>(() => [{ id: v4(), latex: "", unit_latex: "" }]);
	const [focused_index, set_focused_index] = useState(0);
	const editor_refs = useRef<(MathExpressionEditorHandle | null)[]>([]);
	const [refresh_eval_trigger, set_refresh_eval_trigger] = useState(0);

	useImperativeHandle(ref, () => ({
		force_evaluate: () => {
			set_refresh_eval_trigger((prev) => prev + 1);
		},
	}));

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
							evaluated_result: result.evaluated_result,
							evaluation_error: result.evaluation_error,
							has_unit_from_evaluation: result.has_unit_from_evaluation,
							unit_latex: result.unit_latex,
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
			set_focused_index((prev_index) => {
				const index = expressions.findIndex((exp) => exp.id === id);
				if (index < expressions.length - 1) {
					return index + 1;
				}
				return prev_index;
			});
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
			editor_refs.current[focused_index]?.focus();
		}
	}, [focused_index]);

	const handle_cursor_left_out = useCallback(
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

	const handle_cursor_right_out = useCallback(
		(id: string) => {
			const current_expression = expressions.find((exp) => exp.id === id);
			const index = expressions.findIndex((exp) => exp.id === id);

			if (current_expression && (current_expression.initial_unit_latex !== "" || current_expression.has_unit_from_evaluation)) {
				// If current expression has a unit field, focus it
				editor_refs.current[index]?.focus_unit_field();
			} else {
				// Otherwise, move to the next expression
				set_focused_index((prev_index) => {
					if (index < expressions.length - 1) {
						return index + 1;
					}
					return prev_index;
				});
			}
		},
		[expressions]
	);

	const handle_cursor_left_out_unit = useCallback(
		(id: string) => {
			const index = expressions.findIndex((exp) => exp.id === id);
			editor_refs.current[index]?.focus(); // Focus the main field of the current editor
		},
		[expressions]
	);

	const handle_cursor_right_out_unit = useCallback(
		(id: string) => {
			set_focused_index((prev_index) => {
				const index = expressions.findIndex((exp) => exp.id === id);
				if (index < expressions.length - 1) {
					return index + 1;
				}
				return prev_index;
			});
		},
		[expressions]
	);

	return (
		<div>
			{expressions.map((exp, index) => (
				<MathExpressionEditor
					key={exp.id}
					ref={(el) => (editor_refs.current[index] = el)}
					initial_latex={exp.latex}
					initial_unit_latex={exp.unit_latex}
					is_focused={focused_index === index}
					evaluated_result={exp.evaluated_result}
					evaluation_error={exp.evaluation_error}
					has_unit_from_evaluation={exp.has_unit_from_evaluation}
					on_latex_change={(new_latex) => handle_latex_change(exp.id, new_latex)}
					on_unit_latex_change={(new_unit_latex) => handle_unit_latex_change(exp.id, new_unit_latex)}
					on_enter_pressed={() => handle_enter_pressed(exp.id)}
					on_arrow_up={() => handle_arrow_up(exp.id)}
					on_arrow_down={() => handle_arrow_down(exp.id)}
					on_backspace_pressed={() => handle_backspace_pressed(exp.id)}
					on_cursor_left_out={() => handle_cursor_left_out(exp.id)}
					on_cursor_right_out={() => handle_cursor_right_out(exp.id)}
					on_cursor_left_out_unit={() => handle_cursor_left_out_unit(exp.id)}
					on_cursor_right_out_unit={() => handle_cursor_right_out_unit(exp.id)}
				/>
			))}
		</div>
	);
});

export default MathExpressionList;
