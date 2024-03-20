import { ResultUnwrappingError } from "./errors";
import { Result } from "./result";

describe("result", () => {
  it.each([{ op: "Ok" }, { op: "of" }, { op: "from" }] as const)(
    "should create a positive result with a value through $op operator",
    ({ op }) => {
      const value = 5;
      const result = Result[op](value);

      expect(result.isOk()).toBeTruthy();
      expect(result.isErr()).toBeFalsy();
      expect(result.value).toEqual(value);
    },
  );

  it("should create a negative result with an error through 'Err' operator", () => {
    const error = new Error("test");
    const result = Result.Err(error);

    expect(result.isOk()).toBeFalsy();
    expect(result.isErr()).toBeTruthy();
    expect(result.value).toEqual(error);
  });

  it("should create a positive result from a function through 'fromTry' operator", () => {
    const value = 5;
    const result = Result.fromTry(() => value);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should create a negative result from a function through 'fromTry' operator", () => {
    const error = new Error("test");
    const result = Result.fromTry<number, Error>(() => {
      throw error;
    });

    expect(result.isErr()).toBeTruthy();
    expect(result.value).toEqual(error);
  });

  it.each([{ op: "map" }, { op: "mapOk" }] as const)(
    "should iterate on a positive result through $op operator",
    ({ op }) => {
      const add10 = vi.fn((value: number) => value + 10);

      const value = 5;
      const result = Result.of(value)[op](add10);

      expect(add10).toBeCalledTimes(1);
      expect(add10).toBeCalledWith(value);

      expect(result.isOk()).toBeTruthy();
      expect(result.value).toEqual(add10(value));
    },
  );

  it.each([{ op: "map" }, { op: "mapOk" }] as const)(
    "should not iterate on a negative result through $op operator",
    ({ op }) => {
      const add10 = vi.fn((value: number) => value + 10);

      const error = new Error("test");
      const result = Result.Err(error)[op](add10);

      expect(add10).not.toBeCalled();

      expect(result.isErr()).toBeTruthy();
      expect(result.value).toEqual(error);
    },
  );

  it("should iterate on a negative result through 'mapErr' operator", () => {
    const error = new Error("test");
    const error2 = new TypeError("test");

    const result = Result.Err(error).mapErr(() => error2);

    expect(result.isErr()).toBeTruthy();
    expect(result.value).toEqual(error2);
  });

  it("should not iterate through 'mapErr' operator by error if the result has positive value", () => {
    const value = 5;
    const error = new TypeError("test");

    const result = Result.of(value).mapErr(() => error);

    expect(result.isErr()).toBeFalsy();
    expect(result.value).toEqual(value);
  });

  it("should not iterate on a negative result through 'mapErr' operator", () => {
    const value = 5;
    const error = new Error("test");
    const result = Result.Ok(value).mapErr(() => error);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should not iterate on a positive result through 'chain'", () => {
    const mut2 = vi.fn((value: number) => value * 2);
    const add10 = vi.fn((value: number) => value + 10);

    const value = 5;
    const error = new Error("test");

    const result = Result.of<number, TypeError>(value)
      .chain((value) => Result.Ok(mut2(value)))
      .chain(() => Result.Err(error))
      .chain((value) => Result.Ok(add10(value)));

    expect(mut2).toBeCalledTimes(1);
    expect(mut2).toBeCalledWith(value);

    expect(add10).not.toBeCalled();

    expect(result.isErr()).toBeTruthy();
    expect(result.value).toEqual(error);
  });

  it("should merge several positive results into one result", () => {
    const result = Result.merge([Result.Ok(5), Result.Ok("string"), Result.Ok(false)]);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual([5, "string", false]);
  });

  it("should stop merging several results into one result when one of the results has an error", () => {
    const firstError = new TypeError("first");
    const lastError = new Error("last");

    const result = Result.merge([
      Result.Ok(5),
      Result.Err(firstError),
      Result.Ok("string"),
      Result.Ok(false),
      Result.Err(lastError),
    ]);

    expect(result.isErr()).toBeTruthy();
    expect(result.value).toEqual(firstError);
  });

  it("should replace a negative result other result", () => {
    const value = 5;
    const error = new Error("test");

    const result = Result.Err<number, Error>(error).or(Result.of(value));

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should not replace a positive result other result", () => {
    const value1 = 5;
    const value2 = 10;

    const result = Result.of(value1).or(Result.of(value2));

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value1);
  });

  it("should fold a value for a positive result", () => {
    const value = 5;
    const posValue = 10;
    const negValue = 15;

    const resultValue = Result.of(value).fold(
      () => posValue,
      () => negValue,
    );

    expect(resultValue).toEqual(posValue);
  });

  it("should fold a value for a negative result", () => {
    const error = new Error("test");
    const posValue = 10;
    const negValue = 15;

    const resultValue = Result.Err(error).fold(
      () => posValue,
      () => negValue,
    );

    expect(resultValue).toEqual(negValue);
  });

  it("should unwrap value from a positive result", () => {
    const value = 10;

    const resultValue = Result.of(value).unwrap();

    expect(resultValue).toEqual(value);
  });

  it("should throw an error while unwrapping a value from a negative result", () => {
    const error = new Error("test");
    const result = Result.Err(error);

    expect(() => result.unwrap()).toThrowError(new ResultUnwrappingError(error));
  });

  it("should unwrap and replace value if the result has a negative value", () => {
    const error = new Error("test");
    const value = 5;
    const result = Result.Err<number, Error>(error);

    expect(result.unwrapOr(value)).toEqual(value);
  });

  it("should not replace a value while unwrapping the positive result", () => {
    const value = 5;
    const value2 = 15;
    const result = Result.Ok<number, Error>(value);

    expect(result.unwrapOr(value2)).toEqual(value);
  });

  it("should unwrap and replace value returned by a function if the result has a negative value", () => {
    const error = new Error("test");
    const value = 5;
    const result = Result.Err<number, Error>(error);

    expect(result.unwrapOrElse(() => value)).toEqual(value);
  });

  it("should not replace a value returned by a function while unwrapping the positive result", () => {
    const value = 5;
    const value2 = 10;
    const result = Result.Ok<number, Error>(value);

    expect(result.unwrapOrElse(() => value2)).toEqual(value);
  });

  it("should join nested results", () => {
    const value = 5;
    const result = Result.Ok(Result.Ok(value)).join();

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(value);
  });

  it("should set default value if the result has a negative value", () => {
    const error = new Error("test");
    const defaultValue = 15;
    const result = Result.Err<number, Error>(error).default(defaultValue);

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual(defaultValue);
  });

  it("should zip current result with another result", () => {
    const value = 15;
    const value2 = "string";
    const result = Result.Ok<number, Error>(value).zip(Result.Ok<string, TypeError>(value2));

    expect(result.isOk()).toBeTruthy();
    expect(result.value).toEqual([value, value2]);
  });

  it("should display a string tag", () => {
    const result = Result.Ok(5);

    expect(`${result}`).toEqual("[object Result]");
  });
});
