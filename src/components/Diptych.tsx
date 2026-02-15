import { defaultValueCtx, Editor, editorViewCtx, editorViewOptionsCtx, rootCtx } from "@milkdown/core";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { math } from "@milkdown/plugin-math";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { nord } from "@milkdown/theme-nord";
import "@milkdown/theme-nord/style.css";
import { invoke } from "@tauri-apps/api/core";
import "katex/dist/katex.min.css";
import { MathfieldElement } from "mathlive";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { addStyles, StaticMathField } from "react-mathquill";
import { PHYSICS_FORMULAS, unit_to_latex, units_equal, type Formula, type MarkdownEditorProps, type MarkdownEditorRef, type MathExpression } from "../utils";

// Add MathQuill styles
addStyles();

// Register MathLive custom element
if (!customElements.get("math-field")) {
	customElements.define("math-field", MathfieldElement);
}

// Extend JSX to recognize math-field element
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		interface IntrinsicElements {
			"math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
				ref?: React.Ref<MathfieldElement>;
			};
		}
	}
}

// Check if running in Tauri
const is_tauri = typeof window !== "undefined" && "__TAURI__" in window;

const Diptych = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({ file_path, on_save, on_formula_select, initial_content }, ref) => {
	const [content, set_content] = useState<string>(initial_content || "");
	const [text_search_query, set_text_search_query] = useState<string>("");
	const [formula_search_query, set_formula_search_query] = useState<string>("");
	const [show_math_popup, set_show_math_popup] = useState<boolean>(false);
	const [math_mode, set_math_mode] = useState<"inline" | "block">("inline");
	const [auto_search_expressions, set_auto_search_expressions] = useState<boolean>(false);
	const [filter_available_only, set_filter_available_only] = useState<boolean>(false);
	const [available_expressions, set_available_expressions] = useState<MathExpression[]>([]);
	const [is_loading, set_is_loading] = useState<boolean>(true);
	const [use_latex_search, set_use_latex_search] = useState<boolean>(false);
	const is_saving_ref = useRef<boolean>(false);
	const editor_ref = useRef<Editor | null>(null);

	const math_field_ref = useRef<MathfieldElement | null>(null);
	const text_search_math_ref = useRef<MathfieldElement | null>(null);
	const formula_search_math_ref = useRef<MathfieldElement | null>(null);
	const save_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load file from Tauri
	useEffect(() => {
		if (!is_tauri || !file_path) {
			set_is_loading(false);
			return;
		}

		const load_file = async () => {
			try {
				set_is_loading(true);
				const file_content: string = await invoke("read_file", {
					path: file_path,
				});

				set_content(file_content);
				set_is_loading(false);
			} catch (error) {
				console.error("Failed to load file:", error);
				set_is_loading(false);
			}
		};

		load_file();
	}, [file_path]);

	// Debounced save function
	const debounced_save = useCallback(
		(content_to_save: string) => {
			if (save_timeout_ref.current) {
				clearTimeout(save_timeout_ref.current);
			}

			save_timeout_ref.current = setTimeout(async () => {
				if (!file_path || !is_tauri) return;

				try {
					is_saving_ref.current = true;
					await invoke("write_file", {
						path: file_path,
						content: content_to_save,
					});
					on_save?.(content_to_save);
				} catch (error) {
					console.error("Failed to save file:", error);
				} finally {
					is_saving_ref.current = false;
				}
			}, 500);
		},
		[file_path, on_save]
	);

	// Download file for web
	const download_file = useCallback(() => {
		const blob = new Blob([content], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "NOTES.md";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [content]);

	// Milkdown editor setup
	const editor_instance = useEditor((root) => {
		return Editor.make()
			.config((ctx) => {
				ctx.set(rootCtx, root);
				ctx.set(defaultValueCtx, content);
				ctx.set(editorViewOptionsCtx, { editable: () => true });

				// Listen to markdown changes
				ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
					if (is_loading) return;
					if (is_saving_ref.current) return;

					set_content(markdown);
					if (is_tauri) {
						debounced_save(markdown);
					}
				});
			})
			.config(nord)
			.use(commonmark)
			.use(gfm)
			.use(math)
			.use(listener);
	}, []);

	// Store editor reference
	useEffect(() => {
		if (editor_instance?.editor) {
			editor_ref.current = editor_instance.editor;
		}
	}, [editor_instance]);

	// Get editor helper function
	const get = useCallback(() => {
		return editor_ref.current;
	}, []);

	// Update editor content when loaded from file
	useEffect(() => {
		if (!is_loading && editor_ref.current && content) {
			editor_ref.current.action((ctx) => {
				ctx.set(defaultValueCtx, content);
			});
		}
	}, [content, is_loading]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			const timeout = save_timeout_ref.current;
			if (timeout) {
				clearTimeout(timeout);
			}
		};
	}, []);

	// CMD+M shortcut handler
	useEffect(() => {
		const handle_keydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "m") {
				e.preventDefault();
				set_show_math_popup(true);
			}
		};

		window.addEventListener("keydown", handle_keydown);
		return () => window.removeEventListener("keydown", handle_keydown);
	}, []);

	// Handle math insertion
	const insert_math = useCallback(() => {
		if (!math_field_ref.current || !editor_ref.current) return;

		const latex = math_field_ref.current.value;
		if (!latex) return;

		const delimiters = math_mode === "inline" ? ["$", "$"] : ["$$\n", "\n$$"];
		const math_text = `${delimiters[0]}${latex}${delimiters[1]}`;

		editor_ref.current.action((ctx) => {
			const view = ctx.get(editorViewCtx);
			const { state } = view;
			const { tr } = state;
			tr.insertText(math_text);
			view.dispatch(tr);
		});

		set_show_math_popup(false);
		math_field_ref.current.value = "";
	}, [math_mode]);

	// Get actual search query (from text input or MathLive)
	const get_text_search_value = useCallback(() => {
		if (use_latex_search && text_search_math_ref.current) {
			return text_search_math_ref.current.value;
		}
		return text_search_query;
	}, [use_latex_search, text_search_query]);

	const get_formula_search_value = useCallback(() => {
		if (use_latex_search && formula_search_math_ref.current) {
			return formula_search_math_ref.current.value;
		}
		return formula_search_query;
	}, [use_latex_search, formula_search_query]);

	// Search formulas by unit dimensions with fuzzy matching
	const search_formulas_by_units = useCallback((query: string) => {
		if (!query.trim()) {
			return PHYSICS_FORMULAS;
		}

		const query_lower = query.toLowerCase();

		return PHYSICS_FORMULAS.filter((formula) => {
			const name_lower = formula.name.toLowerCase();
			const latex_lower = formula.latex.toLowerCase();
			const desc_lower = (formula.description || "").toLowerCase();

			// Simple fuzzy matching
			const matches_fuzzy = (text: string, query: string): boolean => {
				let query_index = 0;
				for (let i = 0; i < text.length && query_index < query.length; i++) {
					if (text[i] === query[query_index]) {
						query_index++;
					}
				}
				return query_index === query.length;
			};

			const substring_match = name_lower.includes(query_lower) || latex_lower.includes(query_lower) || desc_lower.includes(query_lower);
			const fuzzy_match = matches_fuzzy(name_lower, query_lower) || matches_fuzzy(latex_lower, query_lower);

			return substring_match || fuzzy_match;
		});
	}, []);

	// Search formulas based on available expressions
	const search_from_expressions = useCallback(
		(expressions: MathExpression[]) => {
			if (expressions.length === 0) {
				return PHYSICS_FORMULAS;
			}

			return PHYSICS_FORMULAS.filter((formula) => {
				const variable_units = Object.values(formula.variables);

				if (filter_available_only) {
					return variable_units.every((required_unit) => expressions.some((expr) => units_equal(expr.unit, required_unit)));
				}

				return variable_units.some((required_unit) => expressions.some((expr) => units_equal(expr.unit, required_unit)));
			});
		},
		[filter_available_only]
	);

	// Compute filtered formulas
	const filtered_formulas = useMemo(() => {
		const search_query = get_formula_search_value();

		if (auto_search_expressions && available_expressions.length > 0) {
			const expr_filtered = search_from_expressions(available_expressions);
			if (search_query.trim()) {
				return search_formulas_by_units(search_query).filter((f) => expr_filtered.includes(f));
			}
			return expr_filtered;
		} else if (search_query.trim()) {
			return search_formulas_by_units(search_query);
		}

		return PHYSICS_FORMULAS;
	}, [auto_search_expressions, available_expressions, get_formula_search_value, search_from_expressions, search_formulas_by_units]);

	// Handle formula click
	const handle_formula_click = useCallback(
		(formula: Formula) => {
			if (on_formula_select) {
				on_formula_select(formula.latex);
			} else if (editor_ref.current) {
				editor_ref.current.action((ctx) => {
					const view = ctx.get(editorViewCtx);
					const { state } = view;
					const { tr } = state;
					tr.insertText(`$$\n${formula.latex}\n$$`);
					view.dispatch(tr);
				});
			}
		},
		[on_formula_select]
	);

	// Imperative handle for external control
	useImperativeHandle(ref, () => ({
		search_formulas: (expressions: MathExpression[]) => {
			set_available_expressions(expressions);
		},
		clear_search: () => {
			set_text_search_query("");
			set_formula_search_query("");
		},
		get_content: () => content,
		set_content: (new_content: string) => {
			set_content(new_content);
			if (editor_ref.current) {
				editor_ref.current.action((ctx) => {
					ctx.set(defaultValueCtx, new_content);
				});
			}
		},
	}));

	// Apply markdown search filter via CSS
	const search_text_value = get_text_search_value();
	const has_search = search_text_value.trim().length > 0;

	// Generate CSS to hide non-matching blocks
	const search_css = useMemo(() => {
		if (!has_search || !content) return "";

		const search_lower = search_text_value.toLowerCase();
		const lines = content.split("\n");
		const matching_line_indices = new Set<number>();

		// Find matching lines with fuzzy search
		lines.forEach((line, idx) => {
			const line_lower = line.toLowerCase();

			// Fuzzy match
			let query_index = 0;
			for (let i = 0; i < line_lower.length && query_index < search_lower.length; i++) {
				if (line_lower[i] === search_lower[query_index]) {
					query_index++;
				}
			}
			const fuzzy_match = query_index === search_lower.length;

			// Substring match
			const substring_match = line_lower.includes(search_lower);

			if (fuzzy_match || substring_match) {
				matching_line_indices.add(idx);
			}
		});

		if (matching_line_indices.size === 0) {
			return "";
		}

		// Hide all blocks by default, show only matching ones
		let css = `.milkdown .paragraph, .milkdown .heading { display: none; }\n`;

		// Show matching blocks
		matching_line_indices.forEach((idx) => {
			css += `.milkdown > :nth-child(${idx + 1}) { display: block !important; }\n`;
		});

		return css;
	}, [has_search, search_text_value, content]);

	if (is_loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-gray-500">Loading file...</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full w-full bg-white">
			{/* Dynamic search CSS */}
			{search_css && <style>{search_css}</style>}

			{/* Search Controls */}
			<div className="border-b border-gray-200 p-4 space-y-3 bg-gray-50">
				{/* LaTeX Search Toggle */}
				<div className="flex items-center justify-between">
					<label className="flex items-center gap-2 cursor-pointer text-sm">
						<input
							type="checkbox"
							checked={use_latex_search}
							onChange={(e) => set_use_latex_search(e.target.checked)}
							className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
						/>
						<span className="text-gray-700">Use LaTeX Search Mode</span>
					</label>
					{!is_tauri && (
						<button onClick={download_file} className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
							Download Notes
						</button>
					)}
				</div>

				{/* Text Search */}
				<div className="flex items-center gap-2">
					{use_latex_search ? (
						<math-field ref={text_search_math_ref} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
					) : (
						<input
							type="text"
							placeholder="Search in markdown..."
							value={text_search_query}
							onChange={(e) => set_text_search_query(e.target.value)}
							className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					)}
					{(text_search_query || (use_latex_search && text_search_math_ref.current?.value)) && (
						<button
							onClick={() => {
								set_text_search_query("");
								if (text_search_math_ref.current) {
									text_search_math_ref.current.value = "";
								}
							}}
							className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
							Clear
						</button>
					)}
				</div>

				{/* Formula Search */}
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						{use_latex_search ? (
							<math-field ref={formula_search_math_ref} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
						) : (
							<input
								type="text"
								placeholder="Search formulas (e.g., 'capacitor energy')..."
								value={formula_search_query}
								onChange={(e) => set_formula_search_query(e.target.value)}
								className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
							/>
						)}
						<button
							onClick={() => {
								set_formula_search_query("");
								if (formula_search_math_ref.current) {
									formula_search_math_ref.current.value = "";
								}
							}}
							className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800">
							Clear
						</button>
					</div>

					{/* Toggles */}
					<div className="flex items-center gap-4 text-sm">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={auto_search_expressions}
								onChange={(e) => set_auto_search_expressions(e.target.checked)}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span className="text-gray-700">Auto-search from expressions</span>
						</label>
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={filter_available_only}
								onChange={(e) => set_filter_available_only(e.target.checked)}
								className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span className="text-gray-700">Only show available formulas</span>
						</label>
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Milkdown Editor */}
				<div className="flex-1 overflow-y-auto">
					<MilkdownProvider>
						<Milkdown />
					</MilkdownProvider>
				</div>

				{/* Formula Sidebar */}
				<div className="w-96 border-l border-gray-200 overflow-y-auto bg-gray-50 p-4">
					<h3 className="font-semibold text-lg mb-4 text-gray-800">Formulas ({filtered_formulas.length})</h3>
					<div className="space-y-3">
						{filtered_formulas.map((formula) => (
							<div
								key={formula.id}
								className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
								onClick={() => handle_formula_click(formula)}>
								<div className="font-medium text-sm text-gray-900 mb-1">{formula.name}</div>
								<div className="bg-gray-100 p-2 rounded mb-2 flex items-center justify-center">
									<StaticMathField>{formula.latex}</StaticMathField>
								</div>
								{formula.description && <div className="text-xs text-gray-600 mb-2">{formula.description}</div>}
								<div className="flex items-center gap-1">
									<span className="text-xs text-gray-500">Result: </span>
									<StaticMathField className="text-xs">{unit_to_latex(formula.result_unit)}</StaticMathField>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Math Popup - Transparent overlay */}
			{show_math_popup && (
				<div className="fixed inset-0 flex items-end justify-center z-50" onClick={() => set_show_math_popup(false)}>
					<div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-gray-800">Math Editor</h3>
							<div className="flex items-center gap-3">
								<label className="flex items-center gap-2 text-sm">
									<input type="radio" name="math_mode" checked={math_mode === "inline"} onChange={() => set_math_mode("inline")} className="text-blue-600 focus:ring-blue-500" />
									<span>Inline ($)</span>
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input type="radio" name="math_mode" checked={math_mode === "block"} onChange={() => set_math_mode("block")} className="text-blue-600 focus:ring-blue-500" />
									<span>Block ($$)</span>
								</label>
								<button onClick={() => set_show_math_popup(false)} className="text-gray-400 hover:text-gray-600 p-1">
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						</div>

						<math-field ref={math_field_ref} className="w-full p-4 border-2 border-gray-300 rounded-lg text-2xl" style={{ fontSize: "24px" }} />

						<div className="flex justify-end gap-2 mt-4">
							<button onClick={() => set_show_math_popup(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
								Cancel
							</button>
							<button onClick={insert_math} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
								Insert
							</button>
						</div>
					</div>
				</div>
			)}

			<style>{`
          .animate-slide-up {
            animation: slideUp 0.3s ease-out;
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          /* Milkdown Nord theme customization */
          .milkdown {
            padding: 2rem;
            min-height: 500px;
          }

          .milkdown .editor {
            outline: none;
          }

          /* Math styling */
          .milkdown .math-inline,
          .milkdown .math-display {
            cursor: default;
          }
        `}</style>
		</div>
	);
});

Diptych.displayName = "MarkdownEditor";

export default Diptych;
