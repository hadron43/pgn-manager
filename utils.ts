import type { ParsedPGN, Move } from "pgn-parser";

/**
 * Converts a move comment to its PGN text. pgn-parser types comments as
 * strings but parses them as objects: the text, and the [%key value]
 * commands when the comment holds only those.
 */
export function commentToString(
  comment:
    | string
    | { text?: string; commands?: { key: string; values: string[] }[] }
): string {
  if (typeof comment === "string") {
    return comment;
  }
  const commands = (comment.commands || []).map(
    ({ key, values }) => `[%${key} ${values.join(",")}]`
  );
  return [comment.text, ...commands].filter(Boolean).join(" ");
}

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

    // Add the move and its NAGs ($1, $14, ...), which pgn-parser leaves untyped
    const nags = (move as Move & { nags?: string[] }).nags || [];
    parts.push(move.move, ...nags);

    // Add comments after the move
    move.comments.forEach((comment) => {
      parts.push(`{${commentToString(comment)}}`);
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
