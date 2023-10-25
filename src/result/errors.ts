export class ResultUnwrappingError extends Error {
  public constructor(value: unknown) {
    super(`ResultUnwrappingError: the value is an error (${value})`);

    Error.captureStackTrace(this, ResultUnwrappingError);
  }
}
