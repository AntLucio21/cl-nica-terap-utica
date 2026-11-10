import { describe, expect, it } from "vitest";
import { formatBrPhone, isValidBrPhone, toStoredPhone } from "./phone";

describe("telefone", () => {
  it("aceita fixo com 10 dígitos", () => expect(isValidBrPhone("8486438775")).toBe(true));
  it("aceita celular com 11 dígitos começando com 9", () => expect(isValidBrPhone("(84) 98643-8775")).toBe(true));
  it("recusa 11 dígitos sem o 9", () => expect(isValidBrPhone("84886438775")).toBe(false));
  it("recusa número curto", () => expect(isValidBrPhone("986438775")).toBe(false));
  it("salva só dígitos com 55", () => expect(toStoredPhone("(84) 98643-8775")).toBe("5584986438775"));
  it("exibe formatado", () => expect(formatBrPhone("5584986438775")).toBe("(84) 98643-8775"));
});
