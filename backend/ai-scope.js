const CATHOLIC_KEYWORDS = [
  'catholic', 'church', 'mass', 'eucharist', 'communion', 'confession',
  'reconciliation', 'rosary', 'saint', 'saints', 'mary', 'jesus', 'gospel',
  'bible', 'scripture', 'reading', 'readings', 'prayer', 'pray', 'novena',
  'adoration', 'liturgy', 'homily', 'catechism', 'catechesis', 'sacrament',
  'sacraments', 'baptism', 'confirmation', 'matrimony', 'marriage',
  'anointing', 'holy day', 'feast', 'lent', 'advent', 'easter', 'christmas',
  'pope', 'vatican', 'sin', 'grace', 'salvation', 'mercy', 'holy spirit',
  'blessed sacrament', 'stations of the cross'
];

const PARISH_KEYWORDS = [
  'st rita', 'st. rita', 'parish', 'priest', 'mass time', 'mass times',
  'announcement', 'announcements', 'event', 'events', 'group', 'groups',
  'ministry', 'ministries', 'contact', 'phone', 'daily readings',
  'kiswahili', 'english'
];

function isCatholicOrParishQuestion(message) {
  const text = String(message || '').toLowerCase().trim();
  if (!text) return false;

  return [...CATHOLIC_KEYWORDS, ...PARISH_KEYWORDS].some(keyword =>
    text.includes(keyword)
  );
}

module.exports = { isCatholicOrParishQuestion };