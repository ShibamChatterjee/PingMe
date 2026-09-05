import React from "react";
import { Box, Typography } from "@mui/material";

interface Props {
  content: string;
  isMe?: boolean;
  onOpenTicket?: (ticketNumber: string) => void;
}

/**
 * Renders markdown-like formatted chat message text:
 * - **bold** or *italic*
 * - `inline code`
 * - ```code blocks```
 * - > blockquotes
 * - • or - bullet lists
 * - 1. numbered lists
 * - URLs / links
 * - ~strikethrough~
 */
export function FormattedMessage({ content, isMe, onOpenTicket }: Props) {
  if (!content) return null;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <Box
      sx={{
        wordBreak: "break-word",
        lineHeight: 1.5,
        fontSize: "0.9rem",
        color: "inherit",
      }}
    >
      {parts.map((part, pIdx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Code Block
          const codeContent = part.slice(3, -3).replace(/^\n+|\n+$/g, "");
          return (
            <Box
              key={pIdx}
              component="pre"
              sx={{
                my: 1,
                p: 1.25,
                borderRadius: "8px",
                bgcolor: isMe ? "rgba(0,0,0,0.25)" : "action.hover",
                border: "1px solid",
                borderColor: isMe ? "rgba(255,255,255,0.15)" : "divider",
                fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                fontSize: "0.82rem",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                color: "inherit",
              }}
            >
              <code>{codeContent}</code>
            </Box>
          );
        }

        // Process line by line for blockquotes, list items, etc.
        const lines = part.split("\n");
        return (
          <React.Fragment key={pIdx}>
            {lines.map((line, lIdx) => {
              const isLastLine = lIdx === lines.length - 1;

              // Blockquote: > text
              if (line.startsWith("> ") || line.startsWith(">")) {
                const quoteText = line.replace(/^>\s?/, "");
                return (
                  <Box
                    key={lIdx}
                    sx={{
                      pl: 1.25,
                      my: 0.5,
                      borderLeft: "3px solid",
                      borderColor: isMe ? "primary.contrastText" : "primary.main",
                      fontStyle: "italic",
                      opacity: 0.9,
                    }}
                  >
                    {renderInlineFormatted(quoteText, isMe, onOpenTicket)}
                  </Box>
                );
              }

              // Bullet list: • text, - text, * text
              const bulletMatch = line.match(/^([•\-\*])\s+(.+)$/);
              if (bulletMatch) {
                return (
                  <Box
                    key={lIdx}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      my: 0.25,
                      pl: 0.5,
                    }}
                  >
                    <Typography component="span" sx={{ fontSize: "14px", lineHeight: 1.4, opacity: 0.8 }}>
                      •
                    </Typography>
                    <Box component="span" sx={{ flexGrow: 1 }}>
                      {renderInlineFormatted(bulletMatch[2], isMe, onOpenTicket)}
                    </Box>
                  </Box>
                );
              }

              // Numbered list: 1. text
              const numberMatch = line.match(/^(\d+[\.\)])\s+(.+)$/);
              if (numberMatch) {
                return (
                  <Box
                    key={lIdx}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.75,
                      my: 0.25,
                      pl: 0.5,
                    }}
                  >
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: "12px", lineHeight: 1.5, opacity: 0.8 }}>
                      {numberMatch[1]}
                    </Typography>
                    <Box component="span" sx={{ flexGrow: 1 }}>
                      {renderInlineFormatted(numberMatch[2], isMe, onOpenTicket)}
                    </Box>
                  </Box>
                );
              }

              // Standard line
              return (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatted(line, isMe, onOpenTicket)}
                  {!isLastLine && <br />}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

/**
 * Handles inline formatting: **bold**, *italic*, ~strike~, `code`, https:// links, and #TKT-XXXX ticket refs
 */
function renderInlineFormatted(text: string, isMe?: boolean, onOpenTicket?: (num: string) => void): React.ReactNode {
  if (!text) return null;

  // Regex tokens:
  // 0: #TKT-NNNN or TKT-NNNN ticket reference
  // 1: URL
  // 2: `code`
  // 3: **bold**
  // 4: *italic* or _italic_
  // 5: ~strikethrough~ or ~~strikethrough~~
  const regex = /(#?TKT-\d+)|(https?:\/\/[^\s]+)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(~~?[^~]+~~?)/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    if (match[1]) {
      // #TKT-NNNN or TKT-NNNN ticket reference
      const ticketNumber = token.startsWith("#") ? token.substring(1) : token;
      parts.push(
        <Box
          key={match.index}
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTicket?.(ticketNumber);
          }}
          title={`Click to open ticket ${ticketNumber}`}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.4,
            px: 0.85,
            py: 0.2,
            borderRadius: "6px",
            bgcolor: onOpenTicket ? "primary.main" : "action.selected",
            color: onOpenTicket ? "primary.contrastText" : "text.primary",
            fontSize: "0.82em",
            fontWeight: 700,
            cursor: onOpenTicket ? "pointer" : "default",
            lineHeight: 1.5,
            verticalAlign: "middle",
            transition: "all 0.15s ease",
            boxShadow: onOpenTicket ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
            "&:hover": onOpenTicket ? {
              bgcolor: "primary.dark",
              transform: "translateY(-1px)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            } : {},
          }}
        >
          🎫 {token}
        </Box>
      );
    } else if (match[2]) {
      // URL Link / GIF / Image
      const isMedia =
        /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(token) ||
        token.includes("giphy.com/media") ||
        token.includes("media.giphy.com") ||
        token.includes("tenor.com");

      if (isMedia) {
        parts.push(
          <Box
            key={match.index}
            component="span"
            sx={{ display: "block", my: 0.75, maxWidth: 360 }}
          >
            <Box
              component="img"
              src={token}
              alt="GIF"
              loading="lazy"
              sx={{
                maxWidth: "100%",
                maxHeight: 280,
                borderRadius: "8px",
                display: "block",
                objectFit: "contain",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            />
          </Box>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isMe ? "#fff" : "var(--theme-primary, #0284c7)",
              textDecoration: "underline",
              wordBreak: "break-all",
            }}
          >
            {token}
          </a>
        );
      }
    } else if (match[3]) {
      // `inline code`
      const code = token.slice(1, -1);
      parts.push(
        <Box
          key={match.index}
          component="code"
          sx={{
            px: 0.6,
            py: 0.15,
            borderRadius: "4px",
            bgcolor: isMe ? "rgba(0,0,0,0.2)" : "action.hover",
            border: "1px solid",
            borderColor: isMe ? "rgba(255,255,255,0.2)" : "divider",
            fontFamily: "Consolas, Monaco, monospace",
            fontSize: "0.85em",
            color: "inherit",
          }}
        >
          {code}
        </Box>
      );
    } else if (match[4]) {
      // **bold**
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={match.index} style={{ fontWeight: 700 }}>
          {boldText}
        </strong>
      );
    } else if (match[5]) {
      // *italic* or _italic_
      const italicText = token.slice(1, -1);
      parts.push(
        <em key={match.index} style={{ fontStyle: "italic" }}>
          {italicText}
        </em>
      );
    } else if (match[6]) {
      // ~strikethrough~
      const strikeText = token.replace(/^~~?|~~?$/g, "");
      parts.push(
        <del key={match.index} style={{ textDecoration: "line-through", opacity: 0.8 }}>
          {strikeText}
        </del>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
