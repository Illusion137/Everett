import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { EditableMathField, StaticMathField, type MathField } from "react-mathquill";
import { latex_unit_splitter } from "../utils";

export interface MathExpressionEditorHandle {
	focus: () => void;
	focus_unit_field: () => void;
}

interface MathExpressionEditorProps {
	initial_latex: string;
	initial_unit_latex?: string;
	is_focused: boolean;
	evaluation_error?: string | null;
	evaluation_result_latex_string?: string;
	on_latex_change: (latex: string) => void;
	on_unit_latex_change: (unit_latex: string) => void;
	on_enter_pressed: () => void;
	on_arrow_up: () => void;
	on_arrow_down: () => void;
	on_backspace_pressed?: () => void;
	on_click?: () => void;
}

const MathExpressionEditor = forwardRef<MathExpressionEditorHandle, MathExpressionEditorProps>(
	(
		{
			initial_latex = "",
			initial_unit_latex = "",
			is_focused,
			evaluation_error,
			evaluation_result_latex_string = "",
			on_latex_change,
			on_unit_latex_change,
			on_enter_pressed,
			on_arrow_up,
			on_arrow_down,
			on_backspace_pressed,
			on_click,
		},
		ref
	) => {
		const [math_latex, set_math_latex] = useState(initial_latex);
		const [unit_latex, set_unit_latex] = useState(initial_unit_latex);
		const previous_math_latex_ref = useRef("");
		const math_field_ref = useRef<MathField | null>(null);
		const unit_math_field_ref = useRef<MathField | null>(null);
		const container_ref = useRef<HTMLDivElement>(null);

		const on_arrow_down_ref = useRef(on_arrow_down);
		const on_arrow_up_ref = useRef(on_arrow_up);
		const on_enter_pressed_ref = useRef(on_enter_pressed);
		const on_backspace_pressed_ref = useRef(on_backspace_pressed);

		useEffect(() => {
			on_arrow_down_ref.current = on_arrow_down;
			on_arrow_up_ref.current = on_arrow_up;
			on_enter_pressed_ref.current = on_enter_pressed;
			on_backspace_pressed_ref.current = on_backspace_pressed;
		}, [on_arrow_down, on_arrow_up, on_enter_pressed, on_backspace_pressed]);

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

		function focus_nearest_input(x: number) {
			if (!container_ref.current) return;
			const rect = container_ref.current.getBoundingClientRect();
			const relative_x = x - rect.left;
			const ratio = relative_x / rect.width;
			const left_percentage = 0.85;
			if (ratio <= left_percentage) math_field_ref.current?.focus();
			else unit_math_field_ref.current?.focus();
		}

		return (
			<div className="flex items-center w-full">
				<div
					ref={container_ref}
					className={`cursor-pointer flex-1 flex items-center transition-all duration-200 py-3 px-4 text-lg border ${
						is_focused ? "border-purple-500 shadow-purple-300 shadow-md" : "border-gray-300"
					}`}
					onClick={(e) => {
						focus_nearest_input(e.clientX);
						on_click?.();
					}}
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
								autoOperatorNames: "ln sin cos tan sec csc cot log abs nCr nPr ceil fact floor round arcsin arccos arctan arcsec arccsc arccot val unit",
								handlers: {
									moveOutOf(direction) {
										if (direction === 1) unit_math_field_ref.current?.focus();
									},
									enter() {
										on_enter_pressed_ref.current?.();
									},
									deleteOutOf() {
										on_backspace_pressed_ref.current?.();
									},
									upOutOf() {
										on_arrow_up_ref.current?.();
									},
									downOutOf() {
										on_arrow_down_ref.current();
									},
								},
							}}
							onChange={(mathField) => {
								previous_math_latex_ref.current = math_latex;
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
						{evaluation_error && math_latex.trim() ? (
							<div className="flex items-center gap-2 text-red-600 text-sm">
								<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
								<span className="truncate" title={evaluation_error}>
									{evaluation_error}
								</span>
							</div>
						) : math_latex.trim() ? (
							<span className="flex items-center gap-2">
								<span className="text-sm text-gray-700">=</span>
								<StaticMathField>{evaluation_result_latex_string}</StaticMathField>
							</span>
						) : null}
					</div>

					{/* Unit Editor (on the far right) */}
					<div className="ml-4 flex-shrink-0">
						<div>
							<EditableMathField
								className="mathquill-unit-field"
								mathquillDidMount={(mathField) => {
									unit_math_field_ref.current = mathField;
								}}
								config={{
									spaceBehavesLikeTab: true,
									autoCommands: "mu",
									handlers: {
										moveOutOf(direction) {
											if (direction === -1) math_field_ref.current?.focus();
										},
										deleteOutOf() {
											on_backspace_pressed_ref.current?.();
										},
										enter() {
											on_enter_pressed_ref.current?.();
										},
										upOutOf() {
											on_arrow_up_ref.current?.();
										},
										downOutOf() {
											on_arrow_down_ref.current?.();
										},
									},
								}}
								latex={unit_latex}
								onChange={(mathField) => {
									const new_unit_latex = mathField?.latex() ?? "";
									set_unit_latex(new_unit_latex);
									on_unit_latex_change(latex_unit_splitter(new_unit_latex));
								}}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}
);

export default MathExpressionEditor;
