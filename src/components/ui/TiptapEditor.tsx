"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import BulletList from "@tiptap/extension-bullet-list";
import Heading from "@tiptap/extension-heading";
import { useEffect, useCallback, useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Code,
  Quote,
  Table as TableIcon,
  Undo,
  Redo,
  Highlighter,
  Palette,
} from "lucide-react";

interface TiptapEditorProps {
  initialHtml?: string | null;
  onChange: (html: string) => void;
  editable?: boolean;
}

// Toolbar component
function EditorToolbar({ editor }: { editor: any }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const colors = [
    "#000000",
    "#434343",
    "#666666",
    "#999999",
    "#b7b7b7",
    "#cccccc",
    "#d9d9d9",
    "#efefef",
    "#f3f3f3",
    "#ffffff",
    "#980000",
    "#ff0000",
    "#ff9900",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#4a86e8",
    "#0000ff",
    "#9900ff",
    "#ff00ff",
    "#e6b8af",
    "#f4cccc",
    "#fce5cd",
    "#fff2cc",
    "#d9ead3",
    "#d0e0e3",
    "#c9daf8",
    "#cfe2f3",
    "#d9d2e9",
    "#ead1dc",
    "#dd7e6b",
    "#ea9999",
    "#f9cb9c",
    "#ffe599",
    "#b6d7a8",
    "#a2c4c9",
    "#a4c2f4",
    "#9fc5e8",
    "#b4a7d6",
    "#d5a6bd",
    "#cc4125",
    "#e06666",
    "#f6b26b",
    "#ffd966",
    "#93c47d",
    "#76a5af",
    "#6d9eeb",
    "#6fa8dc",
    "#8e7cc3",
    "#c27ba0",
    "#a61c00",
    "#cc0000",
    "#e69138",
    "#f1c232",
    "#6aa84f",
    "#45818e",
    "#3c78d8",
    "#3d85c6",
    "#674ea7",
    "#a64d79",
    "#85200c",
    "#990000",
    "#b45f06",
    "#bf9000",
    "#38761d",
    "#134f5c",
    "#1155cc",
    "#0b5394",
    "#351c75",
    "#741b47",
    "#5b0f00",
    "#660000",
    "#783f04",
    "#7f6000",
    "#274e13",
    "#0c343d",
    "#1c4587",
    "#073763",
    "#20124d",
    "#4c1130",
  ];

  const highlights = [
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#ff00ff",
    "#ff0000",
    "#0000ff",
    "#fff2cc",
    "#d9ead3",
    "#d0e0e3",
    "#ead1dc",
    "#fce5cd",
    "#c9daf8",
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
      {/* Undo/Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Undo"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Redo"
      >
        <Redo size={16} />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      {/* Headings */}
      <select
        onChange={(e) => {
          const level = parseInt(e.target.value);
          if (level === 0) {
            editor.chain().focus().setParagraph().run();
          } else {
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
        value={
          editor.isActive("heading", { level: 1 })
            ? 1
            : editor.isActive("heading", { level: 2 })
            ? 2
            : editor.isActive("heading", { level: 3 })
            ? 3
            : editor.isActive("heading", { level: 4 })
            ? 4
            : editor.isActive("heading", { level: 5 })
            ? 5
            : editor.isActive("heading", { level: 6 })
            ? 6
            : 0
        }
        className="px-2 py-1 border border-gray-300 rounded text-sm"
      >
        <option value={0}>Paragraph</option>
        <option value={1}>Heading 1</option>
        <option value={2}>Heading 2</option>
        <option value={3}>Heading 3</option>
        <option value={4}>Heading 4</option>
        <option value={5}>Heading 5</option>
        <option value={6}>Heading 6</option>
      </select>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      {/* Text Formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("bold") ? "bg-blue-200" : ""
        }`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("italic") ? "bg-blue-200" : ""
        }`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("underline") ? "bg-blue-200" : ""
        }`}
        title="Underline"
      >
        <UnderlineIcon size={16} />
      </button>

      {/* Text Color */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded hover:bg-gray-200"
          title="Text Color"
        >
          <Palette size={16} />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 w-64">
            <div className="grid grid-cols-10 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          onClick={() => setShowHighlightPicker(!showHighlightPicker)}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive("highlight") ? "bg-blue-200" : ""
          }`}
          title="Highlight"
        >
          <Highlighter size={16} />
        </button>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-2 w-32">
            <div className="grid grid-cols-6 gap-1">
              {highlights.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color }).run();
                    setShowHighlightPicker(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("bulletList") ? "bg-blue-200" : ""
        }`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("orderedList") ? "bg-blue-200" : ""
        }`}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: "left" }) ? "bg-blue-200" : ""
        }`}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: "center" }) ? "bg-blue-200" : ""
        }`}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: "right" }) ? "bg-blue-200" : ""
        }`}
        title="Align Right"
      >
        <AlignRight size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive({ textAlign: "justify" }) ? "bg-blue-200" : ""
        }`}
        title="Justify"
      >
        <AlignJustify size={16} />
      </button>

      <div className="h-6 w-px bg-gray-300 mx-1" />

      {/* Link */}
      <button
        onClick={addLink}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("link") ? "bg-blue-200" : ""
        }`}
        title="Add Link"
      >
        <LinkIcon size={16} />
      </button>

      {/* Code */}
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("code") ? "bg-blue-200" : ""
        }`}
        title="Inline Code"
      >
        <Code size={16} />
      </button>

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-gray-200 ${
          editor.isActive("blockquote") ? "bg-blue-200" : ""
        }`}
        title="Quote"
      >
        <Quote size={16} />
      </button>

      {/* Table */}
      <button
        onClick={addTable}
        className="p-2 rounded hover:bg-gray-200"
        title="Insert Table"
      >
        <TableIcon size={16} />
      </button>
    </div>
  );
}

