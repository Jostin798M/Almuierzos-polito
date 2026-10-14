// Convierte la lista pegada ("1. @~Nombre") en nombres limpios.

const INVISIBLES = /[​-‏⁠﻿ㅤᅟᅠ ]/g;

export function cleanName(raw: string): string {
  let s = raw.replace(INVISIBLES, " ").trim();
  // numero inicial: "12." "12)" "12-" "12:" "12 "
  s = s.replace(/^\s*\d+\s*[.)\-:]?\s*/, "");
  // @ y ~ al inicio (en cualquier combinacion)
  s = s.replace(/^[@~\s]+/, "");
  s = s.replace(/\s+/g, " ").trim();
  return s === "" ? "." : s;
}

/** Devuelve un nombre por linea no vacia. Las lineas sin contenido se ignoran. */
export function parseList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(INVISIBLES, " ").trim())
    .filter((l) => l.length > 0)
    .map(cleanName);
}

/** Clave para comparar nombres (ignora mayusculas, tildes, simbolos). */
export function nameKey(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  return base || name.trim().toLowerCase();
}

/** Nombres que no identifican a nadie y no deben ir a lista negra ni deduplicarse. */
export function isAnonymous(name: string): boolean {
  return name === "." || nameKey(name) === "extra";
}
