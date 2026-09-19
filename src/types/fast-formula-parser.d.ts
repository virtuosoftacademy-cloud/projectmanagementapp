/* eslint-disable @typescript-eslint/no-unused-vars -- an ambient declaration: every class here exists only to describe the library's shapes, so being used only as a type is the point. */
/**
 * The slice of fast-formula-parser this app uses. The package ships no types
 * of its own; this covers `lib/sheet-formulas.ts` and nothing more, so a
 * mismatch with the library surfaces as a type error rather than hiding.
 */
declare module "fast-formula-parser" {
  type CellRef = { sheet?: string; row: number; col: number };
  type RangeRef = {
    sheet?: string;
    from: { row: number; col: number };
    to: { row: number; col: number };
  };

  class FormulaError extends Error {
    constructor(error: string, details?: unknown);
    readonly error: string;
    static readonly DIV0: FormulaError;
    static readonly NA: FormulaError;
    static readonly NAME: FormulaError;
    static readonly NULL: FormulaError;
    static readonly NUM: FormulaError;
    static readonly REF: FormulaError;
    static readonly VALUE: FormulaError;
  }

  interface ParserOptions {
    onCell?: (ref: CellRef) => unknown;
    onRange?: (ref: RangeRef) => unknown;
    onVariable?: (name: string, sheetName: string) => CellRef | RangeRef | null;
    functions?: Record<string, (...args: unknown[]) => unknown>;
  }

  /** Lists the cells and ranges a formula references, without evaluating it. */
  class DepParser {
    constructor(options?: Pick<ParserOptions, "onVariable">);
    parse(formula: string, position: CellRef): (CellRef | RangeRef)[];
  }

  class FormulaParser {
    constructor(options?: ParserOptions);
    parse(formula: string, position: CellRef, allowReturnArray?: boolean): unknown;
    static readonly FormulaError: typeof FormulaError;
    static readonly DepParser: typeof DepParser;
  }

  export type { CellRef, RangeRef };

  export default FormulaParser;
}
