const { spawn } = require('child_process');

function runOfflineTranslator(payload) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['offline_translate.py'], {
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('error', (err) => {
      reject(err);
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || `offline_translate.py exited with code ${code}`));
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse offline translation output: ${stdout}`));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

function looksLikeUntranslatedEnglish(original, translated) {
  const o = String(original || '').trim().toLowerCase();
  const t = String(translated || '').trim().toLowerCase();

  if (!o || !t) return false;
  if (o === t) return true;
  if (t.includes(o) || o.includes(t)) return true;

  const englishSignals = [
    'reading 1',
    'responsorial psalm',
    'gospel',
    'alleluia',
    'wednesday of the third week of easter',
    'there broke out a severe persecution',
    'jesus said to the crowds'
  ];

  return englishSignals.filter(p => t.includes(p)).length >= 2;
}

async function translateReadingBlock({ title, content, day_title }) {
  const safeTitle = String(title || '').trim();
  const safeContent = String(content || '').trim();
  const safeDayTitle = String(day_title || '').trim();

  const translated = await runOfflineTranslator({
    title: safeTitle,
    content: safeContent,
    day_title: safeDayTitle
  });

  const translatedTitle = String(translated.title || '').trim() || safeTitle;
  const translatedDayTitle = String(translated.day_title || '').trim() || safeDayTitle;
  const translatedContent = String(translated.content || '').trim() || safeContent;

  const unchangedCount = [
    looksLikeUntranslatedEnglish(safeTitle, translatedTitle),
    looksLikeUntranslatedEnglish(safeDayTitle, translatedDayTitle),
    looksLikeUntranslatedEnglish(safeContent, translatedContent)
  ].filter(Boolean).length;

  if (unchangedCount >= 2) {
    throw new Error('Offline translation returned mostly unchanged English text');
  }

  return {
    title: translatedTitle,
    day_title: translatedDayTitle,
    content: translatedContent
  };
}

module.exports = {
  translateReadingBlock
};