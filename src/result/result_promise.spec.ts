import { ResultUnwrappingError } from "./errors";
import { Result } from "./result";

describe("result with promise", () => {
  it("should create a positive result from a promise value through 'fromPromise' operator", async () => {
    const value = 5;
    const result = await Result.fromPromise(Promise.resolve(value));

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should create a negative result from a promise error through 'fromPromise' operator", async () => {
    const error = new Error("test");
    const result = await Result.fromPromise(Promise.reject(error));

    expect(result.isError()).toBeTruthy();
    expect(result.value).toEqual(error);
  });

  it.each([{ op: "map" }, { op: "mapOk" }] as const)(
    "should iterate on a positive result through $op operator",
    async ({ op }) => {
      const add10 = vi.fn((value: number) => value + 10);

      const value = 5;
      const result = await Result.fromPromise(Promise.resolve(value))[op](add10);

      expect(add10).toBeCalledTimes(1);
      expect(add10).toBeCalledWith(value);

      expect(result.isOk()).toBeTruthy();
      expect(result.value).toEqual(add10(value));
    },
  );

  it.each([{ op: "map" }, { op: "mapOk" }] as const)(
    "should not iterate on a negative result through $op operator",
    async ({ op }) => {
      const add10 = vi.fn((value: number) => value + 10);

      const error = new Error("test");
      const result = await Result.fromPromise(Promise.reject(error))[op](add10);

      expect(add10).toBeCalledTimes(0);

      expect(result.isError()).toBeTruthy();
      expect(result.value).toEqual(error);
    },
  );

  it("should iterate on a negative result through 'mapErr' operator", async () => {
    const error = new Error("test");
    const error2 = new TypeError("test");

    const result = await Result.fromPromise(Promise.reject(error)).mapErr(() => error2);

    expect(result.isError()).toBeTruthy();
    expect(result.value).toEqual(error2);
  });

  it("should not iterate through 'mapErr' operator if the result has positive value", async () => {
    const value = 5;
    const error = new TypeError("test");

    const result = await Result.fromPromise(Promise.resolve(value)).mapErr(() => error);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should iterate on a positive result through 'chain' operator", async () => {
    const mut2 = vi.fn((value: number) => Promise.resolve(value * 2));
    const add10 = vi.fn((value: number) => value + 10);

    const value = 5;

    const result = await Result.fromPromise<number, TypeError>(Promise.resolve(value))
      .chain((value) => Result.fromPromise(mut2(value)))
      .chain((value) => Result.Ok(add10(value)));

    expect(mut2).toBeCalledTimes(1);
    expect(mut2).toBeCalledWith(value);

    expect(add10).toBeCalledTimes(1);
    expect(add10).toBeCalledWith(await mut2(value));

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(add10(await mut2(value)));
  });

  it("should not iterate on a positive result through 'chain' operator", async () => {
    const mut2 = vi.fn((value: number) => value * 2);
    const add10 = vi.fn((value: number) => value + 10);

    const value = 5;
    const error = new Error("test");

    const result = await Result.fromPromise<number, TypeError>(Promise.resolve(value))
      .chain((value) => Result.Ok(mut2(value)))
      .chain(() => Result.fromPromise(Promise.reject(error)))
      .chain((value) => Result.Ok(add10(value)));

    expect(mut2).toBeCalledTimes(1);
    expect(mut2).toBeCalledWith(value);

    expect(add10).not.toBeCalled();

    expect(result.isError()).toBeTruthy();
    expect(result.value).toEqual(error);
  });

  it("should merge several positive results into one result", async () => {
    const result = await Result.merge([Result.Ok(5), Result.fromPromise(Promise.resolve("string")), Result.Ok(false)]);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual([5, "string", false]);
  });

  it("should stop merging several results into one result when one of the results has an error", async () => {
    const firstError = new TypeError("first");
    const lastError = new Error("last");

    const result = await Result.merge([
      Result.Ok(5),
      Result.fromPromise(Promise.reject(firstError)),
      Result.Ok("string"),
      Result.fromPromise(Promise.resolve(false)),
      Result.Err(lastError),
    ]);

    expect(result.isError()).toBeTruthy();
    expect(result.value).toEqual(firstError);
  });

  it("should replace a negative result with another result through 'or' operator", async () => {
    const value = 5;
    const error = new Error("test");

    const result = await Result.fromPromise<number, Error>(Promise.reject(error)).or(
      Result.fromPromise(Promise.resolve(value)),
    );

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should not replace a positive result with another result through 'or' operator", async () => {
    const value = 5;
    const value2 = 15;

    const result = await Result.fromPromise<number, Error>(Promise.resolve(value)).or(
      Result.fromPromise(Promise.resolve(value2)),
    );

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should fold a value for a positive result through 'fold' operator", async () => {
    const value = 5;
    const posValue = 10;
    const negValue = 15;

    const resultValue = await Result.fromPromise(Promise.resolve(value)).fold(
      () => posValue,
      () => negValue,
    );

    expect(resultValue).toEqual(posValue);
  });

  it("should fold a value for a negative result through 'fold' operator", async () => {
    const error = new Error("test");
    const posValue = 10;
    const negValue = 15;

    const resultValue = await Result.fromPromise(Promise.reject(error)).fold(
      () => posValue,
      () => negValue,
    );

    expect(resultValue).toEqual(negValue);
  });

  it("should unwrap value from a positive result", async () => {
    const value = 10;

    const resultValue = await Result.fromPromise(Promise.resolve(value)).unwrap();

    expect(resultValue).toEqual(value);
  });

  it("should throw an error while unwrapping a value from a negative result", () => {
    const error = new Error("test");
    const result = Result.fromPromise(Promise.reject(error));

    expect(result.unwrap()).rejects.toThrowError(new ResultUnwrappingError(error));
  });

  it("should unwrap and replace value if the result has a negative value", () => {
    const error = new Error("test");
    const value = 5;
    const result = Result.fromPromise<number, Error>(Promise.reject(error));

    expect(result.unwrapOr(value)).resolves.toEqual(value);
  });

  it("should not replace a value while unwrapping the positive result", () => {
    const value = 5;
    const value2 = 15;
    const result = Result.fromPromise<number, Error>(Promise.resolve(value));

    expect(result.unwrapOr(value2)).resolves.toEqual(value);
  });

  it("should unwrap and replace value returned by a function if the result has a negative value", () => {
    const error = new Error("test");
    const value = 5;
    const result = Result.fromPromise<number, Error>(Promise.reject(error));

    expect(result.unwrapOrElse(() => value)).resolves.toEqual(value);
  });

  it("should not replace a value returned by a function while unwrapping the positive result", () => {
    const value = 5;
    const value2 = 10;
    const result = Result.fromPromise<number, Error>(Promise.resolve(value));

    expect(result.unwrapOrElse(() => value2)).resolves.toEqual(value);
  });

  it("should join nested results", async () => {
    const value = 5;
    const other = Result.fromPromise(Promise.resolve(value));
    const result = await Result.fromPromise(Promise.resolve(other)).join();

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should set default value if the result has a negative value", async () => {
    const error = new Error("test");
    const defaultValue = 15;
    const result = await Result.fromPromise<number, Error>(Promise.reject(error)).default(defaultValue);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(defaultValue);
  });

  it("should zip current result with another result", async () => {
    const value = 15;
    const value2 = "string";
    const result = await Result.fromPromise<number, Error>(Promise.resolve(value)).zip(
      Result.Ok<string, TypeError>(value2),
    );

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual([value, value2]);
  });
});
