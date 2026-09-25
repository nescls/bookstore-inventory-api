import validator from "validator";
export function canonicalIsbn(input: string) {
  const isbn = input.replace(/[\s-]/g, "").toUpperCase();
  if (!validator.isISBN(isbn)) return null;
  if (isbn.length === 13)
    return /^(978|979)/.test(isbn) && !isbn.startsWith("9790") ? isbn : null;
  const isbn13Prefix = `978${isbn.slice(0, 9)}`;
  const weightedSum = [...isbn13Prefix].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return isbn13Prefix + ((10 - (weightedSum % 10)) % 10);
}
export function requireCanonicalIsbn(isbn: string) {
  const canonical = canonicalIsbn(isbn);
  if (!canonical) throw new Error("ISBN must be validated first");
  return canonical;
}
