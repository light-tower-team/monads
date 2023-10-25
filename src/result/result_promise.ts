import { Err, Ok, Result } from "./result";

export class ResultPromise<
  TValue = never,
  TError = never,
  TPayload extends TValue | Result<TValue, TError> = Result<TValue, TError>,
> {
  public get [Symbol.toStringTag](): string {
    return "ResultPromise";
  }

  private constructor(private readonly externalPromise: Promise<TPayload>) {}

  public static from<TValue = never, TError = never>(promise: Promise<TValue>): ResultPromise<TValue, TError> {
    return new ResultPromise<TValue, TError>(
      promise.then((value) => Ok<TValue, TError>(value)).catch((error) => Err<TValue, TError>(error)),
    );
  }

  public then<TNextValue = TValue, TNextError = TError, TResult2 = never>(
    onfulfilled?:
      | ((
          value: TPayload,
        ) =>
          | Result<TNextValue, TNextError>
          | ResultPromise<TNextValue, TNextError>
          | PromiseLike<Result<TNextValue, TNextError>>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): ResultPromise<TNextValue, TNextError> {
    const promise = this.externalPromise.then((value) => (onfulfilled ? onfulfilled(value) : value), onrejected);

    return new ResultPromise<TNextValue, TNextError>(promise as Promise<Result<TNextValue, TNextError>>);
  }

  public map<TNextValue = never>(fn: (value: TValue) => TNextValue): ResultPromise<TNextValue, TError> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).map(fn);
    });
  }

  public mapOk<TNextValue = never>(fn: (value: TValue) => TNextValue): ResultPromise<TNextValue, TError> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).mapOk(fn);
    });
  }

  public mapErr<TNextError = never>(fn: (value: TError) => TNextError): ResultPromise<TValue, TNextError> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).mapErr(fn);
    });
  }

  public chain<TNextValue, TNextError>(
    fn: (value: TValue) => Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): ResultPromise<TNextValue, TError | TNextError> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).chain(fn);
    });
  }

  public or(other: Result<TValue, TError> | ResultPromise<TValue, TError>): ResultPromise<TValue, TError> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).or(other);
    });
  }

  public fold<TNextValue>(
    mapOk: (value: TValue) => TNextValue,
    mapErr: (value: TError) => TNextValue,
  ): ResultPromise<TNextValue, TError, TNextValue> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).fold(mapOk, mapErr) as ResultPromise<TNextValue, TError>;
    }) as ResultPromise<TNextValue, TError, TNextValue>;
  }

  public unwrap(): ResultPromise<TValue, TError, TValue> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).unwrap() as ResultPromise<TValue, TError>;
    }) as ResultPromise<TValue, TError, TValue>;
  }

  public unwrapOr(other: TValue): ResultPromise<TValue, TError, TValue> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).unwrapOr(other) as ResultPromise<TValue, TError>;
    }) as ResultPromise<TValue, TError, TValue>;
  }

  public unwrapOrElse(fn: (value: TError) => TValue): ResultPromise<TValue, TError, TValue> {
    return this.then((value) => {
      return (value as Result<TValue, TError>).unwrapOrElse(fn) as ResultPromise<TValue, TError>;
    }) as ResultPromise<TValue, TError, TValue>;
  }

  public join<TNextValue, TNextError, TNextError2>(
    this: ResultPromise<Result<TNextValue, TNextError>, TNextError2>,
  ): ResultPromise<TNextValue, TNextError | TNextError2> {
    return this.then((value) => {
      return value.join();
    });
  }

  public default(value: TValue): ResultPromise<TValue, TError> {
    return this.then((v) => {
      return (v as Result<TValue, TError>).default(value);
    });
  }

  public zip<TNextValue, TNextError>(
    other: Result<TNextValue, TNextError> | ResultPromise<TNextValue, TNextError>,
  ): ResultPromise<[TValue, TNextValue], TError | TNextError> {
    return this.then((v) => {
      return (v as Result<TValue, TError>).zip(other);
    });
  }
}
