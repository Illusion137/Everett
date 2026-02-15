import "@milkdown/theme-nord/style.css";
import "katex/dist/katex.min.css";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { MathfieldElement } from "mathlive";
import { forwardRef, type FC } from "react";
import { addStyles } from "react-mathquill";
import { type MarkdownEditorProps, type MarkdownEditorRef } from "../utils";
import { Editor, rootCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { listener } from "@milkdown/plugin-listener";
import { math } from "@milkdown/plugin-math";
import { gfm } from "@milkdown/preset-gfm";

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

const CrepeEditor: FC = () => {
	const { get } = useEditor((root) =>
		Editor.make()
			.config(nord)
			.config((ctx) => {
				ctx.set(rootCtx, root);
			})
			.use(commonmark)
			.use(gfm)
			.use(math)
			.use(listener)
	);

	return <Milkdown />;
};

const DiptychV2 = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(({ file_path, on_save, on_formula_select, initial_content }, ref) => {
	return (
		<MilkdownProvider>
			<CrepeEditor />
		</MilkdownProvider>
	);
});

export default DiptychV2;
