// ============================================================
//  RLI Arena — Сервер синхронизации и сетевой БД
//  Обеспечивает мультиплеер между ПК и смартфонами по Wi-Fi
//  Только реальные зарегистрированные лицеисты РЛИ (без ботов)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const DB_FILE = path.resolve(process.cwd(), 'rli_data.json');

// Встроенный глобальный ключ Google AI Studio для серверного прокси (обходит РКН/геоблокировки для клиентов из РФ)
const EMBEDDED_KEY = Buffer.from('QVEuQWI4Uk42SUVsMkVxSmpncC1rUnhsZENIOGVnMnp2Mzd6aE40YmpETUJUSUtlUFkyd1E=', 'base64').toString('utf8');

// Автоматический лицейский фильтр токсичности и ненормативной лексики (Кодекс этики РЛИ / стандарт платформы Zhaniza)
const PROFANITY_REGEX = /п[ие1]д[аое]р|х[уy][йиеяё]|нах[уy]|бл[яе]|еб[аеёлоя]|муд[ао]|сук[аио]|член|шлюх|говн|дерьм|залуп|дроч|дебил|урод|даун|лошар|чмо|гандон|долбо|гнид|мраз|тварь|соси|отсос|нафи[кг]|отвали|заткнись|реш[аеив]+й\s*сам|сам[а-я\s]*реш|пошел|пошёл|дурак|тупой|идиот|сдохни|пшел/i;

const INITIAL_STATE = {
  users: [], // Только реальные зарегистрированные пользователи
  classBoard: [
    { name: 'Физмат', elo: 0, members: 0 },
    { name: 'Политех', elo: 0, members: 0 },
    { name: 'Роснефть', elo: 0, members: 0 },
    { name: 'ГК', elo: 0, members: 0 },
    { name: 'Гум', elo: 0, members: 0 }
  ],
  friendRequests: [], // [{ id, from, to, status: 'pending'|'accepted'|'declined', created }]
  duelInvites: [],    // [{ id, from, to, subject, difficulty, task, status, answers: {}, winner, loser, delta, created, finishedAt }]
  onlineHeartbeats: {}, // { [userName]: timestamp }
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
  sosRequests: [
    {
      id: 1,
      room: '305 каб.',
      subject: 'Физика',
      text: 'Не понимаю закон Кирхгофа для разветвленных цепей, помогите!',
      author: 'Лицеист РЛИ',
      reward: 30,
      status: 'open',
      explanation: null,
      helper: null
    }
  ]
};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const state = { ...INITIAL_STATE, ...parsed };
      // Удаляем старых тестовых ботов (id <= 5), если они остались
      if (Array.isArray(state.users)) {
        state.users = state.users.filter(u => u && u.id > 100);
      }
      return state;
    }
  } catch (err) {
    console.error('[DB] Ошибка чтения:', err.message);
  }
  return { ...INITIAL_STATE };
}

function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Ошибка записи:', err.message);
  }
}

let db = loadDb();

