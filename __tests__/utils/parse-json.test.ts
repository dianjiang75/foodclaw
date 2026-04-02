import { extractJson } from "@/lib/utils/parse-json";

describe("extractJson", () => {
  it("parses raw JSON directly", () => {
    expect(extractJson('{"name":"test"}')).toEqual({ name: "test" });
  });

  it("parses JSON array", () => {
    expect(extractJson('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it("extracts JSON from markdown fences", () => {
    const input = '```json\n{"dish":"Pad Thai","calories":450}\n```';
    expect(extractJson(input)).toEqual({ dish: "Pad Thai", calories: 450 });
  });

  it("extracts JSON from fences without language tag", () => {
    const input = '```\n[{"name":"sushi"}]\n```';
    expect(extractJson(input)).toEqual([{ name: "sushi" }]);
  });

  it("extracts JSON with leading/trailing text", () => {
    const input = 'Here is the analysis:\n{"dish":"Ramen","confidence":0.9}\nHope that helps!';
    expect(extractJson(input)).toEqual({ dish: "Ramen", confidence: 0.9 });
  });

  it("extracts array with leading text", () => {
    const input = 'The results are:\n[{"name":"A"},{"name":"B"}]\nDone.';
    expect(extractJson(input)).toEqual([{ name: "A" }, { name: "B" }]);
  });

  it("throws on completely invalid input", () => {
    expect(() => extractJson("no json here at all")).toThrow("Failed to extract JSON");
  });

  it("throws on empty string", () => {
    expect(() => extractJson("")).toThrow("Failed to extract JSON");
  });

  it("handles nested objects", () => {
    const input = '{"macros":{"calories":{"min":400,"max":500}}}';
    expect(extractJson(input)).toEqual({ macros: { calories: { min: 400, max: 500 } } });
  });
});
