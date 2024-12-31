import * as ChessJS from "chess.js";
const Chess = typeof ChessJS === "function" ? ChessJS : ChessJS.Chess;
import pgnParser, { ParsedPGN, Move, Rav, Header } from "pgn-parser";

export const FEN_START_POSITION =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const FEN_EMPTY_POSITION = "8/8/8/8/8/8/8/8";

class PGNManager {
  private rawPGN: string;
  private game: ParsedPGN;
  private sortedMoves: Array<Move>;
  private moveFen: Map<Move, string>;
  private moveParent: Map<Move, Rav | null>;
  private ravParent: Map<Rav, Move>;
  private chessjsInstance: Map<Move, ChessJS.ChessInstance>;

  constructor(pgn: string) {
    this.rawPGN = pgn;
    this.game = pgnParser.parse(pgn + " *")[0];

    this.sortedMoves = [];
    this.moveParent = new Map();
    this.ravParent = new Map();
    this.moveFen = new Map();

    this.dfOnGame(this.game);
  }

  private dfOnGame = (game: ParsedPGN) => {
    this.sortedMoves = [];

    var chessGame = new Chess(FEN_START_POSITION);

    for (let move of game.moves) {
      this.dfsOnGame(move, game, chessGame);
    }
  };

  private dfsOnGame = (
    move: Move,
    parent: Rav,
    chessGame: ChessJS.ChessInstance
  ) => {
    this.sortedMoves.push(move);
    this.moveParent.set(move, parent);

    if (move.ravs) {
      for (let rav of move.ravs) {
        this.ravParent.set(rav, move);
        let newVarChessGame = new Chess(chessGame.fen());

        for (let ravMove of rav.moves) {
          this.dfsOnGame(ravMove, rav, newVarChessGame);
        }
      }
    }

    // move only after variations are processed
    if (
      !chessGame.move(move.move, { sloppy: false }) &&
      !chessGame.move(move.move, { sloppy: true })
    )
      console.log("Invalid move: " + move.move);
    this.moveFen.set(move, chessGame.fen());
  };

  public get pgn(): string {
    return this.rawPGN;
  }

  public get parsedPGN(): ParsedPGN {
    return this.game;
  }

  public get headers(): Array<Header> {
    if (!this.game || !this.game.headers) return [];
    return this.game.headers;
  }

  public getMove = (moveNumber: number) => {
    let move = this.sortedMoves[moveNumber - 1];
    return move;
  };

  public getMoveNumber = (move: Move) => {
    return this.sortedMoves.indexOf(move) + 1;
  };

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

  public hasNextMove = (moveOrId: Move | number): boolean => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    return !move || this.nextMove(move) !== move;
  };

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
          tempPrevMove = superParent;
        }
      } else {
        tempPrevMove = parentRav.moves[indexInParent - 1];
      }
    }

    return tempPrevMove;
  };

  public getFirstMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.sortedMoves[0];
  };

  public getLastMove = () => {
    if (this.sortedMoves.length == 0) {
      throw Error("No moves in game");
    }
    return this.game.moves[this.game.moves.length - 1];
  };

  public getMoveFen = (moveOrId: Move | number): string => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move) {
      throw Error("Invalid 'move' parameter while getting fen");
    }
    let moveFen = this.moveFen.get(move);
    return moveFen ? moveFen : FEN_EMPTY_POSITION;
  };

  public getParentRav = (moveOrId: Move | number): Rav | null => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move) {
      throw Error("Invalid 'move' parameter while getting parent rav");
    }
    let parentRav = this.moveParent.get(move);
    return parentRav ? parentRav : null;
  };

  public getChessJSInstance = (
    moveOrId: Move | number
  ): ChessJS.ChessInstance => {
    const move =
      typeof moveOrId === "number" ? this.getMove(moveOrId) : moveOrId;
    if (!move) {
      throw Error("Invalid 'move' parameter while getting chessjs instance");
    }

    // if chessjs instance is unavailaable, create a new instance
    if (!this.chessjsInstance.get(move)) {
      this.chessjsInstance.set(move, new Chess(this.getMoveFen(move)));
    }

    return this.chessjsInstance.get(move);
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
    if (!move) {
      throw Error("Invalid 'move' parameter while getting move color");
    }
    return this.getChessJSInstance(move).turn() === "w" ? "b" : "w";
  };
}

export default PGNManager;
