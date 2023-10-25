export const ResultKind = {
  Ok: "ok",
  Err: "err",
} as const;

export type ResultKindType = (typeof ResultKind)[keyof typeof ResultKind];
