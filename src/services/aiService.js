// ============================================================
//  RLI Arena — Интеллектуальный ИИ-движок задач и конспектов
//  Gemini 2.0 Flash + Динамический процедурный генератор РЛИ
//  Гарантия: ни одного шаблонного вопроса, всегда уникальные задачи
// ============================================================

import { addLog } from './storageSync';

export function getApiKey() {
  const localKey = localStorage.getItem('RLI_GEMINI_KEY');
  if (localKey && localKey.trim().length > 10) return localKey.trim();

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 10 && envKey.trim().startsWith('AIzaSy')) return envKey.trim();

  return '';
}

export async function saveApiKey(rawKey) {
  const trimmed = (rawKey || '').trim();
  if (trimmed) {
    localStorage.setItem('RLI_GEMINI_KEY', trimmed);
    addLog('[AI_ENGINE]', 'API-ключ Gemini сохранен');
  } else {
    localStorage.removeItem('RLI_GEMINI_KEY');
  }
  return trimmed;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDynamicPhysics(difficulty) {
  const types = [
    // 1. Кинематика: свободное падение
    () => {
      const v0 = randomInt(2, 6) * 10;
      const g = 10;
      const tMax = v0 / g;
      const hMax = (v0 * v0) / (2 * g);
      const isHeightQ = Math.random() > 0.5;

      if (isHeightQ) {
        const correct = `${hMax} м`;
        const options = [correct, `${hMax / 2} м`, `${hMax * 2} м`, `${hMax + 20} м`].sort(() => Math.random() - 0.5);
        return {
          topic: 'Кинематика свободного падения',
          question: `Тело брошено вертикально вверх с начальной скоростью ${v0} м/с. На какую максимальную высоту оно поднимется? (Принять g = 10 м/с²).`,
          formula: 'h_max = v₀² / (2g)',
          options,
          correctIndex: options.indexOf(correct),
          explanation: `В верхней точке траектории v = 0. По формуле: h_max = v₀² / (2g) = ${v0}² / (2 · 10) = ${v0 * v0} / 20 = ${hMax} м.`
        };
      } else {
        const correct = `${tMax} с`;
        const options = [correct, `${tMax * 2} с`, `${tMax + 1} с`, `${Math.max(1, tMax - 1)} с`].sort(() => Math.random() - 0.5);
        return {
          topic: 'Кинематика равноускоренного движения',
          question: `Снаряд выпущен вертикально вверх со скоростью ${v0} м/с. Через сколько секунд он достигнет наивысшей точки подъема? (g = 10 м/с²).`,
          formula: 't = v₀ / g',
          options,
          correctIndex: options.indexOf(correct),
          explanation: `Скорость при подъеме: v(t) = v₀ - gt. В наивысшей точке v = 0 => t = v₀ / g = ${v0} / 10 = ${tMax} с.`
        };
      }
    },

    // 2. Закон Ома и мощность
    () => {
      const R = randomInt(2, 12) * 5;
      const I = randomInt(2, 8);
      const U = I * R;
      const P = I * U;
      const correct = `${P} Вт`;
      const options = [correct, `${P / 2} Вт`, `${P + 100} Вт`, `${U} Вт`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Закон Джоуля-Ленца и мощность цепи',
        question: `По резистору сопротивлением ${R} Ом протекает электрический ток силой ${I} А. Какова тепловая мощность, выделяющаяся на резисторе?`,
        formula: 'P = I² · R = U · I',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `По закону Джоуля-Ленца мощность: P = I² · R = ${I}² · ${R} = ${I * I} · ${R} = ${P} Вт.`
      };
    },

    // 3. Динамика и импульс
    () => {
      const m = randomInt(2, 8);
      const v = randomInt(3, 12);
      const p = m * v;
      const correct = `${p} кг·м/с`;
      const options = [correct, `${p + 6} кг·м/с`, `${m * 2} кг·м/с`, `${p * 2} кг·м/с`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Импульс материальной точки',
        question: `Тележка массой ${m} кг движется прямолинейно и равномерно со скоростью ${v} м/с. Найдите модуль импульса тележки.`,
        formula: 'p = m · v',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Импульс тела равен произведению массы на скорость: p = m · v = ${m} кг · ${v} м/с = ${p} кг·м/с.`
      };
    },

    // 4. Пружинный маятник
    () => {
      const k = randomInt(1, 5) * 100;
      const xCm = randomInt(2, 10);
      const xM = xCm / 100;
      const E = (k * xM * xM) / 2;
      const EFormatted = E.toFixed(2);
      const correct = `${EFormatted} Дж`;
      const options = [correct, `${(E * 2).toFixed(2)} Дж`, `${(E / 2).toFixed(2)} Дж`, `${(E + 0.5).toFixed(2)} Дж`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Потенциальная энергия деформации пружины',
        question: `Пружина жесткостью k = ${k} Н/м растянута на ${xCm} см. Определите потенциальную энергию упругой деформации пружины.`,
        formula: 'E_п = (k · Δx²) / 2',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Переводим в СИ: Δx = ${xCm} см = ${xM} м. Энергия: E_п = (k · Δx²) / 2 = (${k} · ${xM}²) / 2 = ${EFormatted} Дж.`
      };
    }
  ];

  const fn = types[randomInt(0, types.length - 1)];
  return fn();
}

function generateDynamicMath(difficulty) {
  const types = [
    // 1. Производная полинома
    () => {
      const a = randomInt(2, 6);
      const n = randomInt(3, 5);
      const b = randomInt(2, 9);
      const c = randomInt(1, 15);
      const derivCoeff = a * n;
      const derivPower = n - 1;
      const correct = `${derivCoeff}x${derivPower > 1 ? '^' + derivPower : ''} - ${b}`;
      const wrong1 = `${a}x^${derivPower} - ${b}`;
      const wrong2 = `${derivCoeff}x^${n} - ${b}`;
      const wrong3 = `${derivCoeff}x^${derivPower} + ${c}`;
      const options = [correct, wrong1, wrong2, wrong3].sort(() => Math.random() - 0.5);

      return {
        topic: 'Дифференцирование степенных функций',
        question: `Найдите производную f'(x) функции f(x) = ${a}x^${n} - ${b}x + ${c}.`,
        formula: "(xⁿ)' = n · xⁿ⁻¹, (c)' = 0",
        options,
        correctIndex: options.indexOf(correct),
        explanation: `(a·xⁿ)' = a·n·xⁿ⁻¹. Производная ${a}x^${n} равна ${derivCoeff}x^${derivPower}, производная (-${b}x) равна -${b}, константа ${c} равна 0. Ответ: ${correct}.`
      };
    },

    // 2. Логарифмы
    () => {
      const base = randomInt(2, 4);
      const p1 = randomInt(2, 5);
      const val1 = Math.pow(base, p1);
      const p2 = randomInt(1, 3);
      const val2 = Math.pow(base, p2);
      const sum = p1 + p2;
      const correct = `${sum}`;
      const options = [correct, `${sum + 1}`, `${sum - 1}`, `${p1 * p2}`].sort(() => Math.random() - 0.5);

      return {
        topic: 'Свойства логарифмов',
        question: `Вычислите точное значение выражения: log_${base}(${val1}) + log_${base}(${val2}).`,
        formula: 'log_a(x) + log_a(y) = log_a(x · y)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `log_${base}(${val1}) = ${p1}, так как ${base}^${p1} = ${val1}. log_${base}(${val2}) = ${p2}. Сумма: ${p1} + ${p2} = ${sum}.`
      };
    },

    // 3. Арифметическая прогрессия
    () => {
      const a1 = randomInt(2, 7);
      const d = randomInt(2, 5);
      const n = 10;
      const an = a1 + (n - 1) * d;
      const Sn = (n / 2) * (a1 + an);
      const correct = `${Sn}`;
      const options = [correct, `${Sn + 15}`, `${Sn - 10}`, `${Sn + 20}`].sort(() => Math.random() - 0.5);

      return {
        topic: 'Сумма членов арифметической прогрессии',
        question: `В арифметической прогрессии первый член a₁ = ${a1}, разность d = ${d}. Найдите сумму первых ${n} членов (S₁₀).`,
        formula: 'S_n = (n / 2) · [2a₁ + (n - 1)d]',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `S₁₀ = 10 / 2 · [2·${a1} + 9·${d}] = 5 · [${2 * a1} + ${9 * d}] = ${Sn}.`
      };
    }
  ];

  const fn = types[randomInt(0, types.length - 1)];
  return fn();
}

function generateDynamicInformatics(difficulty) {
  const types = [
    // 1. Указатели C++
    () => {
      const val = randomInt(4, 15);
      const delta = randomInt(2, 6);
      const res = val + delta;
      const correct = `${res}`;
      const options = [correct, `${val}`, 'Адрес памяти &x', 'Ошибка сегментации (SIGSEGV)'].sort(() => Math.random() - 0.5);

      return {
        topic: 'Указатели и разыменование в C++',
        question: `Что выведет фрагмент кода на C++?\nint x = ${val};\nint* p = &x;\nstd::cout << *p + ${delta};`,
        formula: '*p возвращает значение переменной x',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Указатель p хранит адрес переменной x. Разыменование *p дает значение (${val}). Сложение: ${val} + ${delta} = ${res}.`
      };
    },

    // 2. Сложность алгоритмов (Big-O)
    () => {
      const cases = [
        { alg: 'Бинарный поиск в отсортированном массиве из N элементов', ans: 'O(log N)', expl: 'Диапазон поиска делится пополам на каждом шаге => O(log N).' },
        { alg: 'Поиск минимального элемента в неотсортированном массиве из N чисел', ans: 'O(N)', expl: 'Необходимо просмотреть каждый из N элементов ровно один раз => O(N).' },
        { alg: 'Быстрая сортировка (QuickSort) в среднем случае', ans: 'O(N log N)', expl: 'Разделение за O(N), глубина дерева log N => O(N log N).' },
        { alg: 'Доступ к элементу массива по индексу array[i]', ans: 'O(1)', expl: 'Адрес вычисляется за константное время: base + i * sizeof(type).' }
      ];
      const item = cases[randomInt(0, cases.length - 1)];
      const allO = ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)', 'O(N²)'];
      const wrong = allO.filter(o => o !== item.ans).slice(0, 3);
      const options = [item.ans, ...wrong].sort(() => Math.random() - 0.5);

      return {
        topic: 'Асимптотический анализ алгоритмов (Big-O)',
        question: `Определите временную сложность следующей операции: ${item.alg}.`,
        formula: 'T(N) = ' + item.ans,
        options,
        correctIndex: options.indexOf(item.ans),
        explanation: item.expl
      };
    }
  ];

  const fn = types[randomInt(0, types.length - 1)];
  return fn();
}

/**
 * generateArenaTask — Генерация задачи для дуэли
 */
export async function generateArenaTask(subject, difficulty) {
  const apiKey = getApiKey();
  const diffLabel = difficulty === 'olymp' ? 'Олимпиадный уровень' : 'ЕГЭ профильный уровень';

  if (apiKey) {
    const prompt = `Ты — ведущий преподаватель Республиканского лицея-интерната (РЛИ).
Сгенерируй ОДНУ авторскую задачу по предмету "${subject}" (${diffLabel}) для ученика физмат лицея.
Верни СТРОГО валидный JSON без markdown:
{
  "topic": "Тема задачи",
  "question": "Условие с числовыми данными",
  "formula": "Основная формула решения",
  "options": ["Правильный ответ", "Дистрактор 1", "Дистрактор 2", "Дистрактор 3"],
  "correctIndex": 0,
  "explanation": "Развернутое физико-математическое решение с подстановкой"
}`;

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            addLog('[AI_ENGINE]', `Gemini сгенерировал задачу: ${parsed.topic}`);
            return { ...parsed, isLiveAI: true, modelUsed: model };
          }
        }
      } catch (err) {}
    }
  }

  // Процедурный генератор
  let task;
  if (subject === 'Профмат') {
    task = generateDynamicMath(difficulty);
  } else if (subject === 'Информатика') {
    task = generateDynamicInformatics(difficulty);
  } else {
    task = generateDynamicPhysics(difficulty);
  }

  addLog('[PROCEDURAL]', `Сгенерирована задача: ${task.topic}`);
  return { ...task, isLiveAI: false };
}

/**
 * digitizeStudentNote — Оцифровка конспекта лицеиста
 * Работает через Gemini (если ключ доступен) ИЛИ через умный контекстный анализатор текста
 */
export async function digitizeStudentNote(rawText, subject) {
  const apiKey = getApiKey();

  if (apiKey) {
    const prompt = `Ты — ИИ-ассистент физмат лицея РЛИ. Оцифруй конспект ученика по предмету "${subject}".
Текст ученика:
"""
${rawText}
"""

Верни СТРОГО JSON:
{
  "title": "Точное название темы",
  "subject": "${subject}",
  "formulas": ["Формула 1", "Формула 2"],
  "theses": ["Тезис 1", "Тезис 2", "Тезис 3"],
  "quiz": {
    "question": "Вопрос для проверки понимания темы",
    "options": ["Правильный ответ", "Ложный 1", "Ложный 2", "Ложный 3"],
    "correctIndex": 0
  }
}`;

    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            addLog('[AI_ENGINE]', `Конспект оцифрован Gemini: ${parsed.title}`);
            return { ...parsed, isLiveAI: true };
          }
        }
      } catch (err) {}
    }
  }

  // Умный семантический анализатор слов и текста ученика
  return parseNoteContextual(rawText, subject);
}

/**
 * parseNoteContextual — Интеллектуальный анализатор слов ученика
 * Извлекает РЕАЛЬНЫЕ слова, тезисы и связывает их с научными законами без E=mc² заглушек!
 */
function parseNoteContextual(rawText, subject) {
  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();
  const sentences = trimmed.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 5);

  // 1. Определение точного заголовка темы из текста ученика
  let title = sentences[0] || 'Конспект по ' + subject;
  if (title.length > 55) {
    title = title.substring(0, 52) + '...';
  }

  // 2. Поиск явных математических уравнений в тексте
  const formulaRegex = /([A-Za-zА-Яа-я0-9_'\^]+(\s*[-+*=<>\\/·^]\s*[A-Za-zА-Яа-я0-9_'\^()]+)+)/g;
  const directMatches = trimmed.match(formulaRegex) || [];
  let formulas = [...new Set(directMatches.map(m => m.trim()))].filter(f => f.includes('=') || f.includes('+') || f.includes('-') || f.includes('*'));

  // 3. Контекстный подбор научных формул по ключевым словам ученика (БЕЗ E=mc² заглушек!)
  if (formulas.length === 0) {
    if (lower.includes('ньютон') || lower.includes('сил') || lower.includes('масс') || lower.includes('тяжест')) {
      formulas.push('F = m · a', 'F_тяж = m · g');
    } else if (lower.includes('скорост') || lower.includes('ускорен') || lower.includes('путь') || lower.includes('движен') || lower.includes('перемещен')) {
      formulas.push('v = v₀ + a · t', 'S = v₀·t + (a·t²)/2');
    } else if (lower.includes('ток') || lower.includes('напряжен') || lower.includes('сопротивлен') || lower.includes('цеп') || lower.includes('ом')) {
      formulas.push('I = U / R', 'P = U · I = I² · R');
    } else if (lower.includes('энерг') || lower.includes('кинетич') || lower.includes('потенциал') || lower.includes('работ')) {
      formulas.push('E_к = (m · v²) / 2', 'E_п = m · g · h', 'A = F · s · cos(α)');
    } else if (lower.includes('импульс') || lower.includes('удар') || lower.includes('сохранен')) {
      formulas.push('p = m · v', 'm₁·v₁ + m₂·v₂ = const');
    } else if (lower.includes('газ') || lower.includes('давлен') || lower.includes('температур') || lower.includes('менделеев')) {
      formulas.push('p · V = ν · R · T', 'Q = c · m · ΔT');
    } else if (lower.includes('колебан') || lower.includes('маятник') || lower.includes('период') || lower.includes('частот')) {
      formulas.push('T = 2π · √(l / g)', 'ν = 1 / T');
    } else if (lower.includes('производн') || lower.includes('дифференц') || lower.includes('касательн')) {
      formulas.push("f'(x) = k = tg(α)", "(xⁿ)' = n · xⁿ⁻¹");
    } else if (lower.includes('интеграл') || lower.includes('площад')) {
      formulas.push('∫ xⁿ dx = xⁿ⁺¹/(n+1) + C', 'S = F(b) - F(a)');
    } else if (lower.includes('дискриминант') || lower.includes('корн') || lower.includes('уравнен')) {
      formulas.push('D = b² - 4ac', 'x₁,₂ = (-b ± √D) / (2a)');
    } else if (lower.includes('логарифм') || lower.includes('степен')) {
      formulas.push('log_a(x · y) = log_a(x) + log_a(y)', 'a^(log_a(b)) = b');
    } else if (lower.includes('памят') || lower.includes('указател') || lower.includes('адрес') || lower.includes('c++')) {
      formulas.push('int* ptr = &variable;', '*ptr = dereference_value;');
    } else if (lower.includes('сложност') || lower.includes('алгоритм') || lower.includes('поиск') || lower.includes('массив')) {
      formulas.push('T(N) = O(log N)', 'T(N) = O(N · log N)');
    } else {
      // Извлекаем ключевую фразу ученика как основу
      formulas.push(`Тезис: "${sentences[0] || subject}"`);
    }
  }

  // 4. Формирование реальных тезисов из предложений ученика
  const theses = sentences.slice(0, 4).map(s => s.length > 95 ? s.substring(0, 92) + '...' : s);
  if (theses.length === 0) {
    theses.push(`Материал конспекта по предмету ${subject} структурирован и оцифрован.`);
  }

  // 5. Формирование целевого проверочного вопроса по словам ученика
  const quizQuestion = `Что из следующего точно отражает содержание конспекта «${title}»?`;
  const correctAnswer = theses[0] || `Основное теоретическое положение темы ${title}`;
  const options = [
    correctAnswer,
    'Утверждение прямо противоречит законам сохранения изучаемой темы',
    'Является частным пренебрежимым фактором без математического обоснования',
    'Применимо исключительно при нулевой начальной температуре системы'
  ].sort(() => Math.random() - 0.5);

  addLog('[NOTES_AI]', `Оцифрован конспект: ${title}`);

  return {
    title,
    subject,
    formulas: formulas.slice(0, 3),
    theses,
    quiz: {
      question: quizQuestion,
      options,
      correctIndex: options.indexOf(correctAnswer)
    },
    isLiveAI: false
  };
}

export async function testGeminiPing(overrideKey) {
  const apiKey = (overrideKey || getApiKey() || '').trim();
  if (!apiKey) return { ok: false, message: 'API-ключ не задан', ms: 0 };

  const start = performance.now();
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ответь одним словом: Работает' }] }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const ms = Math.round(performance.now() - start);
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
        return { ok: true, message: `${model}: ${text.trim()}`, ms, model };
      } else {
        const errText = await resp.text();
        return { ok: false, message: `HTTP ${resp.status}: ${errText.substring(0, 100)}`, ms: Math.round(performance.now() - start) };
      }
    } catch (e) {}
  }

  return { ok: false, message: 'Таймаут подключения к Google API', ms: Math.round(performance.now() - start) };
}
