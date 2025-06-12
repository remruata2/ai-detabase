"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import React from "react";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $createParagraphNode,
  $getRoot,
  LexicalEditor as LexicalEditorInstance,
  $getSelection,
  $isRangeSelection,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createTextNode,
  $isTextNode,
  TextNode,
  ParagraphNode,
} from "lexical";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";

// Nodes
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { AutoLinkNode } from "@lexical/link";

// Theme and Plugins
import { ExampleTheme } from "./ExampleTheme";
import ToolbarPlugin from "./plugins/ToolbarPlugin";

// SIMPLIFIED NODE CONFIGURATION - Only essential nodes
const editorNodes = [
  ParagraphNode,
  TextNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  LinkNode,
  AutoLinkNode,
];

interface LexicalEditorComponentProps {
  initialHtml?: string | null;
  onChange: (html: string) => void;
  editable?: boolean;
}

// Plugin to set initial HTML content
function InitialHtmlPlugin({ initialHtml }: { initialHtml: string }) {
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

// Plugin to propagate changes as HTML
function EditorOnChangePlugin({
  onChange,
}: {
  onChange: (html: string) => void;
}) {
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

// CURSOR POSITION FIX PLUGIN - Ensures proper text insertion order
function SimpleMergerPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    console.log("🔥🔥🔥 NEW SIMPLE MERGER STARTING! 🔥🔥🔥");

    const merger = () => {
      editor.update(() => {
        const root = $getRoot();
        const children = root.getChildren();

        if (children.length > 1) {
          console.log("🔥 MERGING NOW! Paragraphs:", children.length);
          const text = children.map((c) => c.getTextContent()).join("");
          console.log("🔥 MERGED TEXT:", text);

          root.clear();
          const p = $createParagraphNode();
          const t = $createTextNode(text);
          p.append(t);
          root.append(p);
          p.selectEnd();
        }
      });
    };

    const unregister = editor.registerUpdateListener(() => {
      setTimeout(merger, 10);
    });

    return unregister;
  }, [editor]);

  return null;
}

// Simple debugging component to show editor state
function DebugInfo() {
  const [editor] = useLexicalComposerContext();
  const [debugInfo, setDebugInfo] = React.useState<any>({});

  React.useEffect(() => {
    const updateDebugInfo = () => {
      const editorElement = editor.getRootElement();
      if (!editorElement) return;

      const spans = editorElement.querySelectorAll("span");
      const paragraphs = editorElement.querySelectorAll("p");

      setDebugInfo({
        totalSpans: spans.length,
        totalParagraphs: paragraphs.length,
        editorHTML: editorElement.innerHTML.substring(0, 200) + "...",
        spans: Array.from(spans)
          .slice(0, 3)
          .map((span, index) => ({
            index,
            textContent: span.textContent?.substring(0, 20),
            className: span.className,
            computedDisplay: getComputedStyle(span).display,
            computedWritingMode: getComputedStyle(span).writingMode,
            hasVerticalText:
              getComputedStyle(span).writingMode !== "horizontal-tb",
          })),
      });
    };

    const removeListener = editor.registerUpdateListener(() => {
      updateDebugInfo();
    });

    updateDebugInfo();

    return () => {
      removeListener();
    };
  }, [editor]);

  return (
    <div
      style={{
        padding: "10px",
        background: "#f0f0f0",
        marginBottom: "10px",
        fontSize: "12px",
        border: "1px solid #ccc",
        borderRadius: "4px",
      }}
    >
      <strong>🐛 Debug Info:</strong>
      <div>
        Spans: {debugInfo.totalSpans}, Paragraphs: {debugInfo.totalParagraphs}
      </div>
      <div>Recent spans: {JSON.stringify(debugInfo.spans, null, 2)}</div>
      <details>
        <summary>HTML Structure</summary>
        <pre style={{ fontSize: "10px", maxHeight: "100px", overflow: "auto" }}>
          {debugInfo.editorHTML}
        </pre>
      </details>
    </div>
  );
}

const placeholderText = "Enter notes...";

export default function LexicalEditor({
  initialHtml,
  onChange,
  editable = true,
}: LexicalEditorComponentProps) {
  // SIMPLIFIED CONFIGURATION
  const initialConfig = {
    namespace: "LexicalFileFormEditor",
    theme: ExampleTheme,
    nodes: editorNodes,
    onError: (error: Error, editor: LexicalEditorInstance) => {
      console.error("Lexical Error:", error, editor);
    },
    editable: editable,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container w-full" data-lexical-editor="true">
        <DebugInfo />
        <ToolbarPlugin />
        <div className="editor-inner">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="editor-input"
                style={{
                  minHeight: "180px",
                  padding: "12px",
                  outline: "none",
                  border: "none",
                  display: "block",
                  width: "100%",
                  writingMode: "horizontal-tb",
                  textOrientation: "mixed",
                  direction: "ltr",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "break-word",
                  wordBreak: "normal",
                  lineHeight: "1.6",
                  fontSize: "16px",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                }}
                spellCheck={false}
                autoCorrect="off"
                autoComplete="off"
              />
            }
            placeholder={
              <div className="editor-placeholder">{placeholderText}</div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <SimpleMergerPlugin />
          <EditorOnChangePlugin onChange={onChange} />
          {initialHtml && <InitialHtmlPlugin initialHtml={initialHtml} />}
        </div>
      </div>
    </LexicalComposer>
  );
}
