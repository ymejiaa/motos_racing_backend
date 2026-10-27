const crypto = require("crypto");

const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";
const ESPECIALES = "@#$%&*!?.,-_";

const generarPassword = (longitud = 12) => {
  const alfabeto = MINUSCULAS + MAYUSCULAS + NUMEROS + ESPECIALES;

  // Garantizar al menos uno de cada tipo
  const obligatorios = [
    MINUSCULAS[crypto.randomInt(0, MINUSCULAS.length)],
    MAYUSCULAS[crypto.randomInt(0, MAYUSCULAS.length)],
    NUMEROS[crypto.randomInt(0, NUMEROS.length)],
    ESPECIALES[crypto.randomInt(0, ESPECIALES.length)],
  ];

  const restantes = [];
  for (let i = obligatorios.length; i < longitud; i++) {
    restantes.push(alfabeto[crypto.randomInt(0, alfabeto.length)]);
  }

  // Mezclar todo
  const passwordArray = [...obligatorios, ...restantes];
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }

  return passwordArray.join("");
};

module.exports = generarPassword;
