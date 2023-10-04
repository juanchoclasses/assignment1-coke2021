import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }
  
  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */
  
    // compute result based on formula provided
    private computeResult(): number {
      if (this._errorOccured) return this._lastResult;
      
      let sum = this.deriveTerm();
      while (this._currentFormula.length && ("+-".includes(this._currentFormula[0]))) {
        const op = this._currentFormula.shift();
        const termVal = this.deriveTerm();
        sum = op === "-" ? sum - termVal : sum + termVal;
      }
      this._lastResult = sum;
      return sum;
    }
  
    // computes a term from the formula
    private deriveTerm(): number {
      if (this._errorOccured) return this._lastResult;
  
      let product = this.deriveFactor();
      while (this._currentFormula.length && ("*/".includes(this._currentFormula[0]))) {
        const op = this._currentFormula.shift();
        const factorVal = this.deriveFactor();
        product = op === "*" ? product * factorVal : product / factorVal;
        if (op === "/" && !factorVal) {
          this._errorOccured = true;
          this._errorMessage = ErrorMessages.divideByZero;
          return Infinity;
        }
      }
      return product;
    }
  
    // computes a factor from the formula
    private deriveFactor(): number {
      if (this._errorOccured) return this._lastResult;
  
      if (!this._currentFormula.length) {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.partial;
        return 0;
      }
  
      const currentElement = this._currentFormula.shift();
      if (this.isNumber(currentElement)) return Number(currentElement);
  
      if (this.isCellReference(currentElement)) {
        const [val, errMsg] = this.getCellValue(currentElement);
        if (errMsg) {
          this._errorOccured = true;
          this._errorMessage = errMsg;
          return val;
        }
        return val;
      }
      if (currentElement === "(") {
        const computedVal = this.computeResult();
        if (this._currentFormula.shift() !== ")") {
          this._errorOccured = true;
          this._errorMessage = ErrorMessages.missingParentheses;
          return computedVal;
        }
        return computedVal;
      }
      this._errorOccured = true;
      this._errorMessage = ErrorMessages.invalidFormula;
      return 0;
    }
  
    // processes the formula to evaluate its result
    public evaluate(formula: FormulaType): void {
      this._currentFormula = [...formula];
      if (!formula.length) {
        this._result = 0;
        this._errorMessage = ErrorMessages.emptyFormula;
        return;
      }
      this._errorOccured = false;
      this._errorMessage = "";
      this._result = this.computeResult();
  
      if (this._currentFormula.length > 0 && !this._errorOccured) {
        this._errorOccured = true;
        this._errorMessage = ErrorMessages.invalidFormula;
      }
      if (this._errorOccured) this._result = this._lastResult;
    }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (!formula.length) {
      return [0, ErrorMessages.invalidCell];
    }

    let value = cell.getValue();
    return [value, ""];

  }
}

export default FormulaEvaluator;