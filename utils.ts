import type { ParsedPGN, Move } from "pgn-parser";

/**
 * Regenerates a PGN string from a ParsedPGN object
 */
export function regeneratePGN(
  parsedPGN: ParsedPGN,
  moveColor: Map<Move, "w" | "b">
): string {
  const lines: string[] = [];

  // Add comments above header
  if (parsedPGN.comments_above_header) {
    parsedPGN.comments_above_header.forEach((comment) => {
      lines.push(`{${comment.text}}`);
    });
    lines.push("");
  }

  // Add headers
  if (parsedPGN.headers) {
    parsedPGN.headers.forEach((header) => {
      lines.push(`[${header.name} "${header.value}"]`);
    });
    lines.push("");
  }

  // Add comments between headers and moves
  if (parsedPGN.comments) {
    parsedPGN.comments.forEach((comment) => {
      lines.push(`{${comment.text}}`);
    });
    lines.push("");
  }

  // Add moves
  const movesText = formatMoves(parsedPGN.moves, moveColor);
  if (movesText) {
    lines.push(movesText);
  }

  // Add result
  lines.push(parsedPGN.result);

  return lines.join("\n");
}

/**
 * Formats moves array into PGN move notation
 */
function formatMoves(moves: Move[], moveColor: Map<Move, "w" | "b">): string {
  const parts: string[] = [];

  moves.forEach((move) => {
    // Add move number for white moves
    if (move.move_number !== undefined) {
      parts.push(`${move.move_number}.`);
      if (moveColor.get(move) === "b") {
        parts[parts.length - 1] += "..";
      }
    }

    // Add the move
    parts.push(move.move);

    // Add comments after the move
    move.comments.forEach((comment) => {
      parts.push(`{${comment}}`);
    });

    // Add variations (RAVs)
    if (move.ravs) {
      move.ravs.forEach((rav) => {
        const ravMoves = formatMoves(rav.moves, moveColor);
        const ravResult = rav.result ? ` ${rav.result}` : "";
        parts.push(`(${ravMoves}${ravResult})`);
      });
    }
  });

  return parts.join(" ");
}
