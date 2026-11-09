import { describe, expect, it } from "vitest";
import { phoneFormatProblem } from "./phoneValidation";

describe("phoneFormatProblem", () => {
  it("accepts mobile with and without 55 and punctuation", () => {
    expect(phoneFormatProblem("(11) 98765-4321")).toBeNull();
    expect(phoneFormatProblem("5511987654321")).toBeNull();
  });
  it("accepts landline with 10 digits", () => expect(phoneFormatProblem("1133334444")).toBeNull());
  it("flags empty", () => expect(phoneFormatProblem("")).toBe("vazio"));
  it("flags short", () => expect(phoneFormatProblem("98765-4321")).toBe("curto"));
  it("flags too long", () => expect(phoneFormatProblem("119876543210")).toBe("longo"));
  it("flags invalid DDD", () => expect(phoneFormatProblem("0598765432")).toBe("ddd"));
  it("flags 11-digit not starting with 9", () => expect(phoneFormatProblem("11887654321")).toBe("celular"));
});
