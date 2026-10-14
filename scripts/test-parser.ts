import { parseList, nameKey } from "../src/lib/parser";

const lista = `1. @~🪄✨️Santdy Farro🐢🌻 
2. @~Sebastián Aguirre 
3. @~Omarshiño 
13. @~Adrian Pincay :) 
15. @Mi Pulguita ❤️ 
17. @~. 
28. @~ㅤㅤ🐢👍ㅤㅤㅤㅤㅤ 
31. @~. 
34. @michael`;

const out = parseList(lista);
console.log(out);
const esperado = [
  "🪄✨️Santdy Farro🐢🌻",
  "Sebastián Aguirre",
  "Omarshiño",
  "Adrian Pincay :)",
  "Mi Pulguita ❤️",
  ".",
  "🐢👍",
  ".",
  "michael",
];
const bien = JSON.stringify(out) === JSON.stringify(esperado);
console.log(bien ? "PARSER OK" : "PARSER FALLA");
console.log(nameKey("Sebastián Aguirre") === nameKey("sebastian  aguirre") ? "KEY OK" : "KEY FALLA");
process.exit(bien ? 0 : 1);
