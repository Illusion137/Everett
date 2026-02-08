import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditableMathField, StaticMathField, type MathField } from "react-mathquill";

export interface MathExpressionEditorHandle {
	focus: () => void;
	focus_unit_field: () => void;
}

interface MathExpressionEditorProps {
	initial_latex: string;
	initial_unit_latex?: string;
	is_focused: boolean;
	evaluated_result?: string | null;
	evaluation_error?: string | null;
	has_unit_from_evaluation?: boolean;
	on_latex_change: (latex: string) => void;
	on_unit_latex_change: (unit_latex: string) => void;
	on_enter_pressed: () => void;
	on_arrow_up: () => void;
	on_arrow_down: () => void;
	on_backspace_pressed?: () => void;
	on_cursor_left_out?: () => void;
	on_cursor_right_out?: () => void;
	on_cursor_left_out_unit?: () => void;
	on_cursor_right_out_unit?: () => void;
}

const MathExpressionEditor = forwardRef<MathExpressionEditorHandle, MathExpressionEditorProps>(
	(
		{
			initial_latex = "",
			initial_unit_latex = "",
			is_focused,
			evaluated_result,
			evaluation_error,
			has_unit_from_evaluation,
			on_latex_change,
			on_unit_latex_change,
			on_enter_pressed,
			on_arrow_up,
			on_arrow_down,
			on_backspace_pressed,
		},
		ref
	) => {
		const [math_latex, set_math_latex] = useState(initial_latex);
		const [unit_latex, set_unit_latex] = useState(initial_unit_latex);
		const math_field_ref = useRef<MathField | null>(null);
		const unit_math_field_ref = useRef<MathField | null>(null);

		useImperativeHandle(ref, () => ({
			focus: () => {
				math_field_ref.current?.focus();
			},
			focus_unit_field: () => {
				unit_math_field_ref.current?.focus();
			},
		}));

		useEffect(() => {
			if (is_focused) {
				math_field_ref.current?.focus();
			}
		}, [is_focused]);

		const handle_key_down = (event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				event.preventDefault();
				on_enter_pressed();
			} else if (event.key === "ArrowUp") {
				event.preventDefault();
				on_arrow_up();
			} else if (event.key === "ArrowDown") {
				event.preventDefault();
				on_arrow_down();
			} else if (event.key === "Backspace" && math_field_ref?.current?.latex?.() === "") {
				event.preventDefault();
				on_backspace_pressed?.();
			}
		};

		return (
			<div className="flex items-center" onKeyDown={handle_key_down}>
				<div
					className={`flex-1 flex items-center transition-all duration-200 py-3 px-4 text-lg border ${is_focused ? "border-purple-500 shadow-purple-300 shadow-md" : "border-gray-300"}`}
					style={{
						minWidth: "200px",
					}}>
					{/* Expression Editor (takes most width) */}
					<div className="flex-grow">
						<EditableMathField
							className="mathquill-expression-field"
							mathquillDidMount={(mathField) => {
								math_field_ref.current = mathField;
							}}
							config={{
								spaceBehavesLikeTab: true,
								autoSubscriptNumerals: true,
								sumStartsWithNEquals: true,
								charsThatBreakOutOfSupSub: "+-=,",
								autoCommands: "pi theta sqrt sum int prod coprod nthroot alpha beta phi lambda sigma delta mu epsilon varepsilon Alpha Beta Phi Lambda Sigma Delta Mu Epsilon",
								autoOperatorNames: "ln sin cos tan sec csc cot log abs nCr nPr ciel fact floor round arcsin arccos arctan arcsec arccsc arccot",
								handlers: {
									moveOutOf(direction) {
										if (direction === 1) unit_math_field_ref.current?.focus();
									},
								},
							}}
							onChange={(mathField) => {
								const new_expression_latex = mathField?.latex() ?? "";
								set_math_latex(new_expression_latex);
								on_latex_change(new_expression_latex);
							}}
							latex={math_latex}
							onFocus={() => {}} // Focus managed by is_focused prop
							onBlur={() => {}} // Blur managed by is_focused prop
						/>
					</div>

					{/* Evaluation Result / Error */}
					<div className="ml-4 text-gray-700 flex items-center flex-shrink-0">
						{evaluation_error ? (
							<div className="flex items-center gap-2 text-red-600 text-sm">
								<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
								<span className="truncate" title={evaluation_error}>
									Warning
								</span>
							</div>
						) : evaluated_result ? (
							<span className="flex items-center gap-2">
								<span className="text-sm text-gray-700">=</span>
								<StaticMathField>{evaluated_result}</StaticMathField>
							</span>
						) : null}
					</div>

					{/* Unit Editor (on the far right) */}
					<div className="ml-4 flex-shrink-0">
						{has_unit_from_evaluation ? (
							<div className="text-gray-500">
								<StaticMathField>{initial_unit_latex}</StaticMathField>
							</div>
						) : (
							<div>
								<EditableMathField
									className="mathquill-unit-field"
									mathquillDidMount={(mathField) => {
										unit_math_field_ref.current = mathField;
									}}
									config={{
										spaceBehavesLikeTab: true,
										handlers: {
											moveOutOf(direction) {
												if (direction === -1) math_field_ref.current?.focus();
											},
										},
									}}
									latex={unit_latex}
									onChange={(mathField) => {
										const new_unit_latex = mathField?.latex() ?? "";
										set_unit_latex(new_unit_latex);
										on_unit_latex_change(new_unit_latex);
									}}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}
);

export default MathExpressionEditor;
