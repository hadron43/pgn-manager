import { regeneratePGN } from "./utils";
import type { ParsedPGN, Move, Rav, Header } from "pgn-parser";

describe("regeneratePGN", () => {
  it("should regenerate PGN from minimal parsed object", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [
        { name: "Event", value: "Test Game" },
        { name: "Site", value: "Test Site" },
        { name: "Result", value: "1-0" },
      ],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
      ],
      result: "1-0",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain('[Event "Test Game"]');
    expect(result).toContain('[Site "Test Site"]');
    expect(result).toContain('[Result "1-0"]');
    expect(result).toContain("1. e4 e5");
    expect(result).toContain("1-0");
  });

  it("should handle PGN with comments above header", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: [
        { text: "This is a test game" },
        { text: "Another comment" },
      ],
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("{This is a test game}");
    expect(result).toContain("{Another comment}");
    expect(result).toContain('[Event "Test Game"]');
  });

  it("should handle PGN with comments between headers and moves", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: [{ text: "Game comment" }],
      moves: [{ move: "e4", move_number: 1, comments: [], ravs: [] }],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("{Game comment}");
    expect(result).toContain("1. e4");
  });

  it("should handle moves with comments", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [
        {
          move: "e4",
          move_number: 1,
          comments: ["Good opening move"],
          ravs: [],
        },
        {
          move: "e5",
          move_number: undefined,
          comments: ["Solid response"],
          ravs: [],
        },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("{Good opening move}");
    expect(result).toContain("{Solid response}");
  });

  it("should handle variations (RAVs)", () => {
    const variation: Rav = {
      moves: [
        { move: "f4", move_number: 2, comments: [], ravs: [] },
        { move: "exf4", move_number: undefined, comments: [], ravs: [] },
      ],
      result: null,
    };

    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
        { move: "Nf3", move_number: 2, comments: [], ravs: [variation] },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("(2. f4 exf4)");
    expect(result).toContain("2. Nf3");
  });

  it("should handle variations with results", () => {
    const variation: Rav = {
      moves: [
        { move: "f4", move_number: 2, comments: [], ravs: [] },
        { move: "exf4", move_number: undefined, comments: [], ravs: [] },
      ],
      result: "0-1",
    };

    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
        { move: "Nf3", move_number: 2, comments: [], ravs: [variation] },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("(2. f4 exf4 0-1)");
  });

  it("should handle empty moves array", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain('[Event "Test Game"]');
    expect(result).toContain("*");
    expect(result).not.toContain("1.");
  });

  it("should handle PGN without headers", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("1. e4 e5");
    expect(result).toContain("*");
  });

  it("should handle complex nested variations", () => {
    const nestedVariation: Rav = {
      moves: [{ move: "Bc4", move_number: 3, comments: [], ravs: [] }],
      result: null,
    };

    const mainVariation: Rav = {
      moves: [
        { move: "f4", move_number: 2, comments: [], ravs: [nestedVariation] },
        { move: "exf4", move_number: undefined, comments: [], ravs: [] },
      ],
      result: null,
    };

    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
        { move: "Nf3", move_number: 2, comments: [], ravs: [mainVariation] },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("(2. f4 (3. Bc4) exf4)");
    expect(result).toContain("2. Nf3");
  });

  it("should handle moves without move numbers (black moves)", () => {
    const parsedPGN: ParsedPGN = {
      comments_above_header: null,
      headers: [{ name: "Event", value: "Test Game" }],
      comments: null,
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
        { move: "Nf3", move_number: 2, comments: [], ravs: [] },
        { move: "Nc6", move_number: undefined, comments: [], ravs: [] },
      ],
      result: "*",
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("1. e4 e5 2. Nf3 Nc6");
  });

  it("should handle multiple comments on a single move", () => {
    const parsedPGN: ParsedPGN = {
      headers: [{ name: "Event", value: "Test Game" }],
      moves: [
        {
          move: "e4",
          move_number: 1,
          comments: ["Best by test", "Theory"],
          ravs: [],
        },
      ],
      result: "*",
      comments_above_header: null,
      comments: null,
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("{Best by test}");
    expect(result).toContain("{Theory}");
  });

  it("should handle multiple variations on a single move", () => {
    const variation1: Rav = {
      moves: [{ move: "f4", move_number: 2, comments: [], ravs: [] }],
      result: null,
    };

    const variation2: Rav = {
      moves: [{ move: "d4", move_number: 2, comments: [], ravs: [] }],
      result: null,
    };

    const parsedPGN: ParsedPGN = {
      headers: [{ name: "Event", value: "Test Game" }],
      moves: [
        { move: "e4", move_number: 1, comments: [], ravs: [] },
        { move: "e5", move_number: undefined, comments: [], ravs: [] },
        {
          move: "Nf3",
          move_number: 2,
          comments: [],
          ravs: [variation1, variation2],
        },
      ],
      result: "*",
      comments_above_header: null,
      comments: null,
    };

    const result = regeneratePGN(parsedPGN);

    expect(result).toContain("(2. f4)");
    expect(result).toContain("(2. d4)");
    expect(result).toContain("2. Nf3");
  });
});
