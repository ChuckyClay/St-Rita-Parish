async function translateText(text) {
  // TEMP VERSION (placeholder)
  // You will replace with real API later

  return text
    .replace(/Reading/gi, 'Somo')
    .replace(/Gospel/gi, 'Injili')
    .replace(/Responsorial Psalm/gi, 'Wimbo wa Katikati')
    .replace(/Alleluia/gi, 'Shangilio');
}

module.exports = { translateText };