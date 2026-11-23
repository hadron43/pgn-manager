import { Chess, Chess960 } from "void57-chess";
import * as pgnParser from "pgn-parser";
import type { ParsedPGN, Move, Rav, Header, Result } from "pgn-parser";

import { regeneratePGN, commentToString } from "./utils";

export const FEN_START_POSITION =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const FEN_EMPTY_POSITION = "8/8/8/8/8/8/8/8";

/** Move input type for pushMove — from/to with optional promotion */
export type ShortMove = {
  from: string;
  to: string;
  promotion?: string;
};

/** Arrow and highlight colors, as in [%cal Ge2e4] and [%csl Rd5] */
export type AnnotationColor = "G" | "R" | "Y" | "B";

/** Arrows ([%cal]) and square highlights ([%csl]) of a move */
export type Annotations = {
  arrows: { from: string; to: string; color: AnnotationColor }[];
  highlights: { square: string; color: AnnotationColor }[];
};

/** Headers the moves depend on, which setHeaders keeps as they are */
const PROTECTED_HEADERS = ["fen", "setup", "variant"];

const RESULTS: Result[] = ["1-0", "0-1", "1/2-1/2", "*"];

/** Any [%key value] command in a comment, e.g. [%clk 0:05:00] */
const COMMAND_REGEX = /\[%[^\]]*\]/g;

/** The arrow and highlight commands */
const ANNOTATION_REGEX = /\[%(cal|csl)\s+([^\]]*)\]/g;

/** Shared instance type for both Chess and Chess960 */
type ChessInstance = Chess | Chess960;

/** Known variant header values that indicate Chess960 */
const CHESS960_VARIANTS = ["chess960", "fischerandom", "fischerrandom"];

/**
 * Determines whether the game is a Chess960 game based on PGN headers
 */
function isChess960Game(headers?: Header[]): boolean {
  if (!headers) return false;
  const variant = headers.find(
    (h) => h.name.toLowerCase() === "variant"
  )?.value;
  return variant ? CHESS960_VARIANTS.includes(variant.toLowerCase()) : false;
}

/**
 * Creates the appropriate Chess or Chess960 instance based on game headers
 */
function createChessInstance(fen: string, headers?: Header[]): ChessInstance {
  if (isChess960Game(headers)) {
    return new Chess960(fen);
  }
  return new Chess(fen);
}

class PGNManager {
  /** The raw PGN string input */
  private rawPGN: string;

  /** The parsed PGN game object */
  private game: ParsedPGN;

  /** Array of moves in traversal order */
  private sortedMoves: Array<Move>;

  /** Map of moves to their FEN position strings */
  private moveFen: Map<Move, string>;

  /** Map of FEN position string to their move object */
  private fenMove: Map<string, Move> = new Map();

  /** Map of moves to their parent variations (or null for mainline) */
  private moveParent: Map<Move, Rav | null>;

  /** Map of variations to their parent moves */
  private ravParent: Map<Rav, Move>;

  /** Map of moves to the color of the player who made the move */
  private moveColor: Map<Move, "w" | "b">;

  /** Whether this game is a Chess960 game */
  private _isChess960: boolean;

  /**
   * Creates a new PGNManager instance
   * @param pgn - The PGN string to parse and manage
   */
  constructor(pgn: string) {
    this.rawPGN = pgn;
    this.game = pgnParser.parse(pgn + " *")[0];

    this.sortedMoves = [];
    this.moveParent = new Map();
    this.ravParent = new Map();
    this.moveFen = new Map();
    this.fenMove = new Map();
    this.moveColor = new Map();
    this._isChess960 = isChess960Game(this.game.headers);

    this.dfOnGame(this.game);
  }

  /**
   * Returns whether this game is a Chess960 game
   */
  public get isChess960(): boolean {
    return this._isChess960;
  }

  /**
   * Initializes the game traversal starting from the initial position
   * @param game - The parsed PGN game object
   */
  private dfOnGame = (game: ParsedPGN) => {
    this.sortedMoves = [];

    const startFen =
      game.headers?.find((h) => h.name.toUpperCase() === "FEN")?.value ||
      FEN_START_POSITION;

    var chessGame = createChessInstance(startFen, game.headers);

    for (let move of game.moves) {
      this.dfsOnGame(move, game, chessGame);
    }
  };

