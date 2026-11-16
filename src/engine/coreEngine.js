// ============================================================
//  RLI Arena — Математический движок (Core Engine)
//  Чистые функции в процедурном стиле (понятно C++ разработчику)
//  Автор: Леонид | Команда РЛИ
// ============================================================

// ---------- КОНСТАНТЫ (аналог #define / const в C++) ----------

const BASE_REWARD_EGE = 25;       // Базовая награда за режим ЕГЭ
const BASE_REWARD_OLYMP = 35;     // Базовая награда за режим Олимпиада
const STREAK_BONUS_PER_WIN = 4;   // Бонус за каждую победу подряд
const MAX_STREAK_BONUS = 20;      // Потолок бонуса серии
const LOSS_PENALTY = -15;         // Штраф за ошибку
const MIN_ELO = 100;              // Минимальный порог ELO (не падает ниже)
const ANTI_CHEAT_MIN_TIME = 1.5;  // Минимальное время ответа (секунды)
const WEEKLY_SHEET_GOAL = 5000;   // Недельная цель лицея (листов А4)
const WOOD_PER_SHEET = 0.01;      // кг древесины на 1 лист А4
const CO2_PER_SHEET = 0.005;      // кг CO2 на 1 лист А4


/**
 * calculateNewElo — Рассчитывает новый рейтинг ELO игрока.
 *
 * Аналог в C++:
 *   int calculateNewElo(int current, bool isWin, string diff, int streak)
 *
 * @param {number} currentElo  — Текущий рейтинг игрока
 * @param {boolean} isWin      — Правильный ли ответ (true = победа)
 * @param {string} difficulty  — Режим сложности: "ege" или "olymp"
 * @param {number} streak      — Текущая серия побед подряд
 * @returns {{ newElo: number, delta: number, newStreak: number }}
 */
export function calculateNewElo(currentElo, isWin, difficulty, streak) {
  // Шаг 1: Определяем базовую награду по сложности
  const baseReward = (difficulty === 'olymp')
    ? BASE_REWARD_OLYMP
    : BASE_REWARD_EGE;

  if (isWin) {
    // Шаг 2a: Рассчитываем бонус за серию (streak * 4, макс +20)
    const streakBonus = Math.min(streak * STREAK_BONUS_PER_WIN, MAX_STREAK_BONUS);
    const delta = baseReward + streakBonus;
    const newElo = currentElo + delta;
    const newStreak = streak + 1;

    return { newElo, delta, newStreak };
  } else {
    // Шаг 2b: Штраф за ошибку, но не ниже MIN_ELO
    const delta = LOSS_PENALTY;
    const newElo = Math.max(currentElo + delta, MIN_ELO);
    const newStreak = 0; // Серия побед сбрасывается

    return { newElo, delta, newStreak };
  }
}


/**
 * checkAntiCheat — Проверка на подозрительно быстрый ответ.
 *
 * Если ученик ответил быстрее 1.5 секунды — вероятно,
 * он кликает наугад или использует автокликер.
 *
 * @param {number} timeSpentSeconds — Время ответа в секундах
 * @returns {{ suspicious: boolean, reason?: string }}
 */
export function checkAntiCheat(timeSpentSeconds) {
  if (timeSpentSeconds < ANTI_CHEAT_MIN_TIME) {
    return {
      suspicious: true,
      reason: 'Ответ быстрее 1.5с (подозрение на кликер/рандом)'
    };
  }
  return { suspicious: false };
}


/**
 * calculateEcoMetrics — Перевод сэкономленных листов А4 в ESG-метрики.
 *
 * Формулы:
 *   Древесина (кг) = листов * 0.01
 *   CO2 (кг)       = листов * 0.005
 *   Прогресс (%)   = (листов / 5000) * 100
 *
 * @param {number} sheetsSaved — Количество сэкономленных листов А4
 * @returns {{ wood: string, co2: string, percent: number, goal: number }}
 */
export function calculateEcoMetrics(sheetsSaved) {
  const wood = (sheetsSaved * WOOD_PER_SHEET).toFixed(1);
  const co2 = (sheetsSaved * CO2_PER_SHEET).toFixed(2);
  const percent = Math.min(
    Math.round((sheetsSaved / WEEKLY_SHEET_GOAL) * 100),
    100
  );

  return {
    wood,         // Сохраненная древесина, кг
    co2,          // Сниженные выбросы CO2, кг
    percent,      // Процент выполнения недельной цели
    goal: WEEKLY_SHEET_GOAL
  };
}


// Лицейский фильтр токсичности и стоп-слов (стандарт платформы Zhaniza / Кодекс этики РЛИ)
export const PROFANITY_REGEX = /п[ие1]д[аое]р|х[уy][йиеяё]|нах[уy]|бл[яе]|еб[аеёлоя]|муд[ао]|сук[аио]|член|шлюх|говн|дерьм|залуп|дроч|дебил|урод|даун|лошар|чмо|гандон|долбо|гнид|мраз|тварь|соси|отсос|нафи[кг]|отвали|заткнись|сам реши|пошел|пошёл|дурак|тупой|идиот|сдохни|пшел/i;

export function containsProfanity(text) {
  return PROFANITY_REGEX.test(text || '');
}

/**
 * getRankTitle — Определяет звание игрока по его ELO.
 *
 * @param {number} elo — Текущий рейтинг
 * @returns {string} Название звания
 */
export function getRankTitle(elo) {
  if (elo >= 800) return 'Грандмастер РЛИ';
  if (elo >= 700) return 'Мастер';
  if (elo >= 650) return 'Кандидат в мастера';
  if (elo >= 600) return 'Эксперт';
  if (elo >= 550) return 'Специалист';
  if (elo >= 500) return 'Лицеист';
  return 'Новичок';
}


/**
 * getWinRate — Считает процент побед.
 *
 * @param {number} wins   — Количество побед
 * @param {number} losses — Количество поражений
 * @returns {number} Винрейт в процентах (0..100)
 */
export function getWinRate(wins, losses) {
  const total = wins + losses;
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/**
 * getUserLevel — Рассчитывает игровой уровень лицеиста, прогресс и звание.
 *
 * @param {number} elo
 * @param {number} wins
 * @returns {{ level: number, title: string, currentElo: number, nextLevelElo: number, progressPercent: number, eloToNext: number }}
 */
export function getUserLevel(elo = 500, wins = 0) {
  const currentElo = Math.max(100, Number(elo) || 500);
  // Стартовый уровень 1 при 500 ELO, следующий на 550, 600, 650 и т.д.
  const level = Math.max(1, Math.floor((currentElo - 450) / 50) + 1);
  const currentLevelBase = 450 + (level - 1) * 50;
  const nextLevelElo = currentLevelBase + 50;
  const progressInLevel = Math.max(0, Math.min(50, currentElo - currentLevelBase));
  const progressPercent = Math.round((progressInLevel / 50) * 100);
  const eloToNext = Math.max(0, nextLevelElo - currentElo);

  const titles = [
    'Новичок РЛИ',
    'Лицеист-Практик',
    'Теоретик Формул',
    'Мастер Дуэлей',
    'Олимпиадник РЛИ',
    'Эрудит Физмата',
    'Архимаг Квантов',
    'Грандмастер РЛИ'
  ];
  const title = titles[Math.min(level - 1, titles.length - 1)];

  return {
    level,
    title,
    currentElo,
    nextLevelElo,
    progressPercent,
    eloToNext
  };
}
