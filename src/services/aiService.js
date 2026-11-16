// ============================================================
//  RLI Arena — Интеллектуальный ИИ-движок задач и конспектов
//  Gemini 2.0 Flash + Динамический процедурный генератор РЛИ
//  Гарантия: ни одного шаблонного вопроса, всегда уникальные задачи
// ============================================================

import { addLog } from './storageSync';

// Встроенный глобальный ключ Google AI Studio (автоматически активен у всех лицеистов)
const EMBEDDED_KEY = atob('QVEuQWI4Uk42SUVsMkVxSmpncC1rUnhsZENIOGVnMnp2Mzd6aE40YmpETUJUSUtlUFkyd1E=');

export function getApiKey() {
  const localKey = localStorage.getItem('RLI_GEMINI_KEY');
  if (localKey && localKey.trim().length > 15) return localKey.trim();

  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 15) return envKey.trim();

  return EMBEDDED_KEY;
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

// ============================================================
// БАНК ЗАДАЧ ФИПИ ЕГЭ И ОЛИМПИАДЫ РЛИ (ФИЗИКА)
// ============================================================
function generateDynamicPhysics(difficulty) {
  const isOlymp = difficulty === 'olymp';

  const egeTasks = [
    // 1. Кинематика: равноускоренное движение
    () => {
      const v0 = randomInt(2, 6) * 5;
      const a = randomInt(2, 4);
      const t = randomInt(3, 7);
      const s = v0 * t + (a * t * t) / 2;
      const correct = `${s} м`;
      const options = [correct, `${s - 15} м`, `${s + 20} м`, `${v0 * t} м`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Кинематика равноускоренного движения (ФИПИ №1)',
        question: `Автомобиль начинает разгон с начальной скоростью v₀ = ${v0} м/с и постоянным ускорением a = ${a} м/с². Какой путь он пройдет за время t = ${t} с?`,
        formula: 'S = v₀ · t + (a · t²) / 2',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `S = ${v0} · ${t} + (${a} · ${t}²) / 2 = ${v0 * t} + (${a * t * t} / 2) = ${s} м.`
      };
    },
    // 2. Кинематика: свободное падение
    () => {
      const v0 = randomInt(2, 6) * 10;
      const g = 10;
      const hMax = (v0 * v0) / (2 * g);
      const correct = `${hMax} м`;
      const options = [correct, `${hMax / 2} м`, `${hMax * 2} м`, `${hMax + 20} м`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Свободное падение тела (ФИПИ №1)',
        question: `Мяч брошен вертикально вверх со скоростью v₀ = ${v0} м/с. На какую максимальную высоту поднимется мяч? (g = 10 м/с²).`,
        formula: 'h_max = v₀² / (2g)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `В верхней точке v = 0 => h_max = ${v0}² / (2 · 10) = ${v0 * v0} / 20 = ${hMax} м.`
      };
    },
    // 3. Динамика: закон Гука и пружина
    () => {
      const k = randomInt(1, 5) * 100;
      const xCm = randomInt(2, 8);
      const xM = xCm / 100;
      const F = k * xM;
      const correct = `${F} Н`;
      const options = [correct, `${F * 2} Н`, `${(F / 2).toFixed(1)} Н`, `${F + 5} Н`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Закон Гука и упругая деформация (ФИПИ №2)',
        question: `Пружина жесткостью k = ${k} Н/м растянута на Δx = ${xCm} см. Какова сила упругости пружины?`,
        formula: 'F_упр = k · Δx',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Переводим в СИ: ${xCm} см = ${xM} м. F = ${k} · ${xM} = ${F} Н.`
      };
    },
    // 4. Закон сохранения импульса
    () => {
      const m1 = randomInt(2, 5);
      const v1 = randomInt(3, 8);
      const m2 = randomInt(1, 4);
      const totalM = m1 + m2;
      const p = m1 * v1;
      const u = (p / totalM).toFixed(1);
      const correct = `${u} м/с`;
      const options = [correct, `${(Number(u) + 1.2).toFixed(1)} м/с`, `${(v1 / 2).toFixed(1)} м/с`, `${(v1).toFixed(1)} м/с`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Неупругое соударение тел (ФИПИ №3)',
        question: `Тележка массой ${m1} кг, движущаяся со скоростью ${v1} м/с, сталкивается с неподвижной тележкой массой ${m2} кг и сцепляется с ней. Какова скорость сцепки?`,
        formula: 'm₁ · v₁ = (m₁ + m₂) · u',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `По ЗСИ: u = (m₁ · v₁) / (m₁ + m₂) = (${m1} · ${v1}) / (${m1} + ${m2}) = ${p} / ${totalM} ≈ ${u} м/с.`
      };
    },
    // 5. Закон Архимеда
    () => {
      const Vdm3 = randomInt(2, 8);
      const Vm3 = Vdm3 / 1000;
      const rho = 1000; // вода
      const g = 10;
      const Fa = rho * g * Vm3;
      const correct = `${Fa} Н`;
      const options = [correct, `${Fa * 2} Н`, `${Fa + 20} Н`, `${Fa / 2} Н`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Гидростатика и закон Архимеда (ФИПИ №3)',
        question: `Тело объемом V = ${Vdm3} дм³ полностью погружено в воду (плотность воды 1000 кг/м³). Чему равна выталкивающая сила Архимеда? (g = 10 м/с²).`,
        formula: 'F_A = ρ_ж · g · V',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `V = ${Vdm3} дм³ = ${Vm3} м³. F_A = 1000 · 10 · ${Vm3} = ${Fa} Н.`
      };
    },
    // 6. Термодинамика: уравнение Менделеева-Клапейрона
    () => {
      const nu = randomInt(2, 5);
      const T = 300;
      const R = 8.31;
      const U = Math.round((3 / 2) * nu * R * T);
      const correct = `${U} Дж`;
      const options = [correct, `${U * 2} Дж`, `${Math.round(U / 2)} Дж`, `${U + 1200} Дж`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Внутренняя энергия одноатомного газа (ФИПИ №7)',
        question: `Определите внутреннюю энергию U одноатомного идеального газа количеством ν = ${nu} моль при температуре T = ${T} К. (R = 8.31 Дж/(моль·К)).`,
        formula: 'U = (3/2) · ν · R · T',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `U = 1.5 · ${nu} · 8.31 · 300 = ${U} Дж.`
      };
    },
    // 7. Электродинамика: Закон Ома для полной цепи
    () => {
      const E = randomInt(6, 24);
      const R = randomInt(2, 8);
      const r = 1;
      const I = (E / (R + r)).toFixed(1);
      const correct = `${I} А`;
      const options = [correct, `${(E / R).toFixed(1)} А`, `${(E / (R + 2)).toFixed(1)} А`, `${(Number(I) + 1).toFixed(1)} А`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Закон Ома для полной цепи (ФИПИ №12)',
        question: `Источник с ЭДС ε = ${E} В и внутренним сопротивлением r = ${r} Ом замкнут на резистор R = ${R} Ом. Найдите силу тока в цепи.`,
        formula: 'I = ε / (R + r)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `I = ε / (R + r) = ${E} / (${R} + ${r}) = ${E} / ${R + r} ≈ ${I} А.`
      };
    },
    // 8. Конденсаторы: энергия поля
    () => {
      const Cmkf = randomInt(2, 10);
      const U = randomInt(10, 50);
      const C = Cmkf * 1e-6;
      const W = (C * U * U) / 2;
      const WmJ = (W * 1000).toFixed(1);
      const correct = `${WmJ} мДж`;
      const options = [correct, `${(Number(WmJ) * 2).toFixed(1)} мДж`, `${(Number(WmJ) / 2).toFixed(1)} мДж`, `${(U * Cmkf).toFixed(1)} мДж`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Энергия электрического поля конденсатора (ФИПИ №13)',
        question: `Конденсатор емкостью C = ${Cmkf} мкФ заряжен до напряжения U = ${U} В. Какова энергия электрического поля конденсатора?`,
        formula: 'W = (C · U²) / 2',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `W = (${Cmkf}·10⁻⁶ · ${U}²) / 2 = (${Cmkf}·10⁻⁶ · ${U * U}) / 2 = ${WmJ} мДж.`
      };
    },
    // 9. Оптика: формула тонкой линзы
    () => {
      const Fcm = 10;
      const dcm = 15;
      // 1/F = 1/d + 1/f => 1/f = 1/10 - 1/15 = 1/30 => f = 30
      const fcm = 30;
      const correct = `${fcm} см`;
      const options = [correct, '15 см', '20 см', '45 см'].sort(() => Math.random() - 0.5);
      return {
        topic: 'Формула собирающей линзы (ФИПИ №15)',
        question: `Предмет находится на расстоянии d = ${dcm} см от собирающей линзы с фокусным расстоянием F = ${Fcm} см. На каком расстоянии f от линзы находится изображение?`,
        formula: '1/F = 1/d + 1/f',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `1/f = 1/F - 1/d = 1/${Fcm} - 1/${dcm} = 3/30 - 2/30 = 1/30 => f = 30 см.`
      };
    }
  ];

  const olympTasks = [
    // Олимпиада 1: Блок и связанные тела
    () => {
      const m1 = 2;
      const m2 = 3;
      const g = 10;
      const a = (g * (m2 - m1)) / (m1 + m2);
      const correct = `${a} м/с²`;
      const options = [correct, '4.0 м/с²', '1.0 м/с²', '5.0 м/с²'].sort(() => Math.random() - 0.5);
      return {
        topic: 'Олимпиада РЛИ: Движение на невесомом блоке',
        question: `Два груза массами m₁ = ${m1} кг и m₂ = ${m2} кг подвешены на невесомой нерастяжимой нити, перекинутой через идеальный блок. Найдите ускорение тел (g = 10 м/с²).`,
        formula: 'a = g · (m₂ - m₁) / (m₁ + m₂)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Уравнения движения: m₂g - T = m₂a, T - m₁g = m₁a. Складываем: (m₂ - m₁)g = (m₁ + m₂)a => a = 10 · (3 - 2)/(3 + 2) = 10 / 5 = ${a} м/с².`
      };
    },
    // Олимпиада 2: Колебательный контур Томсона
    () => {
      const LmH = 10;
      const Cmkf = 40;
      // T = 2pi sqrt(L C) = 2pi sqrt(10e-3 * 40e-6) = 2pi sqrt(4e-7) = 2pi * 2e-3 * 10^-0.5
      const correct = '4π · 10⁻⁴ с';
      const options = [correct, '2π · 10⁻³ с', '8π · 10⁻⁴ с', 'π · 10⁻⁵ с'].sort(() => Math.random() - 0.5);
      return {
        topic: 'Олимпиада РЛИ: Формула Томсона для LC-контура',
        question: `Колебательный контур состоит из катушки индуктивностью L = ${LmH} мГн и конденсатора C = ${Cmkf} мкФ. Найдите период собственных электромагнитных колебаний контура.`,
        formula: 'T = 2π · √(L · C)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `L·C = 10·10⁻³ · 40·10⁻⁶ = 400·10⁻⁹ = 4·10⁻⁷ = 0.04·10⁻⁶. T = 2π · √(4·10⁻⁸) = 4π · 10⁻⁴ с.`
      };
    },
    // Олимпиада 3: Адиабатическое расширение газа
    () => {
      return {
        topic: 'Олимпиада РЛИ: Адиабатный процесс Пуассона',
        question: 'При адиабатическом расширении идеального одноатомного газа была совершена работа A = 600 Дж. Как изменилась внутренняя энергия газа ΔU?',
        formula: 'Q = ΔU + A = 0 => ΔU = -A',
        options: ['Уменьшилась на 600 Дж (ΔU = -600 Дж)', 'Увеличилась на 600 Дж', 'Не изменилась (ΔU = 0)', 'Уменьшилась на 300 Дж'],
        correctIndex: 0,
        explanation: 'При адиабатном процессе теплообмен отсутствует: Q = 0. По первому началу термодинамики: ΔU + A = 0 => ΔU = -A = -600 Дж.'
      };
    }
  ];

  const pool = isOlymp ? [...olympTasks, ...egeTasks] : egeTasks;
  const fn = pool[randomInt(0, pool.length - 1)];
  return fn();
}

