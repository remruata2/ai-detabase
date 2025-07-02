"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Send,
  Bot,
  User,
  FileText,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  FileDown,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ChatMessage } from "@/lib/ai-service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatSource {
  id: number;
  file_no: string;
  title: string;
}

interface ChatResponse {
  success: boolean;
  message: ChatMessage;
  sources: ChatSource[];
  searchQuery: string;
  queryType?: string;
  analysisUsed?: boolean;
  error?: string;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponseMeta, setLastResponseMeta] = useState<{
    queryType?: string;
    searchQuery?: string;
    analysisUsed?: boolean;
  } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  // Track expanded source lists by message ID
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initial number of sources to show
  const INITIAL_SOURCES_SHOWN = 15;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages,
        }),
      });

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        // Store metadata for debugging
        setLastResponseMeta({
          queryType: data.queryType,
          searchQuery: data.searchQuery,
          analysisUsed: data.analysisUsed,
        });
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setExpandedSources({});
  };

  // Toggle source expansion for a specific message
  const toggleSourceExpansion = (messageId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const formatTimestamp = (timestamp: Date | string | undefined) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Truncate source title for display
  const truncateTitle = (title: string, maxLength: number = 40) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + "...";
  };

  // Copy message content to clipboard
  const handleCopy = async (text: string, messageId: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Types for formatted content
  interface FormattedLine {
    text: string;
    type:
      | "header1"
      | "header2"
      | "header3"
      | "paragraph"
      | "bullet"
      | "numbered"
      | "code"
      | "empty"
      | "table_header"
      | "table_row"
      | "table_separator";
    size: number;
    font: "regular" | "bold" | "italic" | "mono";
    spacing: number;
    indent: number;
    isBold?: boolean;
    isItalic?: boolean;
    bulletId?: string; // Add unique identifier for bullet groups
    isWrappedLine?: boolean; // Track if this is a wrapped continuation
    isJustified?: boolean; // Track if this line should be justified
    justificationData?: { words: string[]; spacing: number }; // Justification spacing data
    tableId?: string; // Unique identifier for table groups
    tableCells?: string[]; // Array of cell contents for table rows
    isTableHeader?: boolean; // Whether this is a table header row
  }

  // Parse inline formatting (bold, italic) from a line of text
  const parseInlineFormatting = (
    text: string
  ): Array<{ text: string; isBold: boolean; isItalic: boolean }> => {
    const segments: Array<{
      text: string;
      isBold: boolean;
      isItalic: boolean;
    }> = [];

    // Clean up the text first
    let cleanText = text
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove inline code formatting
      .replace(/`([^`]+)`/g, "$1");

    // Split by bold markers first
    const boldParts = cleanText.split(/(\*\*[^*]+\*\*)/);

    for (const boldPart of boldParts) {
      if (boldPart.match(/^\*\*.*\*\*$/)) {
        // This is bold text
        const boldText = boldPart.replace(/^\*\*/, "").replace(/\*\*$/, "");
        segments.push({
          text: boldText,
          isBold: true,
          isItalic: false,
        });
      } else {
        // Check for italic text in non-bold parts
        const italicParts = boldPart.split(/(\*[^*]+\*)/);

        for (const italicPart of italicParts) {
          if (
            italicPart.match(/^\*.*\*$/) &&
            !italicPart.match(/^\*\*.*\*\*$/)
          ) {
            // This is italic text (but not bold)
            const italicText = italicPart.replace(/^\*/, "").replace(/\*$/, "");
            segments.push({
              text: italicText,
              isBold: false,
              isItalic: true,
            });
          } else if (italicPart.trim()) {
            // Regular text
            segments.push({
              text: italicPart,
              isBold: false,
              isItalic: false,
            });
          }
        }
      }
    }

    // Filter out empty segments and return
    return segments.filter((seg) => seg.text.trim().length > 0);
  };

  // Parse markdown and create formatted lines
  const parseMarkdownToFormattedLines = (text: string): FormattedLine[] => {
    const lines = text.split("\n");
    const formattedLines: FormattedLine[] = [];
    let listNumber = 1;
    let bulletCounter = 0; // Counter for unique bullet IDs
    let tableCounter = 0; // Counter for unique table IDs

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === "") {
        formattedLines.push({
          text: "",
          type: "empty",
          size: 12,
          font: "regular",
          spacing: 8,
          indent: 0,
        });
        continue;
      }

      // Headers
      if (line.match(/^#{1}\s+/)) {
        formattedLines.push({
          text: line.replace(/^#{1}\s+/, ""),
          type: "header1",
          size: 18,
          font: "bold",
          spacing: 25,
          indent: 0,
        });
      } else if (line.match(/^#{2}\s+/)) {
        formattedLines.push({
          text: line.replace(/^#{2}\s+/, ""),
          type: "header2",
          size: 16,
          font: "bold",
          spacing: 22,
          indent: 0,
        });
      } else if (line.match(/^#{3,6}\s+/)) {
        formattedLines.push({
          text: line.replace(/^#{3,6}\s+/, ""),
          type: "header3",
          size: 14,
          font: "bold",
          spacing: 20,
          indent: 0,
        });
      }
      // Bullet points (including • character)
      else if (line.match(/^[\s]*[•\-*+]\s+/) || line.match(/^[\s]*•/)) {
        // Detect indentation level for nested bullets
        const leadingSpaces = line.match(/^(\s*)/)?.[1]?.length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2); // Every 2 spaces = 1 indent level
        const baseIndent = 20;
        const nestedIndent = baseIndent + indentLevel * 15; // 15 points per level

        // Extract the full bullet line content
        let bulletContent = line.trim();

        // Ensure it starts with bullet point
        if (!bulletContent.startsWith("•")) {
          bulletContent = bulletContent.replace(/^[\s]*[\-*+]\s*/, "• ");
        }

        // Assign unique ID to this bullet point
        const currentBulletId = `bullet_${bulletCounter++}`;

        // Parse the entire bullet line to preserve mixed formatting
        const segments = parseInlineFormatting(bulletContent);

        // Keep segments separate for mixed formatting, but mark them all as bullet type with same ID
        for (let segIndex = 0; segIndex < segments.length; segIndex++) {
          const segment = segments[segIndex];
          formattedLines.push({
            text: segment.text,
            type: "bullet",
            size: 12,
            font: segment.isBold
              ? "bold"
              : segment.isItalic
              ? "italic"
              : "regular",
            spacing: 18, // Increased spacing for better readability
            indent: segIndex === 0 ? nestedIndent : nestedIndent + 12, // First segment at bullet level, rest aligned with text
            isBold: segment.isBold,
            isItalic: segment.isItalic,
            bulletId: currentBulletId,
          });
        }
      }
      // Numbered lists
      else if (line.match(/^[\s]*\d+\.\s+/)) {
        formattedLines.push({
          text: `${listNumber}. ` + line.replace(/^[\s]*\d+\.\s+/, ""),
          type: "numbered",
          size: 12,
          font: "regular",
          spacing: 16,
          indent: 20,
        });
        listNumber++;
      }
      // Code blocks (simplified)
      else if (line.match(/^```/) || line.match(/^\s{4,}/)) {
        formattedLines.push({
          text: line.replace(/^```\w*\s*/, "").replace(/^```\s*$/, ""),
          type: "code",
          size: 10,
          font: "mono",
          spacing: 14,
          indent: 20,
        });
      }
      // Table detection (markdown tables with | separators OR HTML tables)
      else if (
        (line.includes("|") &&
          line.trim().startsWith("|") &&
          line.trim().endsWith("|")) ||
        line.trim().match(/^<tr[^>]*>.*<\/tr>$/i) ||
        line.trim().match(/^<th[^>]*>.*<\/th>$/i) ||
        line.trim().match(/^<td[^>]*>.*<\/td>$/i)
      ) {
        // Check if next line is a separator line (contains dashes and pipes)
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
        const isSeparatorNext = nextLine.match(/^\|[\s\-:|]+\|$/);

        // Determine table ID - use current counter for new tables (headers), use current counter for data rows
        const currentTableId = isSeparatorNext
          ? `table_${tableCounter}`
          : `table_${tableCounter - 1}`;

        // Parse table cells
        const cells = line
          .split("|")
          .slice(1, -1) // Remove empty first and last elements
          .map((cell) => cell.trim());

        if (isSeparatorNext) {
          // This is a header row
          formattedLines.push({
            text: line,
            type: "table_header",
            size: 11,
            font: "bold",
            spacing: 16,
            indent: 0,
            tableId: currentTableId,
            tableCells: cells,
            isTableHeader: true,
          });

          // Skip the separator line
          i++;
          formattedLines.push({
            text: nextLine,
            type: "table_separator",
            size: 11,
            font: "regular",
            spacing: 2,
            indent: 0,
            tableId: currentTableId,
            tableCells: [],
          });

          // Increment table counter AFTER processing header
          tableCounter++;
        } else {
          // This is a regular table row - use the previous table ID to match the header
          formattedLines.push({
            text: line,
            type: "table_row",
            size: 11,
            font: "regular",
            spacing: 14,
            indent: 0,
            tableId: currentTableId,
            tableCells: cells,
            isTableHeader: false,
          });
        }
      }
      // Regular paragraphs
      else {
        // Process the line to handle mixed inline formatting
        const segments = parseInlineFormatting(line);

        // For paragraphs, we need to keep segments separate to maintain mixed formatting
        for (const segment of segments) {
          formattedLines.push({
            text: segment.text,
            type: "paragraph",
            size: 12,
            font: segment.isBold
              ? "bold"
              : segment.isItalic
              ? "italic"
              : "regular",
            spacing: 18, // Increased spacing for better readability
            indent: 0,
            isBold: segment.isBold,
            isItalic: segment.isItalic,
          });
        }
      }
    }

    return formattedLines;
  };

  // Helper function to justify text by calculating word spacing
  const justifyText = (
    text: string,
    targetWidth: number,
    font: any,
    fontSize: number
  ): { words: string[]; spacing: number } => {
    const words = text.split(" ");
    if (words.length <= 1) {
      return { words, spacing: 0 };
    }

    // Calculate natural width without extra spacing
    const naturalWidth = font.widthOfTextAtSize(text, fontSize);
    const extraSpace = targetWidth - naturalWidth;
    const gaps = words.length - 1;

    // Calculate additional spacing per gap
    const additionalSpacing = gaps > 0 ? extraSpace / gaps : 0;

    return { words, spacing: additionalSpacing };
  };

  // Helper function to wrap individual text segments
  const wrapTextSegment = (
    segment: FormattedLine,
    maxWidth: number,
    regularFont: any,
    boldFont: any,
    italicFont: any,
    monoFont: any
  ): FormattedLine[] => {
    // Select appropriate font for measuring
    let measureFont = regularFont;
    if (segment.font === "bold") measureFont = boldFont;
    else if (segment.font === "italic") measureFont = italicFont;
    else if (segment.font === "mono") measureFont = monoFont;

    const words = segment.text.split(" ");
    let currentLine = "";
    const availableWidth = maxWidth - segment.indent;
    const wrappedSegments: FormattedLine[] = [];

    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;

      let textWidth;
      try {
        textWidth = measureFont.widthOfTextAtSize(testLine, segment.size);
      } catch (encodingError) {
        console.warn("Text encoding issue with:", testLine);
        textWidth = testLine.length * segment.size * 0.6;
      }

      if (textWidth > availableWidth && currentLine) {
        // Add current line with justification (not for last line)
        const isWrapped = wrappedSegments.length > 0;
        const lineIndent =
          isWrapped && segment.type === "bullet"
            ? segment.indent + 12
            : segment.indent;

        // Calculate justification for this line
        const justificationData = justifyText(
          currentLine,
          availableWidth,
          measureFont,
          segment.size
        );

        wrappedSegments.push({
          ...segment,
          text: currentLine,
          isWrappedLine: isWrapped,
          indent: lineIndent,
          isJustified: true, // This line should be justified
          justificationData,
        });
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      const isWrapped = wrappedSegments.length > 0;
      wrappedSegments.push({
        ...segment,
        text: currentLine,
        isWrappedLine: isWrapped,
        // For wrapped bullet lines, increase indent to align with text
        indent:
          isWrapped && segment.type === "bullet"
            ? segment.indent + 12
            : segment.indent,
        // Don't justify the last line of each segment
        isJustified: false,
      });
    }

    return wrappedSegments;
  };

  // Helper function to wrap bullet segments together
  const wrapBulletSegments = (
    segments: FormattedLine[],
    maxWidth: number,
    regularFont: any,
    boldFont: any,
    italicFont: any,
    monoFont: any
  ): FormattedLine[] => {
    // Simpler approach: just wrap each segment individually and maintain bulletId
    const wrappedLines: FormattedLine[] = [];

    for (const segment of segments) {
      const wrappedSegments = wrapTextSegment(
        segment,
        maxWidth,
        regularFont,
        boldFont,
        italicFont,
        monoFont
      );
      wrappedLines.push(...wrappedSegments);
    }

    return wrappedLines;
  };

  // Helper function to render table
  const renderTable = (
    tableRows: FormattedLine[],
    page: any,
    yPosition: number,
    maxWidth: number,
    margin: number,
    regularFont: any,
    boldFont: any
  ): number => {
    console.log("=== renderTable DEBUG ===");
    console.log("Total rows received:", tableRows.length);
    console.log(
      "Row types:",
      tableRows.map((r) => r.type)
    );
    console.log(
      "Row table IDs:",
      tableRows.map((r) => r.tableId)
    );
    console.log("========================");

    if (tableRows.length === 0) return yPosition;

    // Calculate column widths based on content
    const headerRow = tableRows.find((row) => row.type === "table_header");
    if (!headerRow || !headerRow.tableCells) {
      console.log("No header row found!");
      return yPosition;
    }

    const numColumns = headerRow.tableCells.length;
    const columnWidth = (maxWidth - 40) / numColumns; // Leave some margin for borders
    const cellPadding = 4;
    const rowHeight = 16;

    let currentY = yPosition;
    const startY = yPosition; // Keep track of starting Y position for borders

    // Draw table border (top)
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + maxWidth - 40, y: currentY },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });

    for (const row of tableRows) {
      if (row.type === "table_separator") continue; // Skip separator rows

      if (!row.tableCells) continue;

      currentY -= rowHeight;

      // Draw row background for header
      if (row.type === "table_header") {
        page.drawRectangle({
          x: margin,
          y: currentY - cellPadding,
          width: maxWidth - 40,
          height: rowHeight,
          color: rgb(0.95, 0.95, 0.95),
        });
      }

      // Draw cell contents
      for (let i = 0; i < row.tableCells.length && i < numColumns; i++) {
        const cellContent = row.tableCells[i];
        const cellX = margin + i * columnWidth + cellPadding;

        // Truncate text if it's too long for the cell
        let displayText = cellContent;
        const maxCellWidth = columnWidth - cellPadding * 2;

        try {
          const font = row.type === "table_header" ? boldFont : regularFont;
          let textWidth = font.widthOfTextAtSize(displayText, row.size);

          // Truncate if needed
          while (textWidth > maxCellWidth && displayText.length > 3) {
            displayText = displayText.substring(0, displayText.length - 1);
            textWidth = font.widthOfTextAtSize(displayText + "...", row.size);
          }

          if (displayText !== cellContent) {
            displayText += "...";
          }
        } catch (encodingError) {
          // Fallback truncation
          const maxChars = Math.floor(maxCellWidth / (row.size * 0.6));
          if (displayText.length > maxChars) {
            displayText = displayText.substring(0, maxChars - 3) + "...";
          }
        }

        // Draw cell text
        page.drawText(displayText, {
          x: cellX,
          y: currentY,
          size: row.size,
          font: row.type === "table_header" ? boldFont : regularFont,
          color: rgb(0, 0, 0),
        });
      }

      // Draw horizontal row border after each row
      page.drawLine({
        start: { x: margin, y: currentY - cellPadding },
        end: { x: margin + maxWidth - 40, y: currentY - cellPadding },
        thickness: row.type === "table_header" ? 1 : 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Draw vertical borders for the entire table after all rows are processed
    const endY = currentY - cellPadding;
    for (let i = 0; i <= numColumns; i++) {
      page.drawLine({
        start: { x: margin + i * columnWidth, y: startY },
        end: { x: margin + i * columnWidth, y: endY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    return currentY - cellPadding - 10; // Return new Y position with some spacing
  };

  // Generate PDF from message content using pdf-lib
  const handleGeneratePdf = async (text: string, sources?: ChatSource[]) => {
    if (!text) return;

    // Ensure we're running in the browser
    if (typeof window === "undefined") {
      console.error("PDF generation only works in the browser");
      return;
    }

    try {
      console.log("Starting PDF generation with pdf-lib...");

      // Parse markdown and preserve formatting information
      let processedText = text
        // Normalize line breaks to just \n
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Clean up extra whitespace but preserve structure
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        // Keep only printable ASCII characters, spaces, tabs, and newlines
        .replace(/[^\x20-\x7E\n\t]/g, "")
        .trim();

      console.log("Text processed for PDF, length:", processedText.length);
      console.log("First 100 characters:", processedText.substring(0, 100));

      if (processedText.length === 0) {
        throw new Error("No valid content to generate PDF");
      }

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

      // Page settings
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const margin = 50;
      const maxWidth = pageWidth - margin * 2;
      const fontSize = 12;
      const lineHeight = fontSize * 1.2;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      // Add title
      const title = "CID AI Assistant Response";
      page.drawText(title, {
        x: margin,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;

      // Add date
      const date = new Date().toLocaleString();
      page.drawText(`Generated on: ${date}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 30;

      // Parse markdown into formatted lines
      const formattedLines = parseMarkdownToFormattedLines(processedText);

      // Process each formatted line with word wrapping
      const wrappedLines: FormattedLine[] = [];

      // Keep track of bullet groups and table groups and process in order
      const bulletGroups: { [key: string]: FormattedLine[] } = {};
      const tableGroups: { [key: string]: FormattedLine[] } = {};
      const processedBullets = new Set<string>();
      const processedTables = new Set<string>();

      for (let i = 0; i < formattedLines.length; i++) {
        const fLine = formattedLines[i];

        if (fLine.type === "empty") {
          wrappedLines.push(fLine);
          continue;
        }

        if (fLine.type === "bullet" && fLine.bulletId) {
          // Group bullet segments together
          if (!bulletGroups[fLine.bulletId]) {
            bulletGroups[fLine.bulletId] = [];
          }
          bulletGroups[fLine.bulletId].push(fLine);

          // Check if this is the last segment of this bullet (look ahead)
          const isLastSegment =
            i === formattedLines.length - 1 ||
            formattedLines[i + 1].bulletId !== fLine.bulletId;

          // Process the bullet group when we have all segments
          if (isLastSegment && !processedBullets.has(fLine.bulletId)) {
            const segments = bulletGroups[fLine.bulletId];
            const wrappedBulletLines = wrapBulletSegments(
              segments,
              maxWidth,
              regularFont,
              boldFont,
              italicFont,
              monoFont
            );
            wrappedLines.push(...wrappedBulletLines);
            processedBullets.add(fLine.bulletId);
          }
        } else if (
          (fLine.type === "table_header" ||
            fLine.type === "table_row" ||
            fLine.type === "table_separator") &&
          fLine.tableId
        ) {
          // Group table rows together
          if (!tableGroups[fLine.tableId]) {
            tableGroups[fLine.tableId] = [];
          }
          tableGroups[fLine.tableId].push(fLine);

          // Check if this is the last row of this table (look ahead)
          const isLastRow =
            i === formattedLines.length - 1 ||
            formattedLines[i + 1].tableId !== fLine.tableId;

          // Process the table group when we have all rows
          if (isLastRow && !processedTables.has(fLine.tableId)) {
            // Tables don't need text wrapping, just add them as-is
            wrappedLines.push(...tableGroups[fLine.tableId]);
            processedTables.add(fLine.tableId);
          }
        } else {
          // Handle non-bullet, non-table segments individually
          const wrappedSegments = wrapTextSegment(
            fLine,
            maxWidth,
            regularFont,
            boldFont,
            italicFont,
            monoFont
          );
          wrappedLines.push(...wrappedSegments);
        }
      }

      // Group consecutive segments for proper rendering
      // Only group segments that should truly be on the same line
      const groupedLines: Array<{
        segments: FormattedLine[];
        type: string;
        spacing: number;
      }> = [];
      let currentGroup: FormattedLine[] = [];
      let currentType = "";
      let currentSpacing = 16;

      for (const line of wrappedLines) {
        if (line.type === "empty") {
          // Finish current group and add empty line
          if (currentGroup.length > 0) {
            groupedLines.push({
              segments: currentGroup,
              type: currentType,
              spacing: currentSpacing,
            });
            currentGroup = [];
          }
          groupedLines.push({
            segments: [line],
            type: "empty",
            spacing: line.spacing,
          });
        } else if (
          (line.type === currentType &&
            currentGroup.length > 0 &&
            (line.type !== "bullet" ||
              (line.bulletId === currentGroup[0]?.bulletId &&
                !line.isWrappedLine))) ||
          // Special case for table elements: group by tableId regardless of type
          ((line.type === "table_header" ||
            line.type === "table_row" ||
            line.type === "table_separator") &&
            currentGroup.length > 0 &&
            (currentGroup[0]?.type === "table_header" ||
              currentGroup[0]?.type === "table_row" ||
              currentGroup[0]?.type === "table_separator") &&
            line.tableId === currentGroup[0]?.tableId)
        ) {
          // Same type, add to current group
          // For bullets: same bulletId and not a wrapped line
          // For tables: same tableId (regardless of specific table element type)
          // For others: same type (wrapped lines will be handled separately)
          currentGroup.push(line);
        } else {
          // Different type or wrapped line, finish current group and start new one
          if (currentGroup.length > 0) {
            groupedLines.push({
              segments: currentGroup,
              type: currentType,
              spacing: currentSpacing,
            });
          }
          currentGroup = [line];
          // For table elements, use a generic "table" type for grouping
          if (
            line.type === "table_header" ||
            line.type === "table_row" ||
            line.type === "table_separator"
          ) {
            currentType = "table";
          } else {
            currentType = line.type;
          }
          currentSpacing = line.spacing;
        }
      }

      // Add final group
      if (currentGroup.length > 0) {
        groupedLines.push({
          segments: currentGroup,
          type: currentType,
          spacing: currentSpacing,
        });
      }

      // Render grouped content
      let previousGroupType = "";
      for (let groupIndex = 0; groupIndex < groupedLines.length; groupIndex++) {
        const group = groupedLines[groupIndex];

        // Add extra spacing between different content types for better readability
        let extraSpacing = 0;
        if (previousGroupType && previousGroupType !== group.type) {
          if (
            (previousGroupType === "paragraph" && group.type === "bullet") ||
            (previousGroupType === "bullet" && group.type === "paragraph") ||
            group.type.startsWith("header")
          ) {
            extraSpacing = 8; // Extra spacing between content types
          }
        }

        // Check if we need a new page
        if (yPosition - (group.spacing + extraSpacing) < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        if (group.type !== "empty") {
          // Handle table rendering separately
          if (group.type === "table") {
            // Calculate table height to check if we need a new page
            const tableHeight = group.segments.length * 18 + 20; // Rough estimate
            if (yPosition - tableHeight < margin) {
              page = pdfDoc.addPage([pageWidth, pageHeight]);
              yPosition = pageHeight - margin;
            }

            console.log(
              "About to render table group with",
              group.segments.length,
              "segments"
            );
            console.log("Group type:", group.type);
            console.log(
              "Segment types:",
              group.segments.map((s) => s.type)
            );

            yPosition = renderTable(
              group.segments,
              page,
              yPosition,
              maxWidth,
              margin,
              regularFont,
              boldFont
            );
          }
          // Check if this group has only one segment or if segments should be on same line
          else if (
            group.segments.length === 1 ||
            (group.segments.length > 1 &&
              !group.segments.some((s) => s.isWrappedLine))
          ) {
            // Single segment or multiple segments that belong on same line
            let xPosition = margin + (group.segments[0]?.indent || 0);

            // Render each segment inline
            for (const segment of group.segments) {
              // Select appropriate font
              let selectedFont = regularFont;
              if (segment.font === "bold") selectedFont = boldFont;
              else if (segment.font === "italic") selectedFont = italicFont;
              else if (segment.font === "mono") selectedFont = monoFont;

              // Draw the text segment (with justification if needed)
              if (segment.isJustified && segment.justificationData) {
                // Draw justified text word by word
                let currentX = xPosition;
                const { words, spacing } = segment.justificationData;

                for (let i = 0; i < words.length; i++) {
                  const word = words[i];
                  page.drawText(word, {
                    x: currentX,
                    y: yPosition,
                    size: segment.size,
                    font: selectedFont,
                    color: segment.type.startsWith("header")
                      ? rgb(0.2, 0.2, 0.6)
                      : rgb(0, 0, 0),
                  });

                  // Move to next word position
                  const wordWidth = selectedFont.widthOfTextAtSize(
                    word,
                    segment.size
                  );
                  currentX += wordWidth;

                  // Add space between words (including justification spacing)
                  if (i < words.length - 1) {
                    const spaceWidth = selectedFont.widthOfTextAtSize(
                      " ",
                      segment.size
                    );
                    currentX += spaceWidth + spacing;
                  }
                }
              } else {
                // Draw normal text
                page.drawText(segment.text, {
                  x: xPosition,
                  y: yPosition,
                  size: segment.size,
                  font: selectedFont,
                  color: segment.type.startsWith("header")
                    ? rgb(0.2, 0.2, 0.6)
                    : rgb(0, 0, 0),
                });
              }

              // Move x position for next segment
              try {
                const textWidth = selectedFont.widthOfTextAtSize(
                  segment.text,
                  segment.size
                );
                xPosition += textWidth;
              } catch (encodingError) {
                xPosition += segment.text.length * segment.size * 0.6;
              }
            }
          } else {
            // Multiple segments that should be on separate lines
            for (
              let segIndex = 0;
              segIndex < group.segments.length;
              segIndex++
            ) {
              const segment = group.segments[segIndex];

              // Check if we need a new page for this segment
              if (yPosition - segment.spacing < margin) {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                yPosition = pageHeight - margin;
              }

              // Select appropriate font
              let selectedFont = regularFont;
              if (segment.font === "bold") selectedFont = boldFont;
              else if (segment.font === "italic") selectedFont = italicFont;
              else if (segment.font === "mono") selectedFont = monoFont;

              // Draw the text segment (with justification if needed)
              if (segment.isJustified && segment.justificationData) {
                // Draw justified text word by word
                let currentX = margin + segment.indent;
                const { words, spacing } = segment.justificationData;

                for (let i = 0; i < words.length; i++) {
                  const word = words[i];
                  page.drawText(word, {
                    x: currentX,
                    y: yPosition,
                    size: segment.size,
                    font: selectedFont,
                    color: segment.type.startsWith("header")
                      ? rgb(0.2, 0.2, 0.6)
                      : rgb(0, 0, 0),
                  });

                  // Move to next word position
                  const wordWidth = selectedFont.widthOfTextAtSize(
                    word,
                    segment.size
                  );
                  currentX += wordWidth;

                  // Add space between words (including justification spacing)
                  if (i < words.length - 1) {
                    const spaceWidth = selectedFont.widthOfTextAtSize(
                      " ",
                      segment.size
                    );
                    currentX += spaceWidth + spacing;
                  }
                }
              } else {
                // Draw normal text
                page.drawText(segment.text, {
                  x: margin + segment.indent,
                  y: yPosition,
                  size: segment.size,
                  font: selectedFont,
                  color: segment.type.startsWith("header")
                    ? rgb(0.2, 0.2, 0.6)
                    : rgb(0, 0, 0),
                });
              }

              // Move to next line for next segment (except for last segment)
              if (segIndex < group.segments.length - 1) {
                yPosition -= segment.spacing;
              }
            }
          }
        }

        // Don't advance yPosition for tables since renderTable handles it
        if (group.type !== "table") {
          yPosition -= group.spacing + extraSpacing;
        }
        previousGroupType = group.type;
      }

      // Add sources section if available
      if (sources && sources.length > 0) {
        // Add some spacing before sources
        yPosition -= 20;

        // Check if we need a new page for sources
        if (yPosition - 40 < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        // Sources header
        page.drawText("Sources:", {
          x: margin,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.6),
        });
        yPosition -= 20;

        // List each source
        for (let i = 0; i < sources.length; i++) {
          const source = sources[i];

          // Check if we need a new page
          if (yPosition - 16 < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - margin;
          }

          // Source number and title
          const sourceText = `${i + 1}. ${source.title}`;
          const sourceLines =
            sourceText.length > 70
              ? [
                  sourceText.substring(0, 70) + "...",
                  `   File: ${source.file_no}`,
                ]
              : [sourceText, `   File: ${source.file_no}`];

          for (const line of sourceLines) {
            page.drawText(line, {
              x: margin + 10,
              y: yPosition,
              size: 10,
              font: regularFont,
              color: rgb(0.3, 0.3, 0.3),
            });
            yPosition -= 14;
          }

          yPosition -= 4; // Extra spacing between sources
        }
      }

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Generate a readable filename
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, "-");
      const filename = `CID-AI-Response-${timestamp}.pdf`;

      console.log(
        "PDF generated successfully, attempting download with filename:",
        filename
      );
      console.log("PDF size:", pdfBytes.length, "bytes");

      // Create blob and download
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Add to DOM and trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log("PDF downloaded successfully with pdf-lib!");
      }, 1000);
    } catch (err) {
      console.error("Failed to generate PDF with pdf-lib:", err);
      // Show user-friendly error with more details
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      alert(
        `Failed to generate PDF: ${errorMessage}. Please try again or check the browser console for details.`
      );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CID AI Assistant</h1>
        <p className="text-gray-600 mt-2">
          Ask questions about the CID database records and get intelligent
          responses.
        </p>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat History
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearChat}>
              Clear Chat
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          <div
            className="flex-1 overflow-y-auto p-4 scroll-smooth"
            ref={scrollAreaRef}
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                <Bot className="h-12 w-12" />
                <div className="text-center">
                  <p className="text-lg font-medium">
                    Welcome to CID AI Assistant
                  </p>
                  <p className="text-sm">
                    Ask me anything about the database records
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <Badge variant="outline">
                    Try: "Show me arms recovery cases"
                  </Badge>
                  <Badge variant="outline">Try: "Cases from 2007"</Badge>
                  <Badge variant="outline">Try: "Case of Vanlalmawia"</Badge>
                  <Badge variant="outline">Try: "Latest 3 cases"</Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[90%] ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full ${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 break-words ${
                          message.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="text-sm break-words prose prose-sm max-w-none">
                          {message.role === "assistant" ? (
                            <>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  // Custom styling for markdown elements
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 break-words leading-relaxed">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc list-outside ml-4 mb-2 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="leading-relaxed">
                                      {children}
                                    </li>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-bold text-gray-900">
                                      {children}
                                    </strong>
                                  ),
                                  em: ({ children }) => (
                                    <em className="italic">{children}</em>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-gray-900">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-bold mb-2 mt-3 first:mt-0 text-gray-900">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0 text-gray-900">
                                      {children}
                                    </h3>
                                  ),
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-4">
                                      <table className="min-w-full border-collapse border border-gray-300 text-sm">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-gray-50">
                                      {children}
                                    </thead>
                                  ),
                                  tbody: ({ children }) => (
                                    <tbody className="bg-white">
                                      {children}
                                    </tbody>
                                  ),
                                  tr: ({ children }) => (
                                    <tr className="border-b border-gray-200">
                                      {children}
                                    </tr>
                                  ),
                                  th: ({ children }) => (
                                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900 bg-gray-50">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="border border-gray-300 px-4 py-2 text-gray-700">
                                      {children}
                                    </td>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                              <div className="flex items-center gap-1 mt-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    handleCopy(message.content, message.id)
                                  }
                                  title="Copy to clipboard"
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={async () =>
                                    await handleGeneratePdf(
                                      message.content,
                                      message.sources
                                    )
                                  }
                                  title="Download as PDF"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {message.content}
                            </div>
                          )}
                        </div>
                        <div
                          className={`text-xs mt-1 ${
                            message.role === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTimestamp(message.timestamp)}
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-medium text-gray-600">
                              Sources ({message.sources.length}):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {/* Show initial sources or all if expanded */}
                              {(expandedSources[message.id] 
                                ? message.sources 
                                : message.sources.slice(0, INITIAL_SOURCES_SHOWN)
                              ).map((source, index) => (
                                <Link
                                  key={`${source.id}-${index}`}
                                  href={`/admin/files/${source.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  title={`${source.title} (File: ${source.file_no})`}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs hover:bg-blue-100 hover:text-blue-800 transition-colors cursor-pointer group max-w-xs"
                                  >
                                    <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">
                                      {truncateTitle(source.title, 35)}
                                    </span>
                                    <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                  </Badge>
                                </Link>
                              ))}
                              
                              {/* Show "Show more/less" button if there are more sources than the initial limit */}
                              {message.sources.length > INITIAL_SOURCES_SHOWN && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => toggleSourceExpansion(message.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 py-1 h-auto"
                                >
                                  {expandedSources[message.id] 
                                    ? `Show less` 
                                    : `Show ${message.sources.length - INITIAL_SOURCES_SHOWN} more...`}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-200 text-gray-700">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg px-4 py-2 bg-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching database and generating response...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about CID database records..."
                disabled={isLoading}
                className="flex-1"
                maxLength={1000}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
              <span>{inputMessage.length}/1000 characters</span>
              {lastResponseMeta && (
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Type: {lastResponseMeta.queryType}
                  </Badge>
                  {lastResponseMeta.analysisUsed && (
                    <Badge variant="outline" className="text-xs bg-green-50">
                      AI Analysis ✓
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
