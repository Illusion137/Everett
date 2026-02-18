import { useEffect, useRef } from "react";
import { EditorManager } from "./editor-manager";
import "./style/style.css";

export default function Diptych() {
	const editorRef = useRef<HTMLDivElement>(null);
	const managerRef = useRef<EditorManager | null>(null);

	useEffect(() => {
		if (!editorRef.current) return;

		const manager = new EditorManager();
		managerRef.current = manager;
		manager.create(editorRef.current);

		return () => {
			manager.destroy();
			managerRef.current = null;
		};
	}, []);

	return <div ref={editorRef} />;
}
