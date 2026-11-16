// ============================================================
//  RLI Arena — Синхронизация и хранение данных
//  База лицеистов, 5 профилей (Физмат, Политех, Роснефть, Гум, ГК)
//  localStorage + BroadcastChannel (мгновенная синхронизация)
//  Только реальные зарегистрированные пользователи (без ботов)
// ============================================================

// ---------- КОНСТАНТЫ ----------
const STORAGE_KEY = 'rli_arena_state';   // Ключ в localStorage
const CHANNEL_NAME = 'rli_arena_channel'; // Имя BroadcastChannel
const LOG_KEY = 'rli_arena_logs';         // Ключ для системного лога
const MAX_LOGS = 200;                     // Макс. количество записей в логе

// Допустимые профили РЛИ
export const RLI_PROFILES = ['Физмат', 'Политех', 'Роснефть', 'Гум', 'ГК'];

// ---------- НАЧАЛЬНОЕ СОСТОЯНИЕ (500 стартовый ELO, без ботов) ----------
export const DEFAULT_STATE = {
  // Текущий авторизованный пользователь (null до регистрации или логина)
  profile: null,

  // База зарегистрированных учеников — только реальные люди!
  users: [],

  // Рейтинг лицеистов
  leaderboard: [],

  // Битва профилей РЛИ
  classBoard: [
    { name: 'Физмат', elo: 0, members: 0 },
    { name: 'Политех', elo: 0, members: 0 },
    { name: 'Роснефть', elo: 0, members: 0 },
    { name: 'ГК', elo: 0, members: 0 },
    { name: 'Гум', elo: 0, members: 0 }
  ],

  // Живые вызовы на дуэль между открытыми окнами/телефонами
  duelInvites: [],

  // Конспекты
  notes: [
    {
      id: 1700000000001,
      title: 'Закон сохранения импульса и энергии',
      subject: 'Физика',
      formulas: ['p = m · v', 'm1·v1 + m2·v2 = m1·v1\' + m2·v2\'', 'Ek = (m · v²) / 2'],
      theses: [
        'В замкнутой механической системе векторный импульс сохраняется.',
        'При абсолютно упругом ударе суммарная кинетическая энергия постоянна.',
        'Для решения задач выбирается ось координат и составляется проекция.'
      ],
      quiz: {
        question: 'При каком ключевом условии выполняется закон сохранения импульса?',
        options: ['Система тел является замкнутой', 'Только в абсолютном вакууме', 'Только при скоростях близких к скорости света', 'При отсутствии гравитации'],
        correctIndex: 0
      },
      quizDone: false,
      isLiveAI: false
    }
  ],

  // SOS-запросы
  sosRequests: [
    {
      id: 1,
      room: '305 каб.',
      subject: 'Физика',
      text: 'Не понимаю закон Кирхгофа для разветвленных цепей, помогите!',
      author: 'Лицеист',
      reward: 30,
      status: 'open',
      explanation: null,
      helper: null
    }
  ]
};


/**
 * loadState — Загружает состояние из localStorage с автоочисткой от старых ботов.
 *
 * @returns {Object} Текущее состояние приложения
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);

    // Удаляем старых ботов (id <= 5), если они застряли в кэше браузера
    if (Array.isArray(parsed.users)) {
      parsed.users = parsed.users.filter(u => u && u.id > 100);
    }
    if (parsed.leaderboard) {
      parsed.leaderboard = parsed.leaderboard.filter(u => parsed.users?.some(real => real.name === u.name));
    }
    if (parsed.profile && parsed.profile.id && parsed.profile.id <= 5 && !localStorage.getItem('RLI_CURRENT_USER')) {
      parsed.profile = null;
    }

    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}


/**
 * saveState — Сохраняет состояние в localStorage
 * и рассылает обновление во все открытые вкладки.
 *
 * @param {Object} state — Новое состояние
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const ch = new BroadcastChannel(CHANNEL_NAME);
    ch.postMessage({ type: 'STATE_UPDATE', payload: state });
    ch.close();
  } catch (err) {
    console.error('[TAB_SYNC] Ошибка сохранения:', err);
  }
}


/**
 * onStateChange — Подписка на обновления из других вкладок/устройств.
 *
 * @param {function} callback
 * @returns {function} Отписка
 */
export function onStateChange(callback) {
  const ch = new BroadcastChannel(CHANNEL_NAME);
  const handler = (e) => {
    if (e.data?.type === 'STATE_UPDATE' && e.data?.payload) {
      callback(e.data.payload);
    }
  };
  ch.addEventListener('message', handler);
  return () => {
    ch.removeEventListener('message', handler);
    ch.close();
  };
}


/**
 * resetState — Полный сброс состояния без создания ботов.
 */
export function resetState() {
  const clean = structuredClone(DEFAULT_STATE);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LOG_KEY);
  localStorage.removeItem('RLI_CURRENT_USER');
  saveState(clean);
  addLog('[SYSTEM]', 'Состояние сброшено к исходному');
  return clean;
}


// ============================================================
//            СИСТЕМНЫЙ ЛОГ (ДЛЯ ВКЛАДКИ «СИСТЕМА»)
// ============================================================

export function getLogs() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addLog(tag, message) {
  try {
    const logs = getLogs();
    const entry = {
      ts: new Date().toLocaleTimeString('ru-RU', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0'),
      tag,
      message
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.pop();
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {}
}