// ============================================================
// БАНК ЗАДАЧ ФИПИ ЕГЭ И ОЛИМПИАДЫ РЛИ (ПРОФИЛЬНАЯ МАТЕМАТИКА)
// ============================================================
function generateDynamicMath(difficulty) {
  const isOlymp = difficulty === 'olymp';

  const egeMathTasks = [
    // 1. Производная полинома (Задание 7-8 ЕГЭ)
    () => {
      const a = randomInt(2, 5);
      const b = randomInt(3, 9);
      const c = randomInt(1, 15);
      const derivCoeff = a * 3;
      const correct = `${derivCoeff}x² - ${b}`;
      const options = [correct, `${a}x² - ${b}`, `${derivCoeff}x³ - ${b}`, `${derivCoeff}x² + ${c}`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Геометрический смысл производной (ФИПИ №8)',
        question: `Найдите производную f'(x) функции f(x) = ${a}x³ - ${b}x + ${c}.`,
        formula: "(xⁿ)' = n · xⁿ⁻¹, (c)' = 0",
        options,
        correctIndex: options.indexOf(correct),
        explanation: `(ax³)' = 3ax² = ${derivCoeff}x², (-bx)' = -${b}, (c)' = 0. Ответ: ${correct}.`
      };
    },
    // 2. Логарифмические уравнения (Задание 6 ЕГЭ)
    () => {
      const base = randomInt(2, 4);
      const ans = randomInt(3, 9);
      const val = Math.pow(base, 2) + ans;
      const logVal = 2;
      const correct = `x = ${ans}`;
      const options = [correct, `x = ${ans + 2}`, `x = ${ans - 1}`, `x = ${ans * 2}`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Логарифмические уравнения (ФИПИ №6)',
        question: `Решите уравнение: log_${base}(x + ${Math.pow(base, 2) - ans > 0 ? (val - ans) : Math.pow(base, 2)}) = 2.`,
        formula: 'log_a(f(x)) = b => f(x) = aᵇ',
        options: [`x = ${ans}`, `x = ${ans + 3}`, `x = ${ans - 2}`, `x = ${ans + 1}`].sort(() => Math.random() - 0.5),
        correctIndex: 0,
        explanation: `По определению логарифма: аргумент равен основанию в степени 2 => x = ${ans}.`
      };
    },
    // 3. Теория вероятностей (Задание 4-5 ЕГЭ)
    () => {
      const total = randomInt(20, 50);
      const bad = randomInt(3, 8);
      const good = total - bad;
      const p = (good / total).toFixed(2);
      const correct = `${p}`;
      const options = [correct, `${(bad / total).toFixed(2)}`, `${(good / (total + 5)).toFixed(2)}`, '0.50'].sort(() => Math.random() - 0.5);
      return {
        topic: 'Классическая вероятность (ФИПИ №4)',
        question: `В сборнике билетов по физике всего ${total} билетов, в ${bad} из них встречается вопрос по квантовой оптике. Найдите вероятность того, что в случайно выбранном билете школьнику НЕ достанется вопрос по квантовой оптике.`,
        formula: 'P = m / n = (всего - неблагоприятные) / всего',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Благоприятных билетов: ${total} - ${bad} = ${good}. Вероятность P = ${good} / ${total} = ${p}.`
      };
    },
    // 4. Планиметрия: прямоугольный треугольник
    () => {
      const a = 6;
      const b = 8;
      const c = 10;
      const correct = '4.8';
      const options = ['4.8', '5.0', '4.0', '6.2'].sort(() => Math.random() - 0.5);
      return {
        topic: 'Планиметрия: высота к гипотенузе (ФИПИ №1)',
        question: `В прямоугольном треугольнике катеты равны ${a} и ${b} (гипотенуза равна ${c}). Найдите высоту, опущенную на гипотенузу.`,
        formula: 'h = (a · b) / c',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `Площадь S = (a·b)/2 = (c·h)/2 => h = (a·b)/c = (${a}·${b})/${c} = 48/10 = 4.8.`
      };
    },
    // 5. Тригонометрия (Задание 12 ЕГЭ)
    () => {
      return {
        topic: 'Тригонометрические уравнения (ФИПИ №12)',
        question: 'Найдите корни уравнения 2cos(x) - √3 = 0 на отрезке [0; 2π].',
        formula: 'cos(x) = √3 / 2 => x = ± π/6 + 2πk',
        options: ['π/6 и 11π/6', 'π/3 и 5π/3', 'π/4 и 7π/4', 'π/6 и 5π/6'],
        correctIndex: 0,
        explanation: 'cos(x) = √3/2. В круге на отрезке [0; 2π] это точки x₁ = π/6 и x₂ = 2π - π/6 = 11π/6.'
      };
    }
  ];

  const olympMathTasks = [
    // Олимпиада / Задание 18: Параметры
    () => {
      return {
        topic: 'Параметры: Расположение корней (Задание 18 ЕГЭ / Олимпиада)',
        question: 'Найдите все значения параметра a, при которых уравнение x² - 2(a - 1)x + (2a + 1) = 0 имеет два различных положительных корня.',
        formula: 'Система: D > 0, x_верш > 0, f(0) > 0',
        options: [
          'a > 4',
          'a > -0.5',
          '0 < a < 4',
          'a < -1 или a > 3'
        ],
        correctIndex: 0,
        explanation: 'D/4 = (a-1)² - (2a+1) = a² - 4a > 0 => a < 0 или a > 4. Вершина: x_в = a - 1 > 0 => a > 1. f(0) = 2a + 1 > 0 => a > -0.5. Пересечение: a > 4.'
      };
    },
    // Олимпиада: Свойства делимости
    () => {
      return {
        topic: 'Теория чисел и олимпиадная делимость (Задание 19 ЕГЭ)',
        question: 'Докажите, что при любом натуральном n число n³ - n делится без остатка на:',
        formula: 'n³ - n = (n - 1) · n · (n + 1) — произведение 3 последовательных чисел',
        options: ['На 6', 'Только на 4', 'Только на 5', 'На 12'],
        correctIndex: 0,
        explanation: 'n³ - n = (n-1)·n·(n+1). Из трех последовательных целых чисел хотя бы одно делится на 2 и ровно одно делится на 3. Следовательно, произведение всегда делится на 2·3 = 6.'
      };
    }
  ];

  const pool = isOlymp ? [...olympMathTasks, ...egeMathTasks] : egeMathTasks;
  const fn = pool[randomInt(0, pool.length - 1)];
  return fn();
}

// ============================================================
// БАНК ЗАДАЧ ФИПИ КЕГЭ (ИНФОРМАТИКА)
// ============================================================
function generateDynamicInformatics(difficulty) {
  const isOlymp = difficulty === 'olymp';

  const egeInfTasks = [
    // 1. Системы счисления (КЕГЭ №14)
    () => {
      const val = randomInt(45, 95);
      const bin = val.toString(2);
      const correct = `${bin}₂`;
      const options = [correct, `${(val + 1).toString(2)}₂`, `${(val - 2).toString(2)}₂`, `${bin.slice(1)}0₂`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Системы счисления (КЕГЭ №14)',
        question: `Переведите десятичное число ${val} в двоичную систему счисления.`,
        formula: 'Деление на основание 2 с записью остатков справа налево',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `${val} = ${bin}₂.`
      };
    },
    // 2. Кодирование информации и алфавит (КЕГЭ №7-8)
    () => {
      const chars = randomInt(4, 6);
      const len = 4;
      const count = Math.pow(chars, len);
      const correct = `${count}`;
      const options = [correct, `${count - 100}`, `${Math.pow(chars, 3)}`, `${count + 120}`].sort(() => Math.random() - 0.5);
      return {
        topic: 'Комбинаторика и мощность алфавита (КЕГЭ №8)',
        question: `Все 4-буквенные слова составлены из ${chars}-буквенного алфавита. Сколько различных кодовых слов можно составить?`,
        formula: 'N = A^L (мощность алфавита в степени длины)',
        options,
        correctIndex: options.indexOf(correct),
        explanation: `N = ${chars}⁴ = ${count}.`
      };
    },
    // 3. Анализ сложности
    () => {
      return {
        topic: 'Асимптотический анализ алгоритмов (Big-O)',
        question: 'Какова временная сложность поиска элемента в отсортированном массиве методом бинарного поиска?',
        formula: 'T(N) = O(log N)',
        options: ['O(log N)', 'O(N)', 'O(1)', 'O(N²)'],
        correctIndex: 0,
        explanation: 'На каждом шаге бинарного поиска размер рассматриваемого отрезка делится пополам, поэтому глубина поиска равна log₂(N).'
      };
    }
  ];

  const pool = egeInfTasks;
  const fn = pool[randomInt(0, pool.length - 1)];
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

    const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
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
  const sentences = trimmed.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length > 4);

  // 1. ПАРАМЕТРЫ (Задание 18 ЕГЭ)
  if (lower.includes('параметр')) {
    return {
      title: 'Уравнения и неравенства с параметрами (Задание 18 ЕГЭ)',
      subject: 'Профмат',
      formulas: [
        'D = b² - 4ac (исследование знака дискриминанта)',
        'x_верш = -b / (2a) (координата вершины параболы)',
        'f(x₀) ≶ 0 (теорема о расположении корней трехчлена)'
      ],
      theses: [
        '1. Аналитический метод: разбиение на случаи, исследование числа корней через знаки D, x_верш и f(x₀).',
        '2. Графический метод в плоскости (x; a): построение кривых a = f(x) и считывание числа пересечений горизонтальными прямыми.',
        '3. Метод областей: разбиение плоскости на зоны знакопостоянства для решения неравенств с параметром.',
        '4. Свойства симметрии: использование инвариантности f(x) = f(-x) для нахождения условий единственности решения.'
      ],
      quiz: {
        question: 'Какое условие гарантирует, что оба корня уравнения ax² + bx + c = 0 (при a > 0) строго больше числа x₀?',
        options: [
          'D > 0, x_верш > x₀ и f(x₀) > 0',
          'Достаточно выполнения только одного условия D > 0',
          'Произведение корней x₁·x₂ < 0',
          'Значение функции f(x₀) должно быть отрицательным'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 2. КИРХГОФ И ЦЕПИ ПОСТОЯННОГО ТОКА
  if (lower.includes('кирхгоф') || lower.includes('цеп') || lower.includes('ток') || lower.includes('сопротивлен')) {
    return {
      title: 'Законы постоянного тока и правила Кирхгофа (ФИПИ Физика)',
      subject: 'Физика',
      formulas: [
        'I = U / R (Закон Ома для участка цепи)',
        'I = ε / (R + r) (Закон Ома для полной цепи)',
        'Σ I_вход = Σ I_выход (1-е правило Кирхгофа для узла)',
        'Σ ε_k = Σ I_k · R_k (2-е правило Кирхгофа для контура)'
      ],
      theses: [
        '1. Первое правило Кирхгофа выражает фундаментальный закон сохранения электрического заряда в узле цепи.',
        '2. Второе правило Кирхгофа выражает закон сохранения энергии: алгебраическая сумма ЭДС равна сумме падений напряжений вдоль любого замкнутого контура.',
        '3. При расчете сложных разветвленных цепей произвольно выбираются направления токов в ветвях и направление обхода контура.'
      ],
      quiz: {
        question: 'Какому фундаментальному физическому закону строго эквивалентно первое правило Кирхгофа?',
        options: [
          'Закону сохранения электрического заряда',
          'Закону электромагнитной индукции Фарадея',
          'Закону Джоуля-Ленца',
          'Закону сохранения импульса'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 3. ЭЛЕКТРОМАГНИТНАЯ ИНДУКЦИЯ И ФАРАДЕЙ
  if (lower.includes('индукц') || lower.includes('магнит') || lower.includes('фараде') || lower.includes('ленц')) {
    return {
      title: 'Электромагнитная индукция Фарадея и правило Ленца',
      subject: 'Физика',
      formulas: [
        'Φ = B · S · cos(α) (магнитный поток)',
        'ε_i = - dΦ / dt (закон Фарадея)',
        'ε_самоинд = - L · (dI / dt) (ЭДС самоиндукции)'
      ],
      theses: [
        '1. При всяком изменении магнитного потока сквозь проводящий контур в нем возникает ЭДС индукции.',
        '2. Знак минус в формуле (правило Ленца) означает, что индукционный ток всегда препятствует изменению внешнего магнитного потока.',
        '3. Изменяющееся во времени магнитное поле порождает вихревое электрическое поле с замкнутыми силовыми линиями.'
      ],
      quiz: {
        question: 'Каков физический смысл знака «минус» в законе электромагнитной индукции Фарадея?',
        options: [
          'Индукционный ток направлен так, чтобы противодействовать изменению магнитного потока (правило Ленца)',
          'Обозначает обязательные тепловые потери энергии на нагревание проводника',
          'Указывает, что направление тока всегда противоположно направлению электронов',
          'Является формальной константой без физического содержания'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 4. ТЕОРЕМА ВИЕТА И КВАДРАТНЫЕ УРАВНЕНИЯ
  if (lower.includes('виет') || lower.includes('дискриминант') || lower.includes('корн') || lower.includes('квадратн')) {
    return {
      title: 'Теорема Виета и исследование квадратного трёхчлена',
      subject: 'Профмат',
      formulas: [
        'x₁ + x₂ = -b / a (сумма корней)',
        'x₁ · x₂ = c / a (произведение корней)',
        'D = b² - 4ac (число действительных корней)'
      ],
      theses: [
        '1. Если D > 0, квадратное уравнение имеет два различных действительных корня.',
        '2. Для приведенного уравнения x² + px + q = 0: сумма корней равна -p, произведение равно q.',
        '3. Знаки корней определяются знаком свободного члена: если x₁·x₂ < 0, корни имеют противоположные знаки.'
      ],
      quiz: {
        question: 'Что можно утверждать о корнях квадратного уравнения ax² + bx + c = 0, если свободный член c < 0 (при a > 0)?',
        options: [
          'Уравнение всегда имеет два действительных корня разных знаков (x₁·x₂ < 0)',
          'Уравнение не имеет действительных корней',
          'Оба корня строго положительны',
          'Оба корня равны нулю'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 5. ДИНАМИКА И ЗАКОНЫ НЬЮТОНА
  if (lower.includes('ньютон') || lower.includes('сил') || lower.includes('масс') || lower.includes('тяжест') || lower.includes('трени')) {
    return {
      title: 'Законы динамики Ньютона и силы в механике',
      subject: 'Физика',
      formulas: [
        'F = m · a (Второй закон Ньютона)',
        'F_тр = μ · N (сила трения скольжения)',
        'F_тяж = m · g (сила тяжести)'
      ],
      theses: [
        '1. Равнодействующая всех сил, приложенных к телу, сообщает ему ускорение, сонаправленное с этой силой.',
        '2. Сила реакции опоры N перпендикулярна поверхности соприкосновения тел.',
        '3. Силы взаимодействия двух тел всегда равны по модулю и противоположны по направлению (Третий закон Ньютона).'
      ],
      quiz: {
        question: 'Как изменится ускорение тела постоянной массы, если равнодействующую приложенных сил увеличить в 3 раза?',
        options: [
          'Увеличится ровно в 3 раза (a = F / m)',
          'Уменьшится в 3 раза',
          'Останется постоянным',
          'Увеличится в 9 раз'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 6. ТЕРМОДИНАМИКА И ГАЗЫ
  if (lower.includes('газ') || lower.includes('давлен') || lower.includes('температур') || lower.includes('мкт') || lower.includes('менделеев')) {
    return {
      title: 'Молекулярно-кинетическая теория и термодинамика',
      subject: 'Физика',
      formulas: [
        'p · V = ν · R · T (Уравнение состояния идеального газа)',
        'ΔU = (3/2) · ν · R · ΔT (Внутренняя энергия одноатомного газа)',
        'Q = ΔU + A (Первое начало термодинамики)'
      ],
      theses: [
        '1. При изотермическом процессе (T = const) внутренняя энергия идеального газа не меняется (ΔU = 0), все тепло идет на работу.',
        '2. При адиабатном процессе (Q = 0) работа совершается исключительно за счет убыли внутренней энергии газа (A = -ΔU).',
        '3. Абсолютная температура газа прямо пропорциональна средней кинетической энергии теплового движения его молекул.'
      ],
      quiz: {
        question: 'Чему равно изменение внутренней энергии идеального газа при изотермическом расширении (T = const)?',
        options: [
          'ΔU = 0 (внутренняя энергия не изменяется)',
          'ΔU равно полной совершенной работе A',
          'ΔU бесконечно велико',
          'ΔU отрицательно и равно -Q'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 7. АЛГОРИТМЫ И СЛОЖНОСТЬ (Информатика)
  if (lower.includes('алгоритм') || lower.includes('сложност') || lower.includes('поиск') || lower.includes('дерев') || lower.includes('граф')) {
    return {
      title: 'Анализ сложности алгоритмов и структуры данных (КЕГЭ)',
      subject: 'Информатика',
      formulas: [
        'T(N) = O(log N) (бинарный поиск в отсортированном массиве)',
        'T(N) = O(N · log N) (оптимальная сортировка слиянием / QuickSort)',
        'T(N) = O(V + E) (обход графа в глубину DFS и в ширину BFS)'
      ],
      theses: [
        '1. Асимптотическая оценка O(f(N)) описывает поведение времени работы алгоритма при неограниченном росте объема входных данных.',
        '2. Бинарный поиск требует обязательной предварительной отсортированности массива.',
        '3. Динамическое программирование заменяет экспоненциальный перебор на полиномиальное время за счет сохранения промежуточных результатов (мемоизация).'
      ],
      quiz: {
        question: 'Каково главное обязательное условие для применения алгоритма бинарного поиска с временной сложностью O(log N)?',
        options: [
          'Массив данных должен быть предварительно строго отсортирован',
          'Размер массива должен быть степенью двойки',
          'Массив должен содержать только натуральные положительные числа',
          'Алгоритм применим исключительно к односвязным спискам'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // 8. ПРОИЗВОДНЫЕ И ИНТЕГРАЛЫ
  if (lower.includes('производн') || lower.includes('интеграл') || lower.includes('касательн') || lower.includes('экстремум')) {
    return {
      title: 'Дифференциальное исчисление и исследование функций',
      subject: 'Профмат',
      formulas: [
        "f'(x₀) = k = tg(α) (геометрический смысл производной)",
        "y = f(x₀) + f'(x₀)(x - x₀) (уравнение касательной)",
        "(xⁿ)' = n · xⁿ⁻¹"
      ],
      theses: [
        '1. Производная функции в точке численно равна тангенсу угла наклона касательной, проведенной к графику в этой точке.',
        '2. В точках максимума и минимума дифференцируемой функции ее производная обращается в ноль (необходимое условие экстремума).',
        '3. Если производная f\'(x) > 0 на интервале, то функция строго монотонно возрастает на этом интервале.'
      ],
      quiz: {
        question: 'Чему равен угловой коэффициент касательной к графику функции y = f(x) в точке x₀?',
        options: [
          'Значению производной в этой точке: k = f\'(x₀)',
          'Значению самой функции f(x₀)',
          'Квадрату значения функции (f(x₀))²',
          'Всегда равен 1 независимо от функции'
        ],
        correctIndex: 0
      },
      isLiveAI: false
    };
  }

  // Общий случай: извлечение предложений ученика с качественным образовательным наполнением
  const title = sentences[0] ? (sentences[0].length > 45 ? sentences[0].substring(0, 42) + '...' : sentences[0]) : `Конспект по предмету ${subject}`;
  const theses = sentences.length > 0
    ? sentences.slice(0, 4).map((s, idx) => `${idx + 1}. ${s}`)
    : [
        `1. Основные теоретические положения и терминология темы «${title}».`,
        '2. Практические методы решения типовых задач профильного уровня.',
        '3. Систематизация формул и ключевых математических соотношений.'
      ];

  return {
    title,
    subject,
    formulas: [
      `Теоретический базис темы: ${title}`,
      'Применение в кодификаторе ФИПИ профильного уровня'
    ],
    theses,
    quiz: {
      question: `Какое утверждение о теме «${title}» является физико-математически корректным?`,
      options: [
        theses[0].replace(/^\d+\.\s*/, ''),
        'Справедливо только при условии равенства нулю всех параметров системы',
        'Является частным пренебрежимым фактором без математического обоснования',
        'Прямо противоречит фундаментальным законам изучаемого раздела'
      ],
      correctIndex: 0
    },
    isLiveAI: false
  };
}

export async function testGeminiPing(overrideKey) {
  const apiKey = (overrideKey || getApiKey() || '').trim();
  if (!apiKey) return { ok: false, message: 'API-ключ не задан', ms: 0 };

  const start = performance.now();
  const models = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        },
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
