import { ResultUnwrappingError } from "./errors";
import { ResultPromise } from "./result_promise";

type AnyResult = Result<any, any> | ResultPromise<any, any>;

type InferResultDeps<TResults extends AnyResult[]> = [
  {
    [K in keyof TResults]: TResults[K] extends Result<infer TValue, unknown> | ResultPromise<infer TValue, unknown>
      ? TValue
      : never;
  },
  {
    [K in keyof TResults]: TResults[K] extends Result<unknown, infer TError> | ResultPromise<unknown, infer TError>
      ? TError
      : never;
  }[number],
];

type HasResultPromise<TResults extends AnyResult[]> =
  ResultPromise<never, never, never> extends TResults[keyof TResults] ? true : false;

type SyncOrAsyncResult<TResults extends AnyResult[]> =
  HasResultPromise<TResults> extends true
    ? ResultPromise<InferResultDeps<TResults>[0], InferResultDeps<TResults>[1]>
    : Result<InferResultDeps<TResults>[0], InferResultDeps<TResults>[1]>;

const enum ResultType {
  OK = "ok",
  ERR = "err",
}

class AbstractResult<TType extends ResultType, TValue, TError> {
  public get [Symbol.toStringTag](): string {
    return "Result";
  }

  public constructor(
    private readonly type: TType,
    public readonly value: TType extends ResultType.OK ? TValue : TError,
  ) {}

  public isOk(): this is AbstractResult<ResultType.OK, TValue, TError> {
    return this.type === ResultType.OK;
  }

  public isErr(): this is AbstractResult<ResultType.ERR, TValue, TError> {
    return this.type === ResultType.ERR;
  }

  public map<TNextValue = never>(fn: (value: TValue) => TNextValue): Result<TNextValue, TError> {
    if (this.isOk()) {
      return Ok(fn(this.value));
    }

    return Err<TNextValue, TError>(this.value as TError);
  }

  public mapOk<TNextValue = never>(fn: (value: TValue) => TNextValue): Result<TNextValue, TError> {
    return this.map<TNextValue>(fn);
  }

  public mapErr<TNextError = never>(fn: (value: TError) => TNextError): Result<TValue, TNextError> {
    if (this.isErr()) {
      return Err<TValue, TNextError>(fn(this.value));
    }

    return Ok<TValue, TNextError>(this.value as TValue);
  }

  public chain<TNextValue, TNextError>(
    fn: (value: TValue) => Result<TNextValue, TNextError>,
  ): Result<TNextValue, TError | TNextError>;
  public chain<TNextValue, TNextError>(
    fn: (value: TValue) => ResultPromise<TNextValue, TNextError>,
  ): ResultPromise<TNextValue, TError | TNextError>;
  public chain<TNextValue, TNextError>(
    fn: (value: TValue) => Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): Result<TNextValue, TError | TNextError> | ResultPromise<TNextValue, TError | TNextError>;
  public chain<TNextValue, TNextError>(
    fn: (value: TValue) => Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): Result<TNextValue, TError | TNextError> | ResultPromise<TNextValue, TError | TNextError> {
    if (this.isOk()) {
      return fn(this.value);
    }

    return Err<TNextValue, TError>(this.value as TError);
  }

  public or(other: Result<TValue, TError>): Result<TValue, TError>;
  public or(other: ResultPromise<TValue, TError>): ResultPromise<TValue, TError>;
  public or(
    other: Result<TValue, TError> | ResultPromise<TValue, TError>,
  ): Result<TValue, TError> | ResultPromise<TValue, TError>;
  public or(
    other: Result<TValue, TError> | ResultPromise<TValue, TError>,
  ): Result<TValue, TError> | ResultPromise<TValue, TError> {
    return this.isOk() ? this : other;
  }

  public fold<TNextValue>(mapOk: (value: TValue) => TNextValue, mapErr: (value: TError) => TNextValue): TNextValue {
    return this.isOk() ? mapOk(this.value) : mapErr(this.value as TError);
  }

  public unwrap(): TValue {
    if (this.isErr()) {
      throw new ResultUnwrappingError(this.value);
    }

    return this.value as TValue;
  }

  public unwrapOr(other: TValue): TValue {
    return this.isOk() ? this.value : other;
  }

  public unwrapOrElse(fn: (value: TError) => TValue): TValue {
    return this.isErr() ? fn(this.value) : (this.value as TValue);
  }

  public join<TNextValue, TNextError, TNextError2>(
    this: Result<Result<TNextValue, TNextError>, TNextError2>,
  ): Result<TNextValue, TNextError | TNextError2> {
    return this.chain((r) => r);
  }

  public default(value: TValue): Result<TValue, TError> {
    return this.or(Ok(value));
  }

  public zip<TNextValue, TNextError>(
    other: Result<TNextValue, TNextError>,
  ): Result<[TValue, TNextValue], TError | TNextError>;
  public zip<TNextValue, TNextError>(
    other: ResultPromise<TNextValue, TNextError>,
  ): ResultPromise<[TValue, TNextValue], TError | TNextError>;
  public zip<TNextValue, TNextError>(
    other: Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): Result<[TValue, TNextValue], TError | TNextError> | ResultPromise<[TValue, TNextValue], TError | TNextError>;
  public zip<TNextValue, TNextError>(
    other: Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): Result<[TValue, TNextValue], TError | TNextError> | ResultPromise<[TValue, TNextValue], TError | TNextError> {
    return this.chain((value) => other.map((otherValue) => [value, otherValue]));
  }
}

export type Result<TValue = never, TError = never> =
  | AbstractResult<ResultType.OK, TValue, TError>
  | AbstractResult<ResultType.ERR, TValue, TError>;

export function Ok<TValue = never, TError = never>(value: TValue): Result<TValue, TError> {
  return new AbstractResult<ResultType.OK, TValue, TError>(ResultType.OK, value);
}

export function Err<TValue = never, TError = never>(error: TError): Result<TValue, TError> {
  return new AbstractResult<ResultType.ERR, TValue, TError>(ResultType.ERR, error);
}

export function of<TValue = never, TError = never>(value: TValue): Result<TValue, TError> {
  return Ok<TValue, TError>(value);
}

export function from<TValue = never, TError = never>(value: TValue): Result<TValue, TError> {
  return Ok<TValue, TError>(value);
}

export function fromPromise<TValue = never, TError = never>(promise: Promise<TValue>): ResultPromise<TValue, TError> {
  return ResultPromise.from<TValue, TError>(promise);
}

export function fromTry<TValue = never, TError = never, TArgs extends unknown[] = []>(
  fn: (...args: TArgs) => TValue,
  ...args: TArgs
): Result<TValue, TError> {
  try {
    return Ok<TValue, TError>(fn(...args));
  } catch (error) {
    return Err<TValue, TError>(error as TError);
  }
}

export function merge<TResults extends AnyResult[]>(results: [...TResults]): SyncOrAsyncResult<TResults> {
  const res = results.reduce(
    (res, result) => res.chain((res) => result.map((value) => res.concat([value])) as Result<unknown[], unknown>),
    Ok<unknown[], unknown>([]),
  );

  return res as SyncOrAsyncResult<TResults>;
}

export const Result = { Ok, Err, of, from, fromPromise, fromTry, merge };