export function createApiMiddleware() {
  return (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith('/api/')) {
      return next();
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let payload = {};
      if (body) {
        try { payload = JSON.parse(body); } catch {}
      }

      const now = Date.now();

      // ============================================================
      // 1. ХАРТБИТ И СИНХРОНИЗАЦИЯ (GET /api/sync?user=...)
      // ============================================================
      if (pathname === '/api/sync' && req.method === 'GET') {
        const userName = url.searchParams.get('user');
        if (userName && userName.trim()) {
          const trimmed = userName.trim();
          // Обновляем онлайн ТОЛЬКО для реально существующих пользователей
          const userExists = db.users.some(u => u.name.toLowerCase() === trimmed.toLowerCase());
          if (userExists) {
            db.onlineHeartbeats[trimmed] = now;
          }
        }

        // Авто-синхронизация принятых заявок в друзья в списки друзей обоих пользователей
        let friendsUpdated = false;
        for (const reqItem of db.friendRequests) {
          if (reqItem.status === 'accepted') {
            const u1 = db.users.find(u => u.name.toLowerCase() === reqItem.from.toLowerCase());
            const u2 = db.users.find(u => u.name.toLowerCase() === reqItem.to.toLowerCase());
            if (u1 && u2) {
              if (!u1.friends) u1.friends = [];
              if (!u2.friends) u2.friends = [];
              if (!u1.friends.includes(u2.name)) { u1.friends.push(u2.name); friendsUpdated = true; }
              if (!u2.friends.includes(u1.name)) { u2.friends.push(u1.name); friendsUpdated = true; }
            }
          }
        }
        if (friendsUpdated) saveDb(db);

        // Онлайн пользователи за последние 20 секунд
        const onlineList = Object.keys(db.onlineHeartbeats).filter(
          u => now - db.onlineHeartbeats[u] < 20000 && db.users.some(usr => usr.name.toLowerCase() === u.toLowerCase())
        );

        // Входящие запросы в друзья
        const myFriendRequests = db.friendRequests.filter(
          r => userName && r.to.toLowerCase() === userName.toLowerCase() && r.status === 'pending'
        );

        // Входящие вызовы на дуэль
        const myDuelInvites = db.duelInvites.filter(
          inv => userName && inv.to.toLowerCase() === userName.toLowerCase() && inv.status === 'pending'
        );

        // Активная дуэль (принятая) для текущего игрока
        const activeBattle = db.duelInvites.find(
          inv => userName && (inv.from.toLowerCase() === userName.toLowerCase() || inv.to.toLowerCase() === userName.toLowerCase()) && inv.status === 'accepted'
        ) || null;

        // Недавно завершившийся бой (в течение 30 секунд после финиша)
        const finishedBattle = db.duelInvites.find(
          inv => userName && (inv.from.toLowerCase() === userName.toLowerCase() || inv.to.toLowerCase() === userName.toLowerCase()) &&
                 inv.status === 'finished' &&
                 (now - (inv.finishedAt || inv.created)) < 30000
        ) || null;

        // Лидерборд только из реальных пользователей
        const leaderboard = db.users
          .map(u => ({ name: u.name, profileGroup: u.profileGroup, elo: u.elo }))
          .sort((a, b) => b.elo - a.elo);

        return res.end(JSON.stringify({
          users: db.users,
          leaderboard,
          classBoard: db.classBoard,
          notes: db.notes,
          sosRequests: db.sosRequests,
          onlineUsers: onlineList,
          myFriendRequests,
          myDuelInvites,
          activeBattle,
          finishedBattle
        }));
      }

      // ============================================================
      // 2. РЕГИСТРАЦИЯ ЛИЦЕИСТА (POST /api/register)
      // ============================================================
      if (pathname === '/api/register' && req.method === 'POST') {
        const { name, profileGroup, password } = payload;
        const trimmedName = (name || '').trim();
        if (!trimmedName) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Введите имя лицеиста' }));
        }

        if (PROFANITY_REGEX.test(trimmedName)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Недопустимое имя лицеиста. Пожалуйста, используйте реальное имя.' }));
        }

        const existing = db.users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase());
        if (existing) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Лицеист с таким именем уже зарегистрирован' }));
        }

        const newUser = {
          id: Date.now(),
          name: trimmedName,
          profileGroup: profileGroup || 'Физмат',
          password: password || '123',
          elo: 500, // Стартовый шахматный рейтинг 500
          wins: 0,
          losses: 0,
          streak: 0,
          sheetsSaved: 50,
          friends: []
        };

        db.users.push(newUser);

        // Обновляем очки профиля
        const cb = db.classBoard.find(c => c.name === newUser.profileGroup);
        if (cb) {
          cb.members += 1;
          cb.elo += 500;
        }

        saveDb(db);
        return res.end(JSON.stringify({ ok: true, user: newUser }));
      }

      // ============================================================
      // СБРОС ВСЕЙ БАЗЫ ДАННЫХ (POST /api/reset)
      // ============================================================
      if (pathname === '/api/reset' && req.method === 'POST') {
        db = {
          users: [],
          classBoard: [
            { name: 'Физмат', elo: 0, members: 0 },
            { name: 'Политех', elo: 0, members: 0 },
            { name: 'Роснефть', elo: 0, members: 0 },
            { name: 'ГК', elo: 0, members: 0 },
            { name: 'Гум', elo: 0, members: 0 }
          ],
          friendRequests: [],
          duelInvites: [],
          onlineHeartbeats: {},
          notes: INITIAL_STATE.notes,
          sosRequests: INITIAL_STATE.sosRequests
        };
        saveDb(db);
        return res.end(JSON.stringify({ ok: true, message: 'База данных очищена' }));
      }

      // ============================================================
      // 3. АВТОРИЗАЦИЯ (POST /api/login)
      // ============================================================
      if (pathname === '/api/login' && req.method === 'POST') {
        const { name, password } = payload;
        const trimmedName = (name || '').trim();
        const user = db.users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase());
        if (!user) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Лицеист не найден. Пожалуйста, зарегистрируйтесь.' }));
        }
        if (password && user.password && user.password !== password) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: 'Неверный пароль' }));
        }
        return res.end(JSON.stringify({ ok: true, user }));
      }

      // ============================================================
      // 4. ЗАПРОС В ДРУЗЬЯ (POST /api/friend-request)
      // ============================================================
      if (pathname === '/api/friend-request' && req.method === 'POST') {
        const { from, to } = payload;
        if (!from || !to) return res.end(JSON.stringify({ error: 'Не указаны имена' }));

        let fromUser = db.users.find(u => u.name.toLowerCase() === from.toLowerCase());
        let toUser = db.users.find(u => u.name.toLowerCase() === to.toLowerCase());

        // Авто-создание при необходимости
        if (!fromUser) {
          fromUser = { id: Date.now() - 2000, name: from, profileGroup: 'Физмат', password: '123', elo: 500, wins: 0, losses: 0, streak: 0, sheetsSaved: 50, friends: [] };
          db.users.push(fromUser);
        }
        if (!toUser) {
          toUser = { id: Date.now() - 1000, name: to, profileGroup: 'Политех', password: '123', elo: 500, wins: 0, losses: 0, streak: 0, sheetsSaved: 50, friends: [] };
          db.users.push(toUser);
        }

        if (fromUser && fromUser.friends?.includes(toUser.name)) {
          return res.end(JSON.stringify({ ok: true, message: 'Уже в друзьях' }));
        }

        const reqItem = { id: Date.now(), from: fromUser.name, to: toUser.name, status: 'pending', created: Date.now() };
        db.friendRequests = db.friendRequests.filter(r => !(r.from.toLowerCase() === from.toLowerCase() && r.to.toLowerCase() === to.toLowerCase()));
        db.friendRequests.push(reqItem);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true, request: reqItem }));
      }

      // ============================================================
      // 5. ОТВЕТ НА ЗАПРОС В ДРУЗЬЯ (POST /api/friend-respond)
      // ============================================================
      if (pathname === '/api/friend-respond' && req.method === 'POST') {
        const { requestId, accept } = payload;
        const reqItem = db.friendRequests.find(r => r.id === requestId);
        if (reqItem) {
          reqItem.status = accept ? 'accepted' : 'declined';
          if (accept) {
            const u1 = db.users.find(u => u.name.toLowerCase() === reqItem.from.toLowerCase());
            const u2 = db.users.find(u => u.name.toLowerCase() === reqItem.to.toLowerCase());
            if (u1 && u2) {
              if (!u1.friends) u1.friends = [];
              if (!u2.friends) u2.friends = [];
              if (!u1.friends.includes(u2.name)) u1.friends.push(u2.name);
              if (!u2.friends.includes(u1.name)) u2.friends.push(u1.name);
            }
          }
          saveDb(db);
        }
        return res.end(JSON.stringify({ ok: true }));
      }

      // ============================================================
      // 6. ВЫЗОВ НА ДУЭЛЬ (POST /api/duel-invite)
      // ============================================================
      if (pathname === '/api/duel-invite' && req.method === 'POST') {
        const { from, to, subject, difficulty, task } = payload;
        const invite = {
          id: Date.now(),
          from,
          to,
          subject: subject || 'Физика',
          difficulty: difficulty || 'ege',
          task: task || null,
          status: 'pending',
          answers: {},
          winner: null,
          loser: null,
          delta: 25,
          created: Date.now()
        };
        db.duelInvites = db.duelInvites.filter(i => !(i.from.toLowerCase() === from.toLowerCase() && i.to.toLowerCase() === to.toLowerCase() && i.status === 'pending'));
        db.duelInvites.push(invite);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true, invite }));
      }

      // ============================================================
      // 7. ОТВЕТ НА ВЫЗОВ НА ДУЭЛЬ (POST /api/duel-respond)
      // ============================================================
      if (pathname === '/api/duel-respond' && req.method === 'POST') {
        const { inviteId, accept } = payload;
        const inv = db.duelInvites.find(i => i.id === inviteId);
        if (inv) {
          inv.status = accept ? 'accepted' : 'declined';
          inv.acceptedAt = Date.now();
          saveDb(db);
          return res.end(JSON.stringify({ ok: true, invite: inv }));
        }
        return res.end(JSON.stringify({ error: 'Вызов не найден' }));
      }

      // ============================================================
      // 8. ОТПРАВКА ОТВЕТА В ДУЭЛИ (POST /api/duel-submit)
      // ============================================================
      if (pathname === '/api/duel-submit' && req.method === 'POST') {
        const { inviteId, userName, answerIndex, timeSec, isCorrect } = payload;
        const inv = db.duelInvites.find(i => i.id === inviteId);
        if (!inv) {
          return res.end(JSON.stringify({ error: 'Бой не найден' }));
        }

        inv.answers = inv.answers || {};
        inv.answers[userName] = {
          answerIndex,
          timeSec: Number(timeSec) || 0,
          isCorrect: !!isCorrect,
          at: Date.now()
        };

        const opponentName = userName === inv.from ? inv.to : inv.from;
        const opponentAnswer = inv.answers[opponentName];

        if (isCorrect) {
          let winner = userName;
          let loser = opponentName;

          if (opponentAnswer && opponentAnswer.isCorrect) {
            if (opponentAnswer.timeSec < Number(timeSec)) {
              winner = opponentName;
              loser = userName;
            }
          }

          inv.status = 'finished';
          inv.winner = winner;
          inv.loser = loser;
          inv.delta = 25;
          inv.finishedAt = Date.now();

          const winUser = db.users.find(u => u.name.toLowerCase() === winner.toLowerCase());
          const loseUser = db.users.find(u => u.name.toLowerCase() === loser.toLowerCase());
          if (winUser) {
            winUser.elo += 25;
            winUser.wins += 1;
            winUser.streak += 1;
            winUser.sheetsSaved += 2;
            const cbW = db.classBoard.find(c => c.name === winUser.profileGroup);
            if (cbW) cbW.elo += 25;
          }
          if (loseUser) {
            loseUser.elo = Math.max(100, loseUser.elo - 15);
            loseUser.losses += 1;
            loseUser.streak = 0;
            const cbL = db.classBoard.find(c => c.name === loseUser.profileGroup);
            if (cbL) cbL.elo = Math.max(0, cbL.elo - 15);
          }

          saveDb(db);
          return res.end(JSON.stringify({ ok: true, finished: true, battle: inv }));
        } else {
          if (opponentAnswer) {
            if (opponentAnswer.isCorrect) {
              inv.status = 'finished';
              inv.winner = opponentName;
              inv.loser = userName;
              inv.delta = 25;
              inv.finishedAt = Date.now();

              const winUser = db.users.find(u => u.name.toLowerCase() === opponentName.toLowerCase());
              const loseUser = db.users.find(u => u.name.toLowerCase() === userName.toLowerCase());
              if (winUser) { winUser.elo += 25; winUser.wins += 1; winUser.streak += 1; winUser.sheetsSaved += 2; }
              if (loseUser) { loseUser.elo = Math.max(100, loseUser.elo - 15); loseUser.losses += 1; loseUser.streak = 0; }
            } else {
              inv.status = 'finished';
              inv.winner = null;
              inv.loser = null;
              inv.delta = 0;
              inv.finishedAt = Date.now();
            }
            saveDb(db);
            return res.end(JSON.stringify({ ok: true, finished: true, battle: inv }));
          } else {
            saveDb(db);
            return res.end(JSON.stringify({ ok: true, finished: false, waiting: true, battle: inv }));
          }
        }
      }

      // ============================================================
      // 9. СОС-ПОМОЩЬ: ДОБАВЛЕНИЕ ОТВЕТА В ТРЕД (POST /api/sos/help)
      // ============================================================
      if (pathname === '/api/sos/help' && req.method === 'POST') {
        const { sosId, helper, explanation } = payload;
        const textToCheck = (explanation || '').trim();

        if (PROFANITY_REGEX.test(textToCheck)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: 'Ответ содержит некорректные выражения или отказ в помощи. Соблюдайте Лицейский кодекс этики РЛИ.'
          }));
        }

        const item = db.sosRequests.find(s => s.id === Number(sosId));
        if (item) {
          item.answers = item.answers || [];
          if (item.explanation && item.helper && item.answers.length === 0) {
            item.answers.push({
              id: Date.now() - 1000,
              helper: item.helper,
              text: item.explanation,
              createdAt: Date.now() - 1000,
              isAccepted: true,
              reported: false
            });
          }

          const newAnswer = {
            id: Date.now(),
            helper: helper || 'Лицеист',
            text: textToCheck,
            createdAt: Date.now(),
            isAccepted: false,
            reported: false
          };

          item.answers.push(newAnswer);
          saveDb(db);
          return res.end(JSON.stringify({ ok: true, item, answer: newAnswer }));
        }
        return res.end(JSON.stringify({ error: 'Запрос помощи не найден' }));
      }

      // СОС-ЗАПРОС: ПРИНЯТЬ РЕШЕНИЕ (POST /api/sos/accept)
      if (pathname === '/api/sos/accept' && req.method === 'POST') {
        const { sosId, answerId } = payload;
        const item = db.sosRequests.find(s => s.id === Number(sosId));
        if (item && item.answers) {
          const ans = item.answers.find(a => a.id === Number(answerId));
          if (ans && !ans.isAccepted) {
            ans.isAccepted = true;
            item.status = 'helped';
            item.helper = ans.helper;
            item.explanation = ans.text;

            const helperUser = db.users.find(u => u.name.toLowerCase() === ans.helper.toLowerCase());
            if (helperUser) {
              helperUser.elo += (item.reward || 30);
              helperUser.sheetsSaved += 5;
              const cb = db.classBoard.find(c => c.name === helperUser.profileGroup);
              if (cb) cb.elo += (item.reward || 30);
            }
            saveDb(db);
            return res.end(JSON.stringify({ ok: true, item }));
          }
        }
        return res.end(JSON.stringify({ error: 'Ответ не найден' }));
      }

      // СОС-ЗАПРОС: СОЗДАНИЕ (POST /api/sos)
      if (pathname === '/api/sos' && req.method === 'POST') {
        const textToCheck = `${payload.room || ''} ${payload.text || ''}`;
        if (PROFANITY_REGEX.test(textToCheck)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: 'Запрос содержит некорректные выражения. Формулируйте учебный вопрос уважительно.'
          }));
        }

        const newSos = {
          id: Date.now(),
          room: payload.room || 'Кабинет',
          subject: payload.subject || 'Физика',
          text: payload.text || '',
          author: payload.author || 'Лицеист РЛИ',
          reward: 30,
          status: 'open',
          answers: []
        };
        db.sosRequests.unshift(newSos);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true, item: newSos }));
      }

      // СОС-ЗАПРОС: ЖАЛОБА / МОДЕРАЦИЯ (POST /api/sos/report)
      if (pathname === '/api/sos/report' && req.method === 'POST') {
        const { sosId, answerId, reportedBy, reason } = payload;
        const item = db.sosRequests.find(s => s.id === Number(sosId));
        if (item) {
          item.answers = item.answers || [];
          let ans = item.answers.find(a => a.id === Number(answerId));
          if (!ans && item.explanation) {
            ans = { id: 1, helper: item.helper, text: item.explanation, reported: false };
            item.answers.push(ans);
          }

          if (ans) {
            ans.reported = true;
            ans.reportedReason = reason || 'Нарушение лицейской этики';
            ans.reportedBy = ans.reportedBy || [];
            if (reportedBy && !ans.reportedBy.includes(reportedBy)) {
              ans.reportedBy.push(reportedBy);
            }

            if (PROFANITY_REGEX.test(ans.text || '') || ans.reportedBy.length >= 3) {
              ans.toxicConfirmed = true;
              ans.text = 'Ответ скрыт автомодерацией за нарушение этики';
              const badUser = db.users.find(u => u.name.toLowerCase() === (ans.helper || '').toLowerCase());
              if (badUser) {
                badUser.elo = Math.max(100, badUser.elo - 30);
              }
            }
          }
          item.reported = true;
          saveDb(db);
          return res.end(JSON.stringify({ ok: true, message: 'Жалоба зарегистрирована и отправлена на проверку модераторам', item }));
        }
        return res.end(JSON.stringify({ error: 'Запрос не найден' }));
      }

      // СОС-ЗАПРОС: АДМИН-МОДЕРАЦИЯ (POST /api/sos/moderate)
      if (pathname === '/api/sos/moderate' && req.method === 'POST') {
        const { sosId, answerId, action } = payload; // action: 'approve' | 'delete'
        const item = db.sosRequests.find(s => s.id === Number(sosId));
        if (item && item.answers) {
          const ans = item.answers.find(a => a.id === Number(answerId));
          if (ans) {
            if (action === 'delete') {
              ans.text = 'Ответ удален Советом Лицея за нарушение кодекса';
              ans.toxicConfirmed = true;
              ans.reported = false;
              const badUser = db.users.find(u => u.name.toLowerCase() === (ans.helper || '').toLowerCase());
              if (badUser) {
                badUser.elo = Math.max(100, badUser.elo - 30);
              }
            } else if (action === 'approve') {
              ans.reported = false;
              ans.reportedReason = null;
              ans.reportedBy = [];
            }
          }
          saveDb(db);
          return res.end(JSON.stringify({ ok: true, item }));
        }
        return res.end(JSON.stringify({ error: 'Запрос не найден' }));
      }

      // СОС-ЗАПРОС: УДАЛЕНИЕ (DELETE /api/sos/:id)
      if (pathname.startsWith('/api/sos/') && req.method === 'DELETE') {
        const id = Number(pathname.replace('/api/sos/', ''));
        db.sosRequests = db.sosRequests.filter(s => s.id !== id);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true }));
      }

      // ============================================================
      // 10. КОНСПЕКТЫ (СОЗДАНИЕ / УДАЛЕНИЕ)
      // ============================================================
      if (pathname === '/api/notes' && req.method === 'POST') {
        const newNote = payload;
        const textToCheck = `${newNote.title || ''} ${(newNote.theses || []).join(' ')}`;
        if (PROFANITY_REGEX.test(textToCheck)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({
            error: 'Конспект содержит недопустимую лексику и не может быть сохранен.'
          }));
        }
        db.notes.unshift(newNote);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true, note: newNote }));
      }

      if (pathname.startsWith('/api/notes/') && req.method === 'DELETE') {
        const id = Number(pathname.replace('/api/notes/', ''));
        db.notes = db.notes.filter(n => n.id !== id);
        saveDb(db);
        return res.end(JSON.stringify({ ok: true }));
      }

      // ============================================================
      // 11. СЕРВЕРНЫЙ ПРОКСИ GOOGLE GEMINI AI (ОЦИФРОВКА КОНСПЕКТОВ)
      // Сервер Render (США/Европа) обращается к Google AI напрямую без блокировок
      // ============================================================
      if (pathname === '/api/ai/digitize-note' && req.method === 'POST') {
        const { text, subject, apiKey } = payload;
        const trimmedText = (text || '').trim();
        if (!trimmedText) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Пустой текст конспекта' }));
        }

        const keyToUse = (apiKey && apiKey.trim().length > 15) ? apiKey.trim() : (process.env.VITE_GEMINI_API_KEY || EMBEDDED_KEY);

        const prompt = `Ты — ведущий преподаватель и ИИ-тьютор физмат-лицея РЛИ (Республиканский лицей-интернат, Якутск).
Оцифруй и структурируй учебный конспект ученика по предмету "${subject || 'Физика'}".
Входной материал ученика (рукописный ввод, формула или название темы):
"""
${trimmedText}
"""

Сформируй глубокий, академически точный образовательный конспект уровня ФИПИ ЕГЭ и физмат-олимпиад.
Верни СТРОГО валидный JSON в следующем формате (без markdown кавычек, только чистый JSON):
{
  "title": "Точное академическое название темы (например, «Векторное произведение векторов» или «Уравнения с параметрами»)",
  "subject": "${subject || 'Физика'}",
  "formulas": [
    "Главная рабочая формула с кратким пояснением величин",
    "Следствие или закон сохранения",
    "Формула для решения типовых задач профильного уровня"
  ],
  "theses": [
    "1. Фундаментальный физико-математический смысл и ключевые определения раздела.",
    "2. Практический алгоритм решения типовых олимпиадных задач и заданий ФИПИ профильного уровня.",
    "3. Важные свойства, ограничения применимости, типичные ловушки и ошибки учащихся."
  ],
  "quiz": {
    "question": "Концептуальный вопрос для глубокой проверки понимания сути темы (вопрос на научный закон, а НЕ на повторение названия темы)",
    "options": [
      "Правильное научное утверждение",
      "Правдоподобный дистрактор 1 (с типичной ошибкой школьников)",
      "Правдоподобный дистрактор 2",
      "Правдоподобный дистрактор 3"
    ],
    "correctIndex": 0
  }
}`;

        const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'];
        for (const model of models) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 14000);

            const url = keyToUse.startsWith('AQ.')
              ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
              : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyToUse)}`;

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': keyToUse
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: 'application/json' }
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (rawJson) {
                const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
                const parsed = JSON.parse(cleanJson);
                return res.end(JSON.stringify({
                  ok: true,
                  isLiveAI: true,
                  model,
                  note: {
                    ...parsed,
                    isLiveAI: true
                  }
                }));
              }
            } else {
              const errBody = await response.text();
              console.warn(`[GEMINI_SERVER] ${model} HTTP ${response.status}:`, errBody.slice(0, 120));
            }
          } catch (e) {
            console.warn(`[GEMINI_SERVER] ${model} error:`, e.message);
          }
        }

        return res.end(JSON.stringify({ ok: false, error: 'Gemini server proxy failed' }));
      }

      // ============================================================
      // 12. ТЕСТ СЕРВЕРНОГО ПОДКЛЮЧЕНИЯ К GEMINI AI (POST /api/ai/ping)
      // ============================================================
      if (pathname === '/api/ai/ping' && req.method === 'POST') {
        const keyToUse = (payload.apiKey && payload.apiKey.trim().length > 15) ? payload.apiKey.trim() : (process.env.VITE_GEMINI_API_KEY || EMBEDDED_KEY);
        const start = Date.now();
        const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-2.0-flash'];
        let lastErr = 'Неизвестная ошибка';

        // Проверяем список доступных моделей у Google для данного ключа
        try {
          const listRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            method: 'GET',
            headers: { 'X-goog-api-key': keyToUse }
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const available = (listData.models || [])
              .map(m => m.name.replace('models/', ''))
              .filter(m => m.includes('flash') || m.includes('pro'));
            return res.end(JSON.stringify({
              ok: true,
              message: `Доступные модели: ${available.slice(0, 5).join(', ')}`,
              ms: Date.now() - start,
              available
            }));
          } else {
            const errTxt = await listRes.text();
            lastErr = `ListModels HTTP ${listRes.status}: ${errTxt.slice(0, 150)}`;
          }
        } catch (e) {
          lastErr = `ListModels Error: ${e.message}`;
        }

        for (const model of models) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': keyToUse
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ответь одним словом: Работает' }] }]
              }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            const ms = Date.now() - start;
            if (response.ok) {
              const data = await response.json();
              const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
              return res.end(JSON.stringify({
                ok: true,
                message: `Google Gemini (${model}): ${txt.trim()}`,
                ms,
                model
              }));
            } else {
              const errBody = await response.text();
              lastErr = `HTTP ${response.status}: ${errBody.slice(0, 150)}`;
            }
          } catch (err) {
            lastErr = `${err.name}: ${err.message}`;
          }
        }

        return res.end(JSON.stringify({
          ok: false,
          message: `Ошибка облака Google: ${lastErr}`,
          ms: Date.now() - start
        }));
      }

      return next();
    });
  };
}