export default function TiptapEditor({
  initialHtml,
  onChange,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default extensions we'll configure separately
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Placeholder.configure({
        placeholder: "Enter your notes...",
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: "list-disc list-inside",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "list-decimal list-inside",
        },
      }),
      ListItem,
    ],
    content: initialHtml || "",
    editable: editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        spellcheck: "false",
      },
      // Clean up pasted content to handle problematic images
      transformPastedHTML: (html) => {
        // Remove images with problematic src attributes
        return html.replace(
          /<img[^>]*src=["'](?:file:\/\/|mhtml:|data:image\/(?!(?:png|jpg|jpeg|gif|webp|svg)))[^"']*["'][^>]*>/gi,
          "<p><em>[Image removed - please upload images separately]</em></p>"
        );
      },
    },
  });

  // Update content when initialHtml changes
  useEffect(() => {
    if (editor && initialHtml !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== initialHtml) {
        editor.commands.setContent(initialHtml || "");
      }
    }
  }, [editor, initialHtml]);

  // Debug logging
  useEffect(() => {
    if (editor) {
      console.log("🔥 TiptapEditor initialized:", {
        isEditable: editor.isEditable,
        extensions: editor.extensionManager.extensions.map((ext) => ext.name),
      });
    }
  }, [editor]);

  return (
    <div className="w-full border border-gray-300 rounded-lg bg-white tiptap-container">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .tiptap-container .ProseMirror {
            outline: none;
            padding: 16px;
            min-height: 180px;
            font-size: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
            line-height: 1.6;
            color: #1a202c;
          }
          
          /* Paragraphs */
          .tiptap-container .ProseMirror p {
            margin: 0 0 8px 0;
            padding: 0;
          }
          
          .tiptap-container .ProseMirror p:last-child {
            margin-bottom: 0;
          }
          
          /* Placeholder */
          .tiptap-container .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #a0aec0;
            pointer-events: none;
            height: 0;
          }
          
          /* Text formatting */
          .tiptap-container .ProseMirror strong {
            font-weight: bold;
          }
          
          .tiptap-container .ProseMirror em {
            font-style: italic;
          }
          
          .tiptap-container .ProseMirror u {
            text-decoration: underline;
          }
          
          /* Headings */
          .tiptap-container .ProseMirror h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.2;
          }
          
          .tiptap-container .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.3;
          }
          
          .tiptap-container .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.4;
          }
          
          .tiptap-container .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.4;
          }
          
          .tiptap-container .ProseMirror h5 {
            font-size: 1rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.5;
          }
          
          .tiptap-container .ProseMirror h6 {
            font-size: 0.875rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.5;
          }
          
          /* Lists */
          .tiptap-container .ProseMirror ul {
            margin: 8px 0;
            padding-left: 20px;
          }
          
          .tiptap-container .ProseMirror ol {
            margin: 8px 0;
            padding-left: 20px;
          }
          
          .tiptap-container .ProseMirror li {
            margin: 4px 0;
          }
          
          .tiptap-container .ProseMirror ul li {
            list-style-type: disc;
          }
          
          .tiptap-container .ProseMirror ol li {
            list-style-type: decimal;
          }
          
          /* Links */
          .tiptap-container .ProseMirror a {
            color: #3b82f6;
            text-decoration: underline;
          }
          
          .tiptap-container .ProseMirror a:hover {
            color: #1d4ed8;
          }
          
          /* Tables */
          .tiptap-container .ProseMirror table {
            border-collapse: collapse;
            margin: 16px 0;
            width: 100%;
          }
          
          .tiptap-container .ProseMirror table td,
          .tiptap-container .ProseMirror table th {
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            vertical-align: top;
          }
          
          .tiptap-container .ProseMirror table th {
            background-color: #f9fafb;
            font-weight: bold;
          }
          
          /* Images */
          .tiptap-container .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 8px 0;
            border: 1px solid #e5e7eb;
          }
          
          .tiptap-container .ProseMirror img[src=""],
          .tiptap-container .ProseMirror img:not([src]) {
            display: none;
          }
          
          /* Image error handling */
          .tiptap-container .ProseMirror img:broken {
            display: none;
          }
          
          /* Highlighting */
          .tiptap-container .ProseMirror mark {
            background-color: #fef08a;
            padding: 1px 2px;
            border-radius: 2px;
          }
          
          /* Text alignment */
          .tiptap-container .ProseMirror p[style*="text-align: center"],
          .tiptap-container .ProseMirror h1[style*="text-align: center"],
          .tiptap-container .ProseMirror h2[style*="text-align: center"],
          .tiptap-container .ProseMirror h3[style*="text-align: center"],
          .tiptap-container .ProseMirror h4[style*="text-align: center"],
          .tiptap-container .ProseMirror h5[style*="text-align: center"],
          .tiptap-container .ProseMirror h6[style*="text-align: center"] {
            text-align: center;
          }
          
          .tiptap-container .ProseMirror p[style*="text-align: right"],
          .tiptap-container .ProseMirror h1[style*="text-align: right"],
          .tiptap-container .ProseMirror h2[style*="text-align: right"],
          .tiptap-container .ProseMirror h3[style*="text-align: right"],
          .tiptap-container .ProseMirror h4[style*="text-align: right"],
          .tiptap-container .ProseMirror h5[style*="text-align: right"],
          .tiptap-container .ProseMirror h6[style*="text-align: right"] {
            text-align: right;
          }
          
          .tiptap-container .ProseMirror p[style*="text-align: justify"],
          .tiptap-container .ProseMirror h1[style*="text-align: justify"],
          .tiptap-container .ProseMirror h2[style*="text-align: justify"],
          .tiptap-container .ProseMirror h3[style*="text-align: justify"],
          .tiptap-container .ProseMirror h4[style*="text-align: justify"],
          .tiptap-container .ProseMirror h5[style*="text-align: justify"],
          .tiptap-container .ProseMirror h6[style*="text-align: justify"] {
            text-align: justify;
          }
          
          /* Code blocks */
          .tiptap-container .ProseMirror pre {
            background-color: #f3f4f6;
            padding: 12px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            margin: 8px 0;
            overflow-x: auto;
          }
          
          .tiptap-container .ProseMirror code {
            background-color: #f3f4f6;
            padding: 2px 4px;
            border-radius: 2px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          /* Blockquotes */
          .tiptap-container .ProseMirror blockquote {
            border-left: 4px solid #d1d5db;
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: #6b7280;
          }
        `,
        }}
      />

      {editable && <EditorToolbar editor={editor} />}

      <EditorContent editor={editor} />
    </div>
  );
}