  /**
   * Performs depth-first traversal of the game moves and variations
   * @param move - The current move being processed
   * @param parent - The parent RAV (variation) containing the move
   * @param chessGame - The chess instance for the current position
   */
  private dfsOnGame = (
    move: Move,
    parent: Rav,
    chessGame: ChessInstance
  ) => {
    this.sortedMoves.push(move);
    this.moveParent.set(move, parent);

    if (move.ravs) {
      for (let rav of move.ravs) {
        this.ravParent.set(rav, move);
        let newVarChessGame = createChessInstance(
          chessGame.fen(),
          this.game.headers
        );

        for (let ravMove of rav.moves) {
          this.dfsOnGame(ravMove, rav, newVarChessGame);
        }
      }
    }

    // move only after variations are processed
    try {
      chessGame.move(move.move);
    } catch {
      console.log("Invalid move: " + move.move);
    }
    this.moveFen.set(move, chessGame.fen());
    this.fenMove.set(chessGame.fen(), move);
    this.moveColor.set(move, chessGame.turn() === "w" ? "b" : "w");
  };

  /**
   * Gets the raw PGN string
   * @returns The original PGN string
   */
  public get pgn(): string {
    return this.rawPGN;
  }

  /**
   * Gets the parsed PGN object
   * @returns The parsed PGN game object
   */
  public get parsedPGN(): ParsedPGN {
    return this.game;
  }

  /**
   * Gets the game headers
   * @returns Array of game headers
   */
  public get headers(): Array<Header> {
    if (!this.game || !this.game.headers) return [];
    return this.game.headers;
  }

  /**
   * Gets a move by its number in the sequence
   * @param moveNumber - The 1-based index of the move
   * @returns The move object at the specified position
   */
  public getMove = (moveNumber: number) => {
    let move = this.sortedMoves[moveNumber - 1];
    return move;
  };

  /**
   * Gets the number of a move in the sequence
   * @param move - The move object
   * @returns The 1-based index of the move
   */
  public getMoveNumber = (move: Move) => {
    return this.sortedMoves.indexOf(move) + 1;
  };

  /**
   * Gets the next move in the sequence
   * @param moveOrId - The current move object or move number
   * @returns The next move in the sequence
   * @throws Error if there are no moves in the game
   */
  public nextMove = (moveOrId: Move | number | undefined): Move => {
    let move: Move | undefined;
    if (typeof moveOrId === "number") {
      move = this.getMove(moveOrId);
    } else {
      move = moveOrId;
    }

    if (!move) {
      if (this.sortedMoves.length == 0) {
        throw Error("No moves in game");
      }
      return this.sortedMoves[0];
    }

    if (
      move == this.game.moves[this.game.moves.length - 1] ||
      move === this.sortedMoves[this.sortedMoves.length - 1]
    ) {
      return move;
    }

    let parentRav = this.moveParent.get(move);
    let tempNextMove = this.getMove(this.getMoveNumber(move) + 1);

    if (parentRav) {
      let indexInParent = parentRav.moves.indexOf(move);
      if (indexInParent == parentRav.moves.length - 1) {
        let superParent = this.ravParent.get(parentRav);
        if (superParent) {
          tempNextMove = this.nextMove(superParent);
        }
      } else {
        tempNextMove = parentRav.moves[indexInParent + 1];
      }
    }

    return tempNextMove;
  };

