// /Users/remruata/projects/cid-ai/src/components/ui/plugins/ToolbarPlugin.tsx
"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  UNDO_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
} from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListNode, ListNode } from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  UndoIcon,
  RedoIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { $isHeadingNode } from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";

const LowPriority = 1;

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsLink($isLinkNode(anchorNode) || $isLinkNode(anchorNode.getParent()));

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload) => {
        updateToolbar();
        return false;
      },
      LowPriority
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      LowPriority
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      LowPriority
    );
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const formatHeading = (tag: "h1" | "h2" | "h3") => {
    if (blockType !== tag) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // This is a simplified way to format heading, Lexical has more robust ways
          // For a full implementation, you might use $setBlocksType
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"); // Ensure alignment
          // A more direct way to set block type is needed here, this is a placeholder
          // For now, we'll rely on direct commands or more complex block type transformations
          // This part needs a proper implementation of block type switching
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== "ul") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== "ol") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatQuote = () => {
    if (blockType !== "quote") {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const quoteNode = $createQuoteNode();
          // This is simplified. Proper block transformation is needed.
          selection.insertNodes([quoteNode]);
        }
      });
    }
  };

  const formatCode = () => {
    // This is a simplified way to insert a code block.
    // For a full implementation, you'd want to wrap selected content or convert block type.
    if (blockType !== "code") {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            // If no text is selected, create a new code block
            const codeNode = $createCodeNode();
            selection.insertNodes([codeNode]);
          } else {
            // If text is selected, attempt to format it as code
            // This is a placeholder for proper $setBlocksType or equivalent
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          }
        }
      });
    }
  };

  const buttonClass = "p-2 rounded hover:bg-gray-200 disabled:opacity-50";
  const activeClass = "bg-gray-300";

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center p-2 border-b border-gray-300 bg-gray-50 space-x-1"
    >
      <button
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className={buttonClass}
        aria-label="Undo"
      >
        <UndoIcon size={18} />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className={buttonClass}
        aria-label="Redo"
      >
        <RedoIcon size={18} />
      </button>
      <span className="h-5 w-px bg-gray-300 mx-1"></span>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        className={`${buttonClass} ${isBold ? activeClass : ""}`}
        aria-label="Format Bold"
      >
        <BoldIcon size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        className={`${buttonClass} ${isItalic ? activeClass : ""}`}
        aria-label="Format Italic"
      >
        <ItalicIcon size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        className={`${buttonClass} ${isUnderline ? activeClass : ""}`}
        aria-label="Format Underline"
      >
        <UnderlineIcon size={18} />
      </button>
      <button
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        className={`${buttonClass} ${isStrikethrough ? activeClass : ""}`}
        aria-label="Format Strikethrough"
      >
        <StrikethroughIcon size={18} />
      </button>
      <button
        onClick={insertLink}
        className={`${buttonClass} ${isLink ? activeClass : ""}`}
        aria-label="Insert Link"
      >
        <LinkIcon size={18} />
      </button>
      <span className="h-5 w-px bg-gray-300 mx-1"></span>
      {/* Placeholder for block type selector (e.g., H1, H2, Paragraph) */}
      {/* <button onClick={() => formatHeading('h1')} className={buttonClass}>H1</button> */}
      {/* <button onClick={() => formatHeading('h2')} className={buttonClass}>H2</button> */}
      <button
        onClick={formatBulletList}
        className={`${buttonClass} ${blockType === "ul" ? activeClass : ""}`}
        aria-label="Unordered List"
      >
        <ListIcon size={18} />
      </button>
      <button
        onClick={formatNumberedList}
        className={`${buttonClass} ${blockType === "ol" ? activeClass : ""}`}
        aria-label="Ordered List"
      >
        <ListOrderedIcon size={18} />
      </button>
      <button
        onClick={formatQuote}
        className={`${buttonClass} ${blockType === "quote" ? activeClass : ""}`}
        aria-label="Quote"
      >
        <QuoteIcon size={18} />
      </button>
      <button
        onClick={formatCode}
        className={`${buttonClass} ${blockType === "code" ? activeClass : ""}`}
        aria-label="Code Block"
      >
        <CodeIcon size={18} />
      </button>
    </div>
  );
}
