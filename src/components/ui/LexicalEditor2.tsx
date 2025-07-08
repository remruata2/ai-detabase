"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
	$getRoot,
	LexicalEditor as LexicalEditorInstance,
	TextNode,
	ParagraphNode,
} from "lexical";

// Minimal theme - just basic styling
const SimpleTheme = {
	paragraph: "simple-paragraph",
	text: {
		bold: "simple-bold",
		italic: "simple-italic",
	},
};

// Only the most essential nodes
const editorNodes = [ParagraphNode, TextNode];

interface LexicalEditor2Props {
	initialHtml?: string | null;
	onChange: (html: string) => void;
	editable?: boolean;
}

// Plugin to handle initial HTML content
function InitialContentPlugin({ initialHtml }: { initialHtml: string }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!initialHtml) return;

		editor.update(() => {
			const parser = new DOMParser();
			const dom = parser.parseFromString(initialHtml, "text/html");
			const nodes = $generateNodesFromDOM(editor, dom);
			$getRoot().select();
			$getRoot().clear();
			$getRoot().append(...nodes);
		});
	}, [editor, initialHtml]);

	return null;
}

// Plugin to handle onChange events
function OnChangePlugin({ onChange }: { onChange: (html: string) => void }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const htmlString = $generateHtmlFromNodes(editor, null);
				onChange(htmlString);
			});
		});
	}, [editor, onChange]);

	return null;
}

export default function LexicalEditor2({
	initialHtml,
	onChange,
	editable = true,
}: LexicalEditor2Props) {
	const initialConfig = {
		namespace: "SimpleLexicalEditor",
		theme: SimpleTheme,
		nodes: editorNodes,
		onError: (error: Error) => {
			console.error("Lexical Error:", error);
		},
		editable: editable,
	};

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<div className="simple-editor-container">
				<style jsx>{`
					.simple-editor-container {
						width: 100%;
						border: 1px solid #e2e8f0;
						border-radius: 8px;
						background: white;
					}
					.simple-editor-input {
						min-height: 180px;
						padding: 16px;
						outline: none;
						border: none;
						font-size: 16px;
						font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
							sans-serif;
						line-height: 1.6;
						color: #1a202c;
						resize: none;
						width: 100%;
						box-sizing: border-box;
					}
					.simple-editor-placeholder {
						color: #a0aec0;
						pointer-events: none;
						position: absolute;
						padding: 16px;
						font-size: 16px;
					}
					.simple-paragraph {
						margin: 0;
						padding: 0;
					}
					.simple-bold {
						font-weight: bold;
					}
					.simple-italic {
						font-style: italic;
					}
				`}</style>

				<RichTextPlugin
					contentEditable={
						<ContentEditable
							className="simple-editor-input"
							spellCheck={false}
							autoCorrect="off"
							autoComplete="off"
						/>
					}
					placeholder={
						<div className="simple-editor-placeholder">Enter your notes...</div>
					}
					ErrorBoundary={LexicalErrorBoundary}
				/>

				<HistoryPlugin />
				<OnChangePlugin onChange={onChange} />
				{initialHtml && <InitialContentPlugin initialHtml={initialHtml} />}
			</div>
		</LexicalComposer>
	);
}