  /**
   * Checks if there is a next move available
   * @param moveOrId - The current move object or move number
   * @returns True if there is a next move, false otherwise
   */
  public hasNextMove = (moveOrId: Move | number): boolean => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    return !move || this.nextMove(move) !== move;
  };

  /**
   * Gets the previous move in the sequence
   * @param moveOrId - The current move object or move number
   * @returns The previous move or undefined if at the start
   * @throws Error if there are no moves or if the move parameter is invalid
   */
  public previousMove = (moveOrId: Move | number): Move | undefined => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;

    if (!move) {
      if (this.sortedMoves.length == 0) {
        throw Error("No moves in game");
      }
      throw Error("Invalid 'move' parameter while getting previous move");
    }

    let currentMoveNumber = this.getMoveNumber(move);
    if (currentMoveNumber == 0) {
      return undefined;
    }

    let parentRav = this.moveParent.get(move);
    let tempPrevMove = this.getMove(currentMoveNumber - 1);
    if (parentRav) {
      let indexInParent = parentRav.moves.indexOf(move);
      if (indexInParent == 0) {
        let superParent = this.ravParent.get(parentRav);
        if (superParent) {
          // a variation replaces its parent move, so it follows the one before
          return this.previousMove(superParent);
        }
      } else {
        tempPrevMove = parentRav.moves[indexInParent - 1];
      }
    }

    return tempPrevMove;
  };

  /**
   * Gets the first move in the game
   * @returns The first move
   * @throws Error if there are no moves in the game
   */
  public getFirstMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.sortedMoves[0];
  };

  /**
   * Gets the last move in the game
   * @returns The last move
   * @throws Error if there are no moves in the game
   */
  public getLastMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.game.moves[this.game.moves.length - 1];
  };

  /**
   * Gets the FEN string for a specific move
   * @param moveOrId - The move object or move number
   * @returns The FEN string representing the position after the move
   * @throws Error if the move parameter is invalid
   */
  public getMoveFen = (moveOrId: Move | number): string => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveFen.has(move)) {
      throw Error("Invalid 'move' parameter while getting fen");
    }
    let moveFen = this.moveFen.get(move);
    return moveFen ? moveFen : FEN_EMPTY_POSITION;
  };

  /**
   * Gets the parent RAV (variation) for a move
   * @param moveOrId - The move object or move number
   * @returns The parent RAV or null if the move is in the main line
   * @throws Error if the move parameter is invalid
   */
  public getParentRav = (moveOrId: Move | number): Rav | null => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveParent.has(move)) {
      throw Error("Invalid 'move' parameter while getting parent rav");
    }
    let parentRav = this.moveParent.get(move);
    return parentRav ? parentRav : null;
  };

  /**
   * Gets the color of the player who made the move
   * @param moveOrId - The move object or move ID number
   * @returns "w" for white or "b" for black
   * @throws Error if the move parameter is invalid
   */
  public getMoveColor = (moveOrId: Move | number): "w" | "b" => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveColor.has(move)) {
      throw Error("Invalid 'move' parameter while getting move color");
    }
    return this.moveColor.get(move);
  };

  /***
   * Pushes a new move into the game
   * @param moveId - The ID of the move to push
   * @param newMove - The move object to add
   * @param result - The result of the game after this move (default is "*")
   * @returns The newly created move object
   * @throws Error if the move parameter is invalid
   */
  public pushMove = (
    moveId: number,
    newMove: ShortMove,
    result: Result = "*"
  ): Move => {
    let chess: ChessInstance;
    let parentRav: Rav;
    let current: Move | null = null;

    // 1) Initialize Chess and parent variation
    if (moveId === 0) {
      parentRav = this.parsedPGN;
      const fenHdr = this.headers.find((h) => h.name.toLowerCase() === "fen");
      const startFen = fenHdr ? fenHdr.value : FEN_START_POSITION;
      chess = createChessInstance(startFen, this.game.headers);
    } else {
      current = this.getMove(moveId);
      if (!current) throw new Error("Invalid moveId while pushing a new move!");
      parentRav = this.moveParent.get(current) || this.parsedPGN;
      chess = createChessInstance(
        this.getMoveFen(current),
        this.game.headers
      );
    }

    // 2) Play the move
    let played;
    try {
      played = chess.move(newMove);
    } catch {
      played = null;
    }
    if (!played) throw new Error("Invalid move");

    const san = chess.history().slice(-1)[0];
    const nextToMove = chess.turn(); // 'w' or 'b'

    // If the FEN already exists, we are trying to add a move that is already played
    if (this.fenMove.has(chess.fen())) {
      return this.fenMove.get(chess.fen());
    }

    // 3) Build move object with provisional move_number
    const provisionalNumber = (() => {
      if (!current) {
        return 1; // brand‐new mainline
      }
      const currNum =
        current.move_number || this.previousMove(current)?.move_number;
      const currColor = this.getMoveColor(current);
      return currColor === "w" ? currNum : currNum + 1;
    })();

    const moveObj: Move = {
      move: san,
      ravs: undefined,
      move_number: provisionalNumber,
      comments: [],
    };

    // 4) Insert into structure & flag first‐of‐variation
    let isFirstOfVariation = !current;

    if (!current) {
      // brand-new mainline => variation of first move if exists
      const first = parentRav.moves[0];
      if (first) {
        isFirstOfVariation = true;
        const newRav: Rav = { moves: [moveObj], result };
        first.ravs = first.ravs || [];
        first.ravs.push(newRav);
        this.moveParent.set(moveObj, newRav);
        this.ravParent.set(newRav, first);
      } else {
        parentRav.moves.push(moveObj);
        this.moveParent.set(moveObj, parentRav);
      }
    } else {
      // existing‐move branch
      const lastInRav = parentRav.moves[parentRav.moves.length - 1];
      const isContinuation = lastInRav === current;

      if (!isContinuation) {
        // new variation off the next move
        isFirstOfVariation = true;
        const anchor = this.nextMove(current) || current;
        anchor.ravs = anchor.ravs || [];
        const newRav: Rav = { moves: [moveObj], result };
        anchor.ravs.push(newRav);
        this.moveParent.set(moveObj, newRav);
        this.ravParent.set(newRav, anchor);
      } else {
        // continuation
        parentRav.moves.push(moveObj);
        this.moveParent.set(moveObj, parentRav);
      }
    }

    // 5) Conditionally remove move_number
    // Keep it only if first‐of‐variation OR new move is White to play
    if (!(isFirstOfVariation || nextToMove === "b")) {
      delete moveObj.move_number;
    }

    // 6) Final bookkeeping
    this.moveFen.set(moveObj, chess.fen());
    this.fenMove.set(chess.fen(), moveObj);
    this.moveColor.set(moveObj, nextToMove === "w" ? "b" : "w");
    this.rawPGN = regeneratePGN(this.game, this.moveColor);
    this.dfOnGame(this.game);

    return moveObj;
  };

  /**
   * Delete a move and all subsequent moves in its variation from the game
   * @param moveId - The ID of the move to delete from
   * @throws Error if the move parameter is invalid
   */
  public deleteMove = (moveId: number): void => {
    const move = this.getMove(moveId);
    if (!move) {
      throw Error("Invalid move");
    }

    // delete the move and subsequent moves from the game
    const parentRav = this.getParentRav(move);
    const index = parentRav.moves.indexOf(move);
    const deletedMoves = parentRav.moves.splice(index);

    // collect all moves and variations that need cleanup
    const movsToClean = [];
    const ravsToClean = [];

    for (const deletedMove of deletedMoves) {
      movsToClean.push(deletedMove);
      if (deletedMove.ravs) {
        for (const rav of deletedMove.ravs) {
          ravsToClean.push(rav);
        }
      }
    }

    // Sort moves by their moveId in decreasing order
    movsToClean.sort((a, b) => this.getMoveNumber(b) - this.getMoveNumber(a));

    // clean up all maps at once
    movsToClean.forEach((move) => {
      this.moveParent.delete(move);
      this.fenMove.delete(this.getMoveFen(move));
      this.moveFen.delete(move);
      this.moveColor.delete(move);
    });

    ravsToClean.forEach((rav) => {
      this.ravParent.delete(rav);
    });

    // update the PGN and rebuild internal state
    this.rawPGN = regeneratePGN(this.game, this.moveColor);
    this.dfOnGame(this.game);
  };

  /**
   * Gets a move with its number, as a move list shows it
   * @param moveOrId - The move object or move number
   * @returns e.g. "12. Nf3" or "12... Nf6"
   * @throws Error if the move parameter is invalid
   */
  public getMoveNotation = (moveOrId: Move | number): string => {
    const move = this.toMove(moveOrId);
    const fullMoveNumber = Number(this.getMoveFen(move).split(" ")[5]);
    return this.getMoveColor(move) === "w"
      ? `${fullMoveNumber}. ${move.move}`
      : `${fullMoveNumber - 1}... ${move.move}`;
  };

  /**
   * Gets the squares a move was played from and to
   * @param moveOrId - The move object or move number
   * @returns The from and to squares
   * @throws Error if the move parameter is invalid
   */
  public getMoveSquares = (
    moveOrId: Move | number
  ): { from: string; to: string } => {
    const move = this.toMove(moveOrId);
    const previous = this.previousMove(move);
    const fen = previous
      ? this.getMoveFen(previous)
      : this.headers.find((h) => h.name.toUpperCase() === "FEN")?.value ||
        FEN_START_POSITION;
    const { from, to } = createChessInstance(fen, this.game.headers).move(
      move.move
    );
    return { from, to };
  };

  /**
   * Checks if a move is in the main line
   * @param moveOrId - The move object or move number
   * @returns True if the move is in the main line, false if in a variation
   * @throws Error if the move parameter is invalid
   */
  public isMainline = (moveOrId: Move | number): boolean => {
    return this.getParentRav(moveOrId) === this.game;
  };

  /**
   * Gets every move that can follow a move: the next move of its line, then
   * the first move of each variation of that next move
   * @param moveOrId - The move object or move number, or undefined for the start
   * @returns The next moves, or an empty array at the end of a line
   */
  public getNextMoves = (moveOrId?: Move | number): Move[] => {
    const move = moveOrId === undefined ? undefined : this.toMove(moveOrId);
    const line = move ? this.getParentRav(move) : this.game;
    const next = line.moves[move ? line.moves.indexOf(move) + 1 : 0];
    if (!next) {
      return [];
    }
    return [next, ...(next.ravs || []).map((rav) => rav.moves[0])];
  };

  /**
   * Gets the comment text of a move, without [%...] commands
   * @param moveOrId - The move object or move number
   * @returns The comment text, or an empty string
   * @throws Error if the move parameter is invalid
   */
  public getComment = (moveOrId: Move | number): string => {
    return this.getFullComment(this.toMove(moveOrId))
      .replace(COMMAND_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  /**
   * Sets the comment text of a move, keeping its [%...] commands
   * @param moveOrId - The move object or move number
   * @param text - The new comment text, or an empty string to remove it
   * @throws Error if the move parameter is invalid
   */
  public setComment = (moveOrId: Move | number, text: string): void => {
    const move = this.toMove(moveOrId);
    const commands = this.getFullComment(move).match(COMMAND_REGEX) || [];
    this.writeComment(move, [text.replace(/[{}]/g, ""), ...commands]);
  };

  /**
   * Gets the arrows and square highlights of a move
   * @param moveOrId - The move object or move number
   * @returns The arrows and highlights
   * @throws Error if the move parameter is invalid
   */
  public getAnnotations = (moveOrId: Move | number): Annotations => {
    const annotations: Annotations = { arrows: [], highlights: [] };
    const comment = this.getFullComment(this.toMove(moveOrId));

    for (const [, command, values] of comment.matchAll(ANNOTATION_REGEX)) {
      for (const value of values.split(",").map((v) => v.trim())) {
        const color = value[0] as AnnotationColor;
        const squares = value.slice(1);
        if (!"GRYB".includes(color)) continue;

        if (command === "cal" && squares.length === 4) {
          annotations.arrows.push({
            from: squares.slice(0, 2),
            to: squares.slice(2),
            color,
          });
        } else if (command === "csl" && squares.length === 2) {
          annotations.highlights.push({ square: squares, color });
        }
      }
    }
    return annotations;
  };

  /**
   * Replaces the arrows and square highlights of a move, keeping its comment
   * text and other commands
   * @param moveOrId - The move object or move number
   * @param annotations - The arrows and highlights to set
   * @throws Error if the move parameter is invalid
   */
  public setAnnotations = (
    moveOrId: Move | number,
    { arrows, highlights }: Annotations
  ): void => {
    const move = this.toMove(moveOrId);
    this.writeComment(move, [
      this.getFullComment(move).replace(ANNOTATION_REGEX, ""),
      highlights.length
        ? `[%csl ${highlights.map((h) => h.color + h.square).join(",")}]`
        : "",
      arrows.length
        ? `[%cal ${arrows.map((a) => a.color + a.from + a.to).join(",")}]`
        : "",
    ]);
  };

  /**
   * Replaces the game headers. FEN, SetUp and Variant are kept as they are,
   * and a valid Result header also sets the game result.
   * @param headers - The new headers; ones with an empty name or value are dropped
   */
  public setHeaders = (headers: Header[]): void => {
    const isProtected = (h: Header) =>
      PROTECTED_HEADERS.includes(h.name.toLowerCase());

    this.game.headers = [
      ...headers
        .map((h) => ({
          name: h.name.replace(/[\s"\]]/g, ""),
          value: h.value.replace(/"/g, "'").trim(),
        }))
        .filter((h) => h.name && h.value && !isProtected(h)),
      ...this.headers.filter(isProtected),
    ];

    const result = headers.find((h) => h.name === "Result")?.value as Result;
    if (RESULTS.includes(result)) {
      this.game.result = result;
    }
    this.rebuild();
  };

  /**
   * Swaps the variation holding a move with the line it branches off
   * @param moveOrId - Any move of the variation
   * @returns False if the move is in the main line
   * @throws Error if the move parameter is invalid
   */
  public promoteVariation = (moveOrId: Move | number): boolean => {
    const variation = this.getParentRav(moveOrId);
    if (variation === this.game) {
      return false;
    }
    this.swapWithParentLine(variation);
    this.rebuild();
    return true;
  };

  /**
   * Promotes the variation holding a move until it is the main line
   * @param moveOrId - Any move of the variation
   * @returns False if the move is already in the main line
   * @throws Error if the move parameter is invalid
   */
  public promoteToMainline = (moveOrId: Move | number): boolean => {
    let line = this.getParentRav(moveOrId);
    if (line === this.game) {
      return false;
    }
    while (line !== this.game) {
      line = this.swapWithParentLine(line);
    }
    this.rebuild();
    return true;
  };

  /**
   * Deletes the whole variation holding a move
   * @param moveOrId - Any move of the variation
   * @returns The move before the variation, or undefined if there is none or
   * the move is in the main line
   * @throws Error if the move parameter is invalid
   */
  public deleteVariation = (moveOrId: Move | number): Move | undefined => {
    const variation = this.getParentRav(moveOrId);
    const anchor = this.ravParent.get(variation);
    if (!anchor) {
      return undefined;
    }
    const previous = this.previousMove(anchor);
    const ravs = anchor.ravs.filter((rav) => rav !== variation);
    anchor.ravs = ravs.length ? ravs : undefined;
    this.rebuild();
    return previous;
  };

  /**
   * Gets the move object for a move object or move number
   * @throws Error if the move parameter is invalid
   */
  private toMove = (moveOrId: Move | number): Move => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move || !this.moveParent.has(move)) {
      throw Error("Invalid 'move' parameter");
    }
    return move;
  };

  /** All comments of a move as one string, [%...] commands included */
  private getFullComment = (move: Move): string => {
    return move.comments.map(commentToString).join(" ");
  };

  /** Replaces the comments of a move with one built from the given parts */
  private writeComment = (move: Move, parts: string[]): void => {
    const comment = parts.join(" ").replace(/\s+/g, " ").trim();
    move.comments = comment ? [comment] : [];
    this.rebuild();
  };

  /**
   * Puts a variation in place of the moves it is an alternative to, which
   * become its first variation
   * @returns The line the variation moved into
   */
  private swapWithParentLine = (variation: Rav): Rav => {
    const anchor = this.ravParent.get(variation);
    const line = this.getParentRav(anchor);
    const replacedMoves = line.moves.splice(line.moves.indexOf(anchor));
    const otherVariations = anchor.ravs.filter((rav) => rav !== variation);
    anchor.ravs = undefined;

    const [firstMove] = variation.moves;
    firstMove.ravs = [
      { moves: replacedMoves, result: null },
      ...otherVariations,
      ...(firstMove.ravs || []),
    ];
    line.moves.push(...variation.moves);
    return line;
  };

  /** Rebuilds the internal state after an edit and regenerates the PGN */
  private rebuild = (): void => {
    this.moveParent = new Map();
    this.ravParent = new Map();
    this.moveFen = new Map();
    this.fenMove = new Map();
    this.moveColor = new Map();
    this.dfOnGame(this.game);
    this.rawPGN = regeneratePGN(this.game, this.moveColor);
  };
}

export default PGNManager;
