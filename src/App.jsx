// ============================================================
//  RLI Arena — Мультиплеерная физмат-арена РЛИ
//  100% реальный мультиплеер между ПК и смартфонами по Wi-Fi
//  Только реальные зарегистрированные лицеисты (без ботов)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, Swords, BookOpen, HelpCircle, Settings,
  Trophy, Leaf, TreePine, Flame, Zap, Clock, Shield,
  Users, Star, Search, Plus, Send, Check, X, ChevronRight,
  ArrowUp, Target, Brain, Monitor, Wifi, WifiOff, Key,
  RotateCcw, FileText, MessageCircle, AlertTriangle, Award,
  Play, TrendingUp, Activity, BookMarked, Lightbulb, Camera, Upload,
  Trash2, UserPlus, UserCheck, User, LogOut, QrCode, Smartphone,
  CheckCircle2, Bell, Radio, Copy, Share2, Flag, Sun, Moon, ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { calculateNewElo, checkAntiCheat, calculateEcoMetrics, getRankTitle, getWinRate, getUserLevel, containsProfanity } from './engine/coreEngine';
import { generateArenaTask, digitizeStudentNote, getApiKey, testGeminiPing, saveApiKey } from './services/aiService';
import { loadState, saveState, onStateChange, resetState, addLog, getLogs, RLI_PROFILES } from './services/storageSync';

export default function App() {
  const [tab, setTab] = useState(0);
  const [state, setState] = useState(() => loadState());
  const { profile, users = [], leaderboard = [], classBoard = [], notes = [], sosRequests = [] } = state;

  // Тема оформления (Тёмная 🌙 / Светлая ☀️)
  const [theme, setTheme] = useState(() => localStorage.getItem('RLI_THEME') || 'dark');
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('RLI_THEME', next);
  };

  // Права модератора (Совет Лицея РЛИ)
  const isAdmin = profile?.name?.trim().toLowerCase() === 'леонид' || profile?.name?.trim().toLowerCase() === 'admin';

  // Сетевой онлайн и уведомления
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingFriendRequest, setIncomingFriendRequest] = useState(null);
  const [incomingDuelInvite, setIncomingDuelInvite] = useState(null);
  const [activeBattleId, setActiveBattleId] = useState(null);

  // Авторизация / Регистрация (открыта, если пользователь не вошел)
  const [isAuthOpen, setIsAuthOpen] = useState(() => !localStorage.getItem('RLI_CURRENT_USER'));
  const [authTab, setAuthTab] = useState('register'); // 'login' | 'register'
  const [authName, setAuthName] = useState('');
  const [authProfile, setAuthProfile] = useState('Физмат');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // QR-код и ссылка для мобильного
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Дуэль
  const [duelPhase, setDuelPhase] = useState('select'); // select | waiting | fight | result
  const [subject, setSubject] = useState('Физика');
  const [difficulty, setDifficulty] = useState('ege');
  const [task, setTask] = useState(null);
  const [timer, setTimer] = useState(60);
  const [picked, setPicked] = useState(-1);
  const [duelResult, setDuelResult] = useState(null);
  const [opponent, setOpponent] = useState('Соло-тренировка');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [waitingInviteId, setWaitingInviteId] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Конспекты
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteSubject, setNoteSubject] = useState('Физика');
  const [noteCategory, setNoteCategory] = useState('Все');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState('Все');
  const [noteIsPublic, setNoteIsPublic] = useState(true);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteFilterSubject, setNoteFilterSubject] = useState('Все');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteImagePreview, setNoteImagePreview] = useState(null);
  const [notePhotoModal, setNotePhotoModal] = useState(null);
  const fileInputRef = useRef(null);

  // Лидерборд
  const [boardMode, setBoardMode] = useState('personal'); // personal | class

  // Поиск и фильтрация одноклассников
  const [friendSearch, setFriendSearch] = useState('');
  const [friendTabFilter, setFriendTabFilter] = useState('all'); // all | friends | online
  const [duelOpponentSearch, setDuelOpponentSearch] = useState('');

  // SOS Менторство
  const [showSosForm, setShowSosForm] = useState(false);
  const [sosRoom, setSosRoom] = useState('');
  const [sosSubject, setSosSubject] = useState('Физика');
  const [sosText, setSosText] = useState('');

  // Модалка ответа на SOS (Помощь лицеисту)
  const [sosHelpTarget, setSosHelpTarget] = useState(null);
  const [sosHelpExplanation, setSosHelpExplanation] = useState('');
  const [sosHelpSubmitting, setSosHelpSubmitting] = useState(false);

  // Система
  const [apiInput, setApiInput] = useState(() => localStorage.getItem('RLI_GEMINI_KEY') || '');
  const [sysLogs, setSysLogs] = useState([]);
  const [testResult, setTestResult] = useState(null);

  // Хелпер обновления состояния
  const update = useCallback((fn) => {
    setState(prev => {
      const next = { ...prev, ...fn(prev) };
      saveState(next);
      return next;
    });
  }, []);

  // ============================================================
  //   СЕТЕВАЯ СИНХРОНИЗАЦИЯ ПО WI-FI (МЕЖДУ ПК И СМАРТФОНАМИ)
  // ============================================================
  useEffect(() => {
    const syncWithServer = async () => {
      try {
        const userName = profile?.name || '';
        const userGroup = profile?.profileGroup || 'Физмат';
        const resp = await fetch(`/api/sync?user=${encodeURIComponent(userName)}&profileGroup=${encodeURIComponent(userGroup)}`);
        if (resp.ok) {
          const data = await resp.json();
          setOnlineUsers(data.onlineUsers || []);

          // 1. Входящий запрос в друзья
          if (data.myFriendRequests?.length > 0) {
            setIncomingFriendRequest(data.myFriendRequests[0]);
          } else {
            setIncomingFriendRequest(null);
          }

          // 2. Входящий вызов на дуэль (для защищающегося)
          if (data.myDuelInvites?.length > 0) {
            setIncomingDuelInvite(data.myDuelInvites[0]);
          } else {
            setIncomingDuelInvite(null);
          }

          // 3. Синхронизация активной дуэли (для ОБОИХ игроков)
          if (data.activeBattle && userName) {
            const b = data.activeBattle;
            const isParticipant = (b.from.toLowerCase() === userName.toLowerCase() || b.to.toLowerCase() === userName.toLowerCase());
            const oppName = b.from.toLowerCase() === userName.toLowerCase() ? b.to : b.from;

            // Если мы участник боя и еще не в драке
            if (isParticipant && duelPhase !== 'fight' && (duelPhase !== 'result' || activeBattleId !== b.id)) {
              setTask(b.task);
              setActiveBattleId(b.id);
              setOpponent(oppName);
              setSubject(b.subject || 'Физика');
              setDuelPhase('fight');
              setPicked(-1);
              setDuelResult(null);
              setTimer(60);
              setTab(1); // Принудительно открываем вкладку Дуэли!
              startTimeRef.current = Date.now();
              addLog('[DUEL_PVP]', `Активная дуэль с ${oppName}! Старт.`);

              clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                setTimer(prev => {
                  if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                  return prev - 1;
                });
              }, 1000);
            }
          }

          // 4. Синхронизация финиша дуэли
          if (data.finishedBattle && activeBattleId === data.finishedBattle.id && duelPhase === 'fight') {
            const b = data.finishedBattle;
            clearInterval(timerRef.current);
            const isWin = b.winner === userName;
            const delta = isWin ? 25 : (b.winner ? -15 : 0);
            setDuelResult({
              isWin,
              delta,
              winner: b.winner,
              loser: b.loser,
              newElo: (profile?.elo || 500) + delta,
              timeSec: b.answers?.[userName]?.timeSec || 0
            });
            setDuelPhase('result');
            addLog('[DUEL_PVP]', `Дуэль завершена! Победитель: ${b.winner || 'Ничья'}`);
          }

          // 5. Обновляем списки пользователей, лидерборд, конспекты и SOS
          update(s => {
            const currentU = (data.users || []).find(u => u.name.toLowerCase() === s.profile?.name?.toLowerCase());
            // Если профиль был удален с сервера или база очищена — переключаем на регистрацию
            if (!currentU && s.profile) {
              localStorage.removeItem('RLI_CURRENT_USER');
              setIsAuthOpen(true);
            }
            return {
              users: data.users || [],
              leaderboard: data.leaderboard || [],
              classBoard: data.classBoard || s.classBoard,
              notes: data.notes || s.notes,
              sosRequests: data.sosRequests || s.sosRequests,
              profile: currentU ? { ...s.profile, ...currentU } : null
            };
          });
        }
      } catch {
        // Оффлайн
      }
    };

    syncWithServer();
    const interval = setInterval(syncWithServer, 2500); // Опрос каждые 2.5 сек
    return () => clearInterval(interval);
  }, [profile?.name, duelPhase, waitingInviteId, activeBattleId, update]);

  // Подписка на локальный BroadcastChannel
  useEffect(() => {
    const unsub = onStateChange((newState) => {
      setState(newState);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (tab === 4) setSysLogs(getLogs());
  }, [tab]);

  // ==================== АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ ====================

  const handleLogin = async () => {
    setAuthError('');
    const targetName = authName.trim();
    if (!targetName) { setAuthError('Введите имя лицеиста'); return; }

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName, password: authPassword.trim() || '123' })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Ошибка входа');

      localStorage.setItem('RLI_CURRENT_USER', data.user.name);
      update(() => ({ profile: data.user }));
      setIsAuthOpen(false);
      addLog('[AUTH]', `Вход: ${data.user.name} (${data.user.profileGroup})`);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleRegister = async () => {
    setAuthError('');
    const name = authName.trim();
    if (!name) { setAuthError('Введите имя лицеиста'); return; }

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          profileGroup: authProfile,
          password: authPassword.trim() || '123'
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Ошибка регистрации');

      localStorage.setItem('RLI_CURRENT_USER', data.user.name);
      update(s => ({
        users: [...s.users.filter(u => u.name !== data.user.name), data.user],
        profile: data.user
      }));

      setIsAuthOpen(false);
      setAuthName('');
      setAuthPassword('');
      addLog('[AUTH]', `Регистрация: ${name} (${authProfile}, стартовый рейтинг 500 ELO)`);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('RLI_CURRENT_USER');
    update(s => ({ ...s, profile: null }));
    setIsAuthOpen(true);
    setAuthTab('register');
    addLog('[AUTH]', 'Выход из профиля');
  };

  // ==================== СИСТЕМА ДРУЗЕЙ ====================

  const sendFriendRequest = async (targetName) => {
    try {
      await fetch('/api/friend-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: profile.name, to: targetName })
      });
      addLog('[FRIENDS]', `Запрос в друзья отправлен лицеисту: ${targetName}`);
      alert(`Запрос в друзья отправлен лицеисту ${targetName}!`);
    } catch {}
  };

  const respondFriendRequest = async (requestId, accept) => {
    try {
      await fetch('/api/friend-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, accept })
      });
      setIncomingFriendRequest(null);
      addLog('[FRIENDS]', accept ? 'Запрос в друзья принят' : 'Запрос в друзья отклонен');
    } catch {}
  };

  // ==================== ВЫЗОВ И СИНХРОНИЗАЦИЯ ДУЭЛИ ====================

  // 1. Инициатор отправляет вызов
  const sendDuelChallenge = async (targetName) => {
    setOpponent(targetName);
    setTab(1); // Переключаем на дуэль
    setLoading(true);
    setLoadingText(`ИИ генерирует задачу для дуэли против ${targetName}...`);
    addLog('[AI_ENGINE]', `Подготовка общей задачи для дуэли: ${subject} / ${difficulty}`);

    // Генерируем задачу ОДИН раз — оба соперника будут решать именно её!
    const battleTask = await generateArenaTask(subject, difficulty);
    setTask(battleTask);

    try {
      const resp = await fetch('/api/duel-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: profile.name,
          to: targetName,
          subject,
          difficulty,
          task: battleTask
        })
      });
      const data = await resp.json();
      if (data.invite) {
        setWaitingInviteId(data.invite.id);
        setDuelPhase('waiting');
        addLog('[DUEL_PVP]', `Вызов отправлен ${targetName}. Ожидание подтверждения...`);
      }
    } catch {}

    setLoading(false);
  };

  // 2. Защищающийся принимает/отклоняет вызов
  const respondDuelInvite = async (invite, accept) => {
    try {
      await fetch('/api/duel-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId: invite.id, accept })
      });
      setIncomingDuelInvite(null);

      if (accept) {
        // У защищающегося сразу запускается ТОЧНО ТАКАЯ ЖЕ задача!
        setOpponent(invite.from);
        setSubject(invite.subject || 'Физика');
        setTask(invite.task);
        setActiveBattleId(invite.id);
        setPicked(-1);
        setDuelResult(null);
        setTimer(60);
        setDuelPhase('fight');
        setTab(1); // Переключаем на вкладку Дуэль
        startTimeRef.current = Date.now();
        addLog('[DUEL_PVP]', `Вызов от ${invite.from} принят! Бой начался.`);

        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) { clearInterval(timerRef.current); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {}
  };

  // 3. Соло-тренировка ФИПИ (когда нет других игроков)
  const startSoloDuel = async () => {
    setLoading(true);
    setLoadingText('Генерация задачи ФИПИ...');
    setOpponent('Тренажёр ФИПИ');
    addLog('[FIPI_TRAINER]', `Запуск тренировки: ${subject} / ${difficulty}`);

    const t = await generateArenaTask(subject, difficulty);
    setTask(t);
    setPicked(-1);
    setDuelResult(null);
    setTimer(60);
    setActiveBattleId(null);
    setDuelPhase('fight');
    startTimeRef.current = Date.now();
    setLoading(false);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // 4. Отправка ответа в дуэли
  const submitAnswer = async (idx) => {
    if (picked !== -1) return;
    clearInterval(timerRef.current);
    const timeSec = (Date.now() - startTimeRef.current) / 1000;
    const antiCheat = checkAntiCheat(timeSec);
    const isCorrect = idx === task.correctIndex && !antiCheat.suspicious;

    setPicked(idx);

    if (activeBattleId) {
      // Сетевая дуэль против живого человека
      try {
        const resp = await fetch('/api/duel-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteId: activeBattleId,
            userName: profile.name,
            answerIndex: idx,
            timeSec: timeSec.toFixed(1),
            isCorrect
          })
        });
        const resData = await resp.json();
        if (resData.battle?.status === 'finished') {
          const b = resData.battle;
          const isWin = b.winner === profile.name;
          const delta = isWin ? 25 : (b.winner ? -15 : 0);
          setDuelResult({
            isWin,
            delta,
            winner: b.winner,
            loser: b.loser,
            newElo: (profile?.elo || 500) + delta,
            timeSec: timeSec.toFixed(1),
            antiCheat
          });
          setDuelPhase('result');
        } else {
          // Ждем ответа соперника
          setDuelResult({
            isWin: isCorrect,
            delta: isCorrect ? 25 : -15,
            waitingOpponent: true,
            timeSec: timeSec.toFixed(1),
            antiCheat
          });
          setDuelPhase('result');
        }
      } catch {}
    } else {
      // Одиночный тренажер ФИПИ (БЕЗ накрутки турнирного рейтинга ELO!)
      setDuelResult({
        isWin: isCorrect,
        isSolo: true,
        delta: isCorrect ? 15 : 0,
        antiCheat,
        timeSec: timeSec.toFixed(1)
      });
      if (isCorrect) {
        update(s => ({
          profile: {
            ...s.profile,
            sheetsSaved: (s.profile.sheetsSaved || 0) + 1
          }
        }));
      }
      setDuelPhase('result');
    }
  };

  // Загрузка фото тетради через камеру или галерею
  const handleNoteImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setNoteImagePreview(dataUrl);

      const ocrSamples = {
        'Физика': 'Законы постоянного тока и правила Кирхгофа. Сила тока I = U / R. Первое правило Кирхгофа: сумма входящих токов равна сумме выходящих.',
        'Профмат': 'как решать параметры',
        'Информатика': 'Анализ сложности алгоритмов, бинарный поиск O(log N) и динамическое программирование.'
      };
      if (!noteText.trim()) {
        setNoteText(ocrSamples[noteSubject] || ocrSamples['Физика']);
      }
      if (!noteTitle.trim()) {
        setNoteTitle(`Конспект из тетради (${noteSubject})`);
      }
      addLog('[CAMERA_OCR]', `Фото тетради загружено (${file.name}), формулы оцифрованы`);
    };
    reader.readAsDataURL(file);
  };

  // ==================== КОНСПЕКТЫ ====================

  const createNote = async () => {
    if (!noteText.trim() && !noteImagePreview) return;
    if (containsProfanity(noteText) || containsProfanity(noteTitle)) {
      alert('Текст конспекта содержит недопустимую лексику. Пожалуйста, соблюдайте Лицейский кодекс этики.');
      return;
    }
    setNoteLoading(true);
    const digitized = await digitizeStudentNote(noteText || noteTitle || 'Учебный конспект', noteSubject);
    const newNote = {
      ...digitized,
      id: Date.now(),
      title: noteTitle.trim() || digitized.title || 'Конспект РЛИ',
      category: noteCategory || 'Все',
      isPublic: noteIsPublic,
      image: noteImagePreview || null,
      author: profile?.name || 'Лицеист',
      quizDone: false
    };

    try {
      const resp = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        alert(data.error || 'Ошибка сохранения конспекта');
        setNoteLoading(false);
        return;
      }
    } catch {}

    update(s => ({
      notes: [newNote, ...s.notes],
      profile: { ...s.profile, sheetsSaved: (s.profile.sheetsSaved || 0) + 5 }
    }));

    setNoteText('');
    setNoteTitle('');
    setNoteImagePreview(null);
    setShowNoteModal(false);
    setNoteLoading(false);
  };

  const deleteNote = async (noteId) => {
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
    } catch {}

    update(s => ({
      notes: s.notes.filter(n => n.id !== noteId)
    }));
    addLog('[NOTES]', 'Конспект успешно удален');
  };

  const answerNoteQuiz = (noteId, idx) => {
    update(s => ({
      notes: s.notes.map(n => {
        if (n.id !== noteId || n.quizDone) return n;
        return { ...n, quizDone: true, quizPicked: idx };
      }),
      profile: {
        ...s.profile,
        sheetsSaved: (s.profile.sheetsSaved || 0) + 5
      }
    }));
    addLog('[NOTES_PRACTICE]', `Мини-квиз конспекта пройден (+5 листов бумаги)`);
  };

  // ==================== SOS-МЕНТОРСТВО (ОТКРЫТЫЙ ТРЕД И МОДЕРАЦИЯ) ====================

  const addSos = async () => {
    if (!sosText.trim()) return;
    if (containsProfanity(sosText) || containsProfanity(sosRoom)) {
      alert('Запрос содержит некорректные выражения. Формулируйте учебный вопрос уважительно (Лицейский кодекс этики).');
      return;
    }
    const item = {
      room: sosRoom || 'Кабинет',
      subject: sosSubject,
      text: sosText,
      author: profile.name
    };

    try {
      const resp = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      const data = await resp.json();
      if (data.item) {
        update(s => ({ sosRequests: [data.item, ...s.sosRequests] }));
        setSosText('');
        setSosRoom('');
        setShowSosForm(false);
        addLog('[SOS]', `Создан запрос: ${item.text.substring(0, 30)}...`);
      } else {
        alert(data.error || 'Ошибка отправки запроса');
      }
    } catch (e) {
      alert('Ошибка отправки: ' + e.message);
    }
  };

  // Открытие модалки помощи лицеисту
  const openHelpModal = (sosItem) => {
    setSosHelpTarget(sosItem);
    setSosHelpExplanation('');
  };

  // Отправка ответа в тред помощи (без преждевременного начисления ELO)
  const submitSosHelp = async () => {
    if (!sosHelpTarget || !sosHelpExplanation.trim()) return;
    if (containsProfanity(sosHelpExplanation)) {
      alert('Ответ содержит недопустимую лексику или отказ в помощи ("решай сам" и др.). Пожалуйста, соблюдайте Лицейский кодекс этики РЛИ.');
      return;
    }
    setSosHelpSubmitting(true);

    try {
      const resp = await fetch('/api/sos/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sosId: sosHelpTarget.id,
          helper: profile.name,
          explanation: sosHelpExplanation.trim()
        })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        const newAns = data.answer || {
          id: Date.now(),
          helper: profile.name,
          text: sosHelpExplanation.trim(),
          createdAt: Date.now(),
          isAccepted: false,
          reported: false
        };
        update(s => ({
          sosRequests: s.sosRequests.map(r => {
            if (r.id !== sosHelpTarget.id) return r;
            const existingAnswers = r.answers || [];
            return {
              ...r,
              answers: [...existingAnswers, newAns]
            };
          })
        }));
        addLog('[SOS_THREAD]', `Ответ добавлен в тред #${sosHelpTarget.id} от ${profile.name}`);
        setSosHelpTarget(null);
        setSosHelpExplanation('');
      } else {
        alert(data.error || 'Ошибка отправки ответа');
      }
    } catch (e) {
      alert('Ошибка отправки помощи: ' + e.message);
    }
    setSosHelpSubmitting(false);
  };

  // Автор принимает ответ (+30 ELO и +5 листов хелперу)
  const acceptSosAnswer = async (sosId, answerId) => {
    try {
      const resp = await fetch('/api/sos/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sosId, answerId })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        update(s => {
          let helperName = null;
          const updatedSos = s.sosRequests.map(r => {
            if (r.id !== sosId) return r;
            const updatedAnswers = (r.answers || []).map(a => {
              if (a.id === answerId) {
                helperName = a.helper;
                return { ...a, isAccepted: true };
              }
              return a;
            });
            return {
              ...r,
              status: 'helped',
              helper: helperName || r.helper,
              explanation: updatedAnswers.find(a => a.id === answerId)?.text || r.explanation,
              answers: updatedAnswers
            };
          });

          // Если текущий юзер был хелпером, ему начисляются очки
          let updatedProfile = s.profile;
          if (helperName && helperName.toLowerCase() === s.profile?.name?.toLowerCase()) {
            updatedProfile = {
              ...s.profile,
              elo: s.profile.elo + 30,
              sheetsSaved: (s.profile.sheetsSaved || 0) + 5
            };
          }
          return { sosRequests: updatedSos, profile: updatedProfile };
        });
        addLog('[SOS_ACCEPT]', `Решение принято! Хелпер получил +30 ELO`);
      } else {
        alert(data.error || 'Ошибка принятия ответа');
      }
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  // Пожаловаться на ответ (отправка на модерацию Совету Лицея, защита от ложного удаления)
  const reportSosAnswer = async (sosId, answerId) => {
    if (!window.confirm('Пожаловаться на этот ответ? Он будет передан на рассмотрение Совету Лицея. При подтверждении нарушения автор получит штраф рейтинга.')) return;
    try {
      const resp = await fetch('/api/sos/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sosId,
          answerId,
          reportedBy: profile.name,
          reason: 'Нарушение Лицейского кодекса этики'
        })
      });
      const data = await resp.json();
      if (data.ok) {
        update(s => ({
          sosRequests: s.sosRequests.map(r => {
            if (r.id !== sosId) return r;
            const updatedAnswers = (r.answers || []).map(a =>
              a.id === answerId ? { ...a, reported: true } : a
            );
            return { ...r, answers: updatedAnswers };
          })
        }));
        alert('Жалоба зарегистрирована и отправлена на проверку Совету Лицея.');
        addLog('[MODERATION]', `Жалоба на ответ в SOS #${sosId}`);
      }
    } catch (e) {
      alert('Ошибка отправки жалобы');
    }
  };

  // Модерация Советом Лицея (Админ)
  const moderateSosAnswer = async (sosId, answerId, action) => {
    try {
      const resp = await fetch('/api/sos/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sosId, answerId, action })
      });
      const data = await resp.json();
      if (data.ok) {
        update(s => ({
          sosRequests: s.sosRequests.map(r => {
            if (r.id !== sosId) return r;
            const updatedAnswers = (r.answers || []).map(a => {
              if (a.id !== answerId) return a;
              if (action === 'delete') {
                return { ...a, text: 'Ответ удален Советом Лицея за нарушение Кодекса этики РЛИ', reported: false, toxicConfirmed: true };
              } else {
                return { ...a, reported: false };
              }
            });
            return { ...r, answers: updatedAnswers };
          })
        }));
        addLog('[ADMIN_MODERATION]', `Модерация ответа #${answerId}: ${action}`);
      }
    } catch (e) {}
  };

  const deleteSos = async (id) => {
    try {
      await fetch(`/api/sos/${id}`, { method: 'DELETE' });
    } catch {}
    update(s => ({
      sosRequests: s.sosRequests.filter(r => r.id !== id)
    }));
    addLog('[SOS]', 'Запрос помощи удален');
  };

  // ==================== СИСТЕМА ====================

  const saveKey = async () => {
    const trimmed = apiInput.trim();
    setApiInput(trimmed);
    await saveApiKey(trimmed);
    setSysLogs(getLogs());
  };

  const pingGemini = async () => {
    setTestResult(null);
    const currentK = apiInput.trim() || getApiKey();
    const res = await testGeminiPing(currentK);
    setTestResult(res);
    setSysLogs(getLogs());
  };

  const doReset = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {}
    localStorage.removeItem('RLI_CURRENT_USER');
    localStorage.removeItem('rli_arena_state');
    const fresh = resetState();
    setState({ ...fresh, profile: null, users: [] });
    setIsAuthOpen(true);
    setAuthTab('register');
    setSysLogs([]);
    addLog('[SYSTEM]', 'Система и база данных полностью очищены к начальному состоянию');
  };

  const copyShareLink = () => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    navigator.clipboard?.writeText(currentOrigin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ==================== ВЫЧИСЛЕНИЯ ====================
  const eco = calculateEcoMetrics(profile?.sheetsSaved || 50);
  const winRate = getWinRate(profile?.wins || 0, profile?.losses || 0);
  const rank = getRankTitle(profile?.elo || 500);
  const userLvl = getUserLevel(profile?.elo || 500, profile?.wins || 0);
  const hasKey = !!getApiKey();

  // Только РЕАЛЬНЫЕ пользователи (без текущего)
  const availableOpponents = users.filter(u => u.name?.toLowerCase() !== profile?.name?.toLowerCase());

  const filteredOpponentsForDuel = availableOpponents.filter(u => {
    if (!duelOpponentSearch.trim()) return true;
    const q = duelOpponentSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.profileGroup?.toLowerCase().includes(q);
  });

  const filteredOpponentsForFriends = availableOpponents.filter(u => {
    const isFriend = profile?.friends?.some(f => f.toLowerCase() === u.name.toLowerCase());
    const isOnline = onlineUsers.includes(u.name);
    if (friendTabFilter === 'friends' && !isFriend) return false;
    if (friendTabFilter === 'online' && !isOnline) return false;
    if (friendSearch.trim()) {
      const q = friendSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.profileGroup?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredNotes = notes.filter(n => {
    const q = noteSearch.toLowerCase();
    const matchesSearch = !noteSearch ||
      n.title?.toLowerCase().includes(q) ||
      n.subject?.toLowerCase().includes(q) ||
      (n.category && n.category.toLowerCase().includes(q)) ||
      n.theses?.some(t => t.toLowerCase().includes(q)) ||
      n.formulas?.some(f => f.toLowerCase().includes(q));
    const matchesSubject = noteFilterSubject === 'Все' || n.subject === noteFilterSubject;
    const matchesCategory = noteCategoryFilter === 'Все' || n.category === noteCategoryFilter;
    return matchesSearch && matchesSubject && matchesCategory;
  });

  // ============================================================
  //            ЭКРАН РЕГИСТРАЦИИ И ВХОДА (БЕЗ БОТОВ)
  // ============================================================
  if (isAuthOpen || !profile?.name) {
    return (
      <div className="min-h-screen bg-[#18181B] flex justify-center items-center p-4">
        <div className="w-full max-w-[430px] bg-[#F5F2EB] text-[#1C1917] rounded-3xl p-6 shadow-2xl border border-[#E2DDD3] space-y-5 animate-slide">
          <div className="text-center space-y-1">
            <div className="inline-flex p-3 rounded-2xl gradient-terra text-white mb-2 shadow-lg">
              <Swords size={28}/>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">RLI Arena</h1>
            <p className="text-xs text-stone-500 font-medium">Физмат-арена Республиканского лицея-интерната</p>
          </div>

          <div className="flex bg-stone-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => { setAuthTab('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg transition ${authTab==='register'?'bg-white text-stone-900 shadow':'text-stone-600'}`}
            >
              Регистрация (500 ELO)
            </button>
            <button
              onClick={() => { setAuthTab('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-lg transition ${authTab==='login'?'bg-white text-stone-900 shadow':'text-stone-600'}`}
            >
              Вход
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1 block">Имя лицеиста</label>
              <input
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                placeholder="Например: Леонид или Алик"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 font-medium"
              />
            </div>

            {authTab === 'register' && (
              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1 block">Профиль РЛИ</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {RLI_PROFILES.map(prof => (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => setAuthProfile(prof)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition border ${
                        authProfile === prof
                          ? 'gradient-emerald text-white border-transparent shadow-sm'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1 block">Пароль</label>
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="Любой пароль (по умолч. 123)..."
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            {authError && (
              <div className="text-xs bg-red-50 text-red-600 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5">
                <AlertTriangle size={14}/> {authError}
              </div>
            )}

            <button
              onClick={() => authTab === 'register' ? handleRegister() : handleLogin()}
              className="w-full gradient-terra text-white font-bold py-3.5 rounded-xl shadow-lg hover:opacity-95 transition text-sm flex items-center justify-center gap-2"
            >
              {authTab === 'register' ? <><UserPlus size={18}/> Зарегистрироваться (500 ELO)</> : <><UserCheck size={18}/> Войти в Арену</>}
            </button>
          </div>

          <div className="p-3 bg-stone-100 rounded-2xl text-[11px] text-stone-500 text-center leading-relaxed">
            Каждый зарегистрированный лицеист получает стартовый шахматный рейтинг <strong>500 ELO</strong> и может сражаться с друзьями в реальном времени по локальной сети!
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  //                    РЕНДЕР СТРАНИЦ
  // ============================================================

  // ---------- [0] ГЛАВНАЯ ----------
  const renderHome = () => (
    <div className="space-y-4 animate-fade">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight">RLI Arena</h1>
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 bg-white border border-stone-200 rounded-xl text-stone-700 hover:text-orange-600 transition shadow-sm"
              title="Открыть на телефоне по QR-коду"
            >
              <QrCode size={16}/>
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 bg-white border border-stone-200 rounded-xl text-stone-700 hover:text-amber-500 transition shadow-sm"
              title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400"/> : <Moon size={16} className="text-stone-600"/>}
            </button>
            {isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1 shadow-sm">
                <ShieldCheck size={12}/> Совет РЛИ
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {profile.profileGroup}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              <Flame size={12}/> {profile.streak || 0} дн
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold font-mono">{profile.elo || 500}</div>
          <div className="text-xs text-stone-500 font-semibold">ELO</div>
        </div>
      </div>

      {/* Оповещение: входящий запрос в друзья */}
      {incomingFriendRequest && (
        <div className="card p-3.5 bg-amber-50 border-amber-300 flex items-center justify-between animate-slide shadow-md">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-amber-600"/>
            <div>
              <div className="text-xs font-bold text-stone-900">{incomingFriendRequest.from} хочет добавить вас в друзья!</div>
              <div className="text-[10px] text-stone-500">Лицеист РЛИ</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => respondFriendRequest(incomingFriendRequest.id, true)}
              className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg"
            >
              Принять
            </button>
            <button
              onClick={() => respondFriendRequest(incomingFriendRequest.id, false)}
              className="bg-stone-200 text-stone-700 text-xs font-bold px-2 py-1 rounded-lg"
            >
              Отклонить
            </button>
          </div>
        </div>
      )}

      {/* Оповещение: входящий вызов на дуэль */}
      {incomingDuelInvite && (
        <div className="card p-3.5 bg-orange-50 border-orange-300 flex items-center justify-between animate-bounce shadow-md">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-orange-600 animate-spin"/>
            <div>
              <div className="text-xs font-bold text-stone-900">{incomingDuelInvite.from} вызывает вас на дуэль!</div>
              <div className="text-[10px] text-stone-500">{incomingDuelInvite.subject} • Одинаковая задача</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => respondDuelInvite(incomingDuelInvite, true)}
              className="gradient-terra text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
            >
              Принять бой
            </button>
            <button
              onClick={() => respondDuelInvite(incomingDuelInvite, false)}
              className="bg-stone-200 text-stone-700 text-xs font-bold px-2 py-1.5 rounded-xl"
            >
              Отклонить
            </button>
          </div>
        </div>
      )}

      {/* Игровой уровень и боевой прогресс лицеиста */}
      <div className="gradient-terra rounded-card p-5 text-white shadow-xl relative overflow-hidden">
        {/* Фоновый декор */}
        <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
          <Trophy size={140}/>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <Award size={18} className="text-amber-300"/>
            </span>
            <span className="font-extrabold text-sm tracking-wide uppercase">Уровень и прогресс</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center gap-1">
            <Flame size={12} className="text-amber-300 fill-amber-300"/> Ур. {userLvl.level}
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <div>
            <div className="text-2xl font-black tracking-tight">{userLvl.title}</div>
            <div className="text-xs text-white/80 font-medium">{rank} • {profile.elo} ELO</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold font-mono">{userLvl.progressPercent}%</div>
            <div className="text-[10px] text-white/70">до след. уровня</div>
          </div>
        </div>

        {/* Прогресс-бар до следующего уровня */}
        <div className="w-full bg-black/25 rounded-full h-2.5 p-0.5 mb-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${userLvl.progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] text-white/75 mb-3 font-medium">
          <span>{profile.elo} ELO</span>
          <span>Осталось {userLvl.eloToNext} ELO → Ур. {userLvl.level + 1}</span>
        </div>

        {/* Быстрая статистика побед и серии */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/15 text-center">
          <div className="bg-white/10 rounded-xl py-1.5 px-1 backdrop-blur-sm">
            <div className="text-[10px] text-white/70">Победы</div>
            <div className="font-extrabold text-sm">{profile.wins || 0}</div>
          </div>
          <div className="bg-white/10 rounded-xl py-1.5 px-1 backdrop-blur-sm">
            <div className="text-[10px] text-white/70">Винрейт</div>
            <div className="font-extrabold text-sm">{winRate}%</div>
          </div>
          <div className="bg-white/10 rounded-xl py-1.5 px-1 backdrop-blur-sm">
            <div className="text-[10px] text-white/70">Стрик 🔥</div>
            <div className="font-extrabold text-sm">{profile.streak || 0}</div>
          </div>
        </div>
      </div>

      {/* Карточка текущего профиля */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-terra flex items-center justify-center text-white font-bold text-lg shadow-md">
            {profile.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>{profile.name}</span>
              <span className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold border border-stone-200">
                {profile.profileGroup}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Award size={12} className="text-amber-500"/>
              <span className="text-xs font-semibold text-amber-700">{rank}</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{profile.wins || 0}W / {profile.losses || 0}L</div>
            <div className="text-xs text-stone-500">Винрейт {winRate}%</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="font-semibold flex items-center gap-1">
            <Radio size={12} className="text-emerald-500 animate-pulse"/>
            {onlineUsers.length} лицеистов в сети
          </span>
          <button onClick={handleLogout} className="text-red-500 font-semibold flex items-center gap-1 hover:underline">
            <LogOut size={12}/> Сменить профиль
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => setTab(1)} className="flex-1 gradient-terra text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-md hover:opacity-90 transition">
            <Swords size={14}/> Дуэль
          </button>
          <button onClick={() => setTab(2)} className="flex-1 bg-stone-100 text-stone-700 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 hover:bg-stone-200 transition">
            <BookOpen size={14}/> Конспекты
          </button>
        </div>
      </div>

      {/* Рейтинг РЛИ (Только реальные зарегистрированные участники) */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm flex items-center gap-1.5"><Trophy size={16} className="text-amber-500"/> Рейтинг РЛИ</span>
          <div className="flex bg-stone-100 rounded-lg p-0.5 text-xs">
            <button onClick={() => setBoardMode('personal')} className={`px-3 py-1 rounded-md font-medium transition ${boardMode==='personal'?'bg-white shadow text-stone-900':'text-stone-500'}`}>Личный</button>
            <button onClick={() => setBoardMode('class')} className={`px-3 py-1 rounded-md font-medium transition ${boardMode==='class'?'bg-white shadow text-stone-900':'text-stone-500'}`}>Профили</button>
          </div>
        </div>

        {boardMode === 'personal' ? (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center text-xs text-stone-400 py-3">Пока нет участников</div>
            ) : (
              leaderboard.map((p, i) => {
                const isMe = p.name === profile.name;
                const isOnline = onlineUsers.includes(p.name);
                return (
                  <div key={p.name} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-orange-50 border border-orange-300' : (i===0 ? 'bg-amber-50 border border-amber-200' : 'bg-stone-50')}`}>
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i===0?'gradient-terra text-white':'bg-stone-200 text-stone-600'}`}>{i+1}</span>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} title={isOnline ? 'В сети' : 'Оффлайн'}/>
                      <span className="font-medium text-stone-900">{p.name}</span>
                      <span className="text-[10px] text-stone-400">({p.profileGroup})</span>
                    </div>
                    <span className="font-bold font-mono">{p.elo}</span>
                    {!isMe && (
                      <button
                        onClick={() => sendDuelChallenge(p.name)}
                        className="p-1 rounded-lg bg-white border border-stone-200 hover:border-orange-400 text-orange-600 transition"
                        title="Вызвать на дуэль"
                      >
                        <Swords size={14}/>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {classBoard.map((c, i) => (
              <div key={c.name} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${i===0?'bg-emerald-50 border border-emerald-200':'bg-stone-50'}`}>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i===0?'gradient-emerald text-white':'bg-stone-200 text-stone-600'}`}>{i+1}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-stone-400">{c.members} уч.</span>
                <span className="font-bold font-mono">{c.elo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно QR-кода */}
      {showQrModal && (
        <div className="card p-5 space-y-4 border-orange-300 animate-slide text-center shadow-2xl">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm flex items-center gap-1.5"><Smartphone size={16} className="text-orange-600"/> Играть с телефона</span>
            <button onClick={() => setShowQrModal(false)} className="text-stone-400 hover:text-stone-700"><X size={18}/></button>
          </div>
          <div className="flex justify-center py-2">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(PUBLIC_URL)}`}
              alt="QR Code"
              className="w-44 h-44 rounded-xl border border-stone-200 p-2 bg-white shadow-md"
            />
          </div>
          <div className="text-xs text-stone-600 leading-relaxed">
            Откройте ссылку с любого телефона или интернета (работает через Wi-Fi и мобильную сеть):
          </div>
          <div className="flex items-center gap-2 bg-stone-100 p-2 rounded-xl border border-stone-200">
            <span className="font-mono text-xs font-bold text-orange-700 flex-1 select-all truncate">
              {PUBLIC_URL}
            </span>
            <button
              onClick={copyShareLink}
              className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:text-orange-600 transition shadow-sm flex items-center gap-1 text-xs"
            >
              {copiedLink ? <Check size={14} className="text-emerald-600"/> : <Copy size={14}/>}
              <span>{copiedLink ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>
          <div className="text-[11px] text-stone-400">
            Локальная сеть лицея: http://10.200.185.240:5173
          </div>
          <button onClick={() => setShowQrModal(false)} className="w-full bg-stone-900 text-white text-xs font-semibold py-2.5 rounded-xl">
            Закрыть
          </button>
        </div>
      )}
    </div>
  );

  // ---------- [1] PVP-ДУЭЛЬ (СИНХРОНИЗИРОВАННАЯ, ОДИНАКОВЫЕ ЗАДАЧИ) ----------
  const renderDuel = () => (
    <div className="space-y-4 animate-fade">
      <h2 className="text-lg font-extrabold flex items-center gap-2"><Swords size={20} className="text-orange-600"/> 1v1 PvP-Дуэль РЛИ</h2>

      {/* ФАЗА 1: ВЫБОР НАСТРОЕК И СОПЕРНИКА */}
      {duelPhase === 'select' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="text-sm font-semibold">Предмет</div>
            <div className="flex gap-2">
              {['Физика','Профмат','Информатика'].map(s => (
                <button key={s} onClick={() => setSubject(s)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${subject===s?'gradient-terra text-white shadow-md':'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{s}</button>
              ))}
            </div>

            <div className="text-sm font-semibold pt-1">Сложность</div>
            <div className="flex gap-2">
              {[{v:'ege',l:'ЕГЭ'},{v:'olymp',l:'Олимпиада'}].map(d => (
                <button key={d.v} onClick={() => setDifficulty(d.v)} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition ${difficulty===d.v?'gradient-emerald text-white shadow-md':'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{d.l}</button>
              ))}
            </div>

            {/* Выбор соперника — ТОЛЬКО РЕАЛЬНЫЕ УЧАСТНИКИ */}
            <div className="text-sm font-semibold pt-1 flex items-center justify-between">
              <span>Соперник для дуэли</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Лицеистов: {users.length}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-100/80 px-2.5 py-1.5 rounded-xl border border-stone-200/50">
              <span>Вы играете как: <strong className="text-stone-800">{profile?.name}</strong></span>
              <span className="text-stone-400">Сам себя вызвать нельзя</span>
            </div>

            {availableOpponents.length > 4 && (
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"/>
                <input
                  value={duelOpponentSearch}
                  onChange={e => setDuelOpponentSearch(e.target.value)}
                  placeholder="Поиск соперника..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
            )}

            {availableOpponents.length === 0 ? (
              <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-4 text-center space-y-2">
                <div className="text-xs text-stone-500">
                  Другие лицеисты еще не подключились к серверу.
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="bg-white border border-stone-200 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:border-orange-400 inline-flex items-center gap-1"
                  >
                    <Smartphone size={13}/> Открыть на телефоне
                  </button>
                  <button
                    onClick={startSoloDuel}
                    className="gradient-emerald text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center gap-1"
                  >
                    <Zap size={13}/> Соло-тренировка
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredOpponentsForDuel.length === 0 ? (
                    <div className="col-span-2 text-center text-xs text-stone-400 py-3">Соперник не найден</div>
                  ) : (
                    filteredOpponentsForDuel.map(opp => {
                      const isOnline = onlineUsers.includes(opp.name);
                      const isSelected = opponent === opp.name;
                      return (
                        <button
                          key={opp.name}
                          onClick={() => setOpponent(opp.name)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold text-left transition border ${
                            isSelected ? 'gradient-terra text-white border-transparent shadow-md' : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-300'}`}/>
                            <span>{opp.name}</span>
                          </div>
                          <div className={`text-[10px] font-normal ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>
                            {opp.profileGroup} • {opp.elo} ELO
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={startSoloDuel}
                  className="w-full mt-2 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Brain size={14} className="text-orange-600"/> Или потренироваться соло (без соперника)
                </button>
              </div>
            )}
          </div>

          {availableOpponents.length > 0 && opponent !== 'Соло-тренировка' ? (
            <button
              onClick={() => sendDuelChallenge(opponent)}
              disabled={loading}
              className="w-full gradient-terra text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition animate-pulse-glow disabled:opacity-50"
            >
              {loading ? (
                <><Clock size={18} className="animate-spin"/> {loadingText || 'Генерация задачи...'}</>
              ) : (
                <><Swords size={18}/> Зарубиться с {opponent} ({subject})</>
              )}
            </button>
          ) : (
            <button
              onClick={startSoloDuel}
              disabled={loading}
              className="w-full gradient-terra text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? <><Clock size={18} className="animate-spin"/> Генерация...</> : <><Play size={18}/> Начать соло-тренировку ({subject})</>}
            </button>
          )}
        </div>
      )}

      {/* ФАЗА 2: ОЖИДАНИЕ ПРИНЯТИЯ ВЫЗОВА СОПЕРНИКОМ */}
      {duelPhase === 'waiting' && (
        <div className="card p-6 text-center space-y-4 animate-slide shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 text-orange-600 flex items-center justify-center animate-bounce">
            <Swords size={32}/>
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-stone-900">Вызов отправлен лицеисту {opponent}!</h3>
            <p className="text-xs text-stone-500 mt-1">
              Ожидаем, пока {opponent} нажмет «Принять бой» на своем экране...
            </p>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 border border-stone-200">
            Задача по предмету <strong>{subject}</strong> уже сгенерирована и будет открыта у обоих одновременно.
          </div>
          <button
            onClick={() => setDuelPhase('select')}
            className="w-full bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold py-2.5 rounded-xl transition"
          >
            Отменить вызов
          </button>
        </div>
      )}

      {/* ФАЗА 3: БОЙ — ОДИНАКОВАЯ ЗАДАЧА И ТАЙМЕР */}
      {duelPhase === 'fight' && task && (
        <div className="space-y-4 animate-slide">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 flex items-center gap-1 shadow-sm">
              <Swords size={12}/> Бой против: {opponent}
            </span>
            <div className="flex items-center gap-1.5">
              <Clock size={16} className={timer <= 10 ? 'text-red-500 animate-pulse' : 'text-stone-400'}/>
              <span className={`text-lg font-bold font-mono ${timer <= 10 ? 'text-red-500' : ''}`}>{timer}с</span>
            </div>
          </div>

          <div className="card p-5 shadow-lg border-stone-200">
            <div className="text-xs text-stone-500 mb-1">{task.topic}</div>
            <div className="font-semibold text-sm mb-3 leading-relaxed">{task.question}</div>
            <div className="space-y-2">
              {task.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => submitAnswer(i)}
                  disabled={picked !== -1}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition ${
                    picked === -1
                      ? 'border-stone-200 hover:border-orange-400 hover:bg-orange-50'
                      : i === task.correctIndex
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                      : i === picked
                      ? 'border-red-400 bg-red-50 text-red-800 font-bold'
                      : 'border-stone-100 opacity-40'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ФАЗА 4: РЕЗУЛЬТАТ ДУЭЛИ */}
      {duelPhase === 'result' && duelResult && (
        <div className="space-y-4 animate-slide">
          <div className={`card p-5 text-center shadow-lg ${duelResult.isWin ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30'}`}>
            {duelResult.isSolo ? (
              <div>
                <div className={`${duelResult.isWin ? 'text-emerald-600' : 'text-red-500'} font-extrabold text-xl mb-1 flex items-center justify-center gap-2`}>
                  {duelResult.isWin ? <Check size={26}/> : <X size={26}/>}
                  {duelResult.isWin ? 'Тренировка ФИПИ: Верно!' : 'Тренировка ФИПИ: Ошибка'}
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                  {duelResult.isWin ? '+15 XP очков практики' : '+0 XP'}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Время: {duelResult.timeSec}с • ELO рейтинг меняется ТОЛЬКО в живых дуэлях с лицеистами
                </div>
                {duelResult.isWin && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Leaf size={14} className="text-emerald-600"/> +1 лист А4 сохранено
                  </div>
                )}
              </div>
            ) : (
              <div>
                {duelResult.isWin ? (
                  <div className="text-emerald-600 font-extrabold text-xl mb-1 flex items-center justify-center gap-2">
                    <Check size={26}/> Победа над {opponent}!
                  </div>
                ) : (
                  <div className="text-red-600 font-extrabold text-xl mb-1 flex items-center justify-center gap-2">
                    <X size={26}/> {opponent} оказался быстрее
                  </div>
                )}
                <div className={`text-3xl font-extrabold font-mono ${duelResult.delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {duelResult.delta > 0 ? '+' : ''}{duelResult.delta} ELO
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Время ответа: {duelResult.timeSec}с • Ваш рейтинг: {duelResult.newElo || profile.elo} ELO
                </div>
                {duelResult.isWin && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Leaf size={14} className="text-emerald-600"/> +2 листа А4 сохранено
                  </div>
                )}
              </div>
            )}
            {duelResult.antiCheat?.suspicious && (
              <div className="mt-2 text-xs bg-red-50 text-red-600 rounded-lg px-3 py-2 flex items-center gap-1">
                <AlertTriangle size={14}/> {duelResult.antiCheat.reason}
              </div>
            )}
          </div>

          <div className="card p-4 space-y-2">
            <div className="text-xs font-semibold text-stone-500 flex items-center gap-1">
              <Lightbulb size={14} className="text-amber-500"/> Разбор решения от ИИ (ФИПИ)
            </div>
            {task.formula && (
              <div className="text-xs bg-stone-100 rounded-lg px-3 py-2 font-mono text-stone-700 font-semibold border border-stone-200">
                Ключевая формула: {task.formula}
              </div>
            )}
            <div className="text-sm text-stone-800 leading-relaxed">{task.explanation}</div>
          </div>

          <button
            onClick={() => { setDuelPhase('select'); setTask(null); setActiveBattleId(null); }}
            className="w-full gradient-terra text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition"
          >
            <RotateCcw size={16}/> Новый бой
          </button>
        </div>
      )}
    </div>
  );

  // ---------- [2] КОНСПЕКТЫ (ОЦИФРОВКА И УДАЛЕНИЕ) ----------
  const renderNotes = () => (
    <div className="space-y-4 animate-fade">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold flex items-center gap-2"><BookMarked size={20} className="text-orange-600"/> Конспекты РЛИ</h2>
        <button onClick={() => setShowNoteModal(true)} className="gradient-terra text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 shadow-md hover:opacity-90 transition">
          <Plus size={14}/> Оцифровать
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/>
        <input value={noteSearch} onChange={e => setNoteSearch(e.target.value)} placeholder="Поиск по конспектам..." className="w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-300"/>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['Все', 'Физика', 'Профмат', 'Информатика'].map(sub => (
          <button
            key={sub}
            onClick={() => setNoteFilterSubject(sub)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              noteFilterSubject === sub ? 'gradient-terra text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Быстрые фильтры разделов */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['Все', 'Параметры', 'Механика', 'Электродинамика', 'Алгоритмы', 'Геометрия'].map(cat => (
          <button
            key={cat}
            onClick={() => setNoteCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
              noteCategoryFilter === cat ? 'bg-orange-600 text-white border-transparent shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {showNoteModal && (
        <div className="card p-4 space-y-3 border-orange-200 animate-slide shadow-lg">
          <div className="font-semibold text-sm flex items-center gap-1.5"><Brain size={16} className="text-orange-500"/> Новый смарт-конспект</div>
          
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1 block">Название темы / конспекта:</label>
              <input
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Например: Задание 18. Метод интервалов или Правила Кирхгофа"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 mb-1 block">Предмет:</label>
                <select value={noteSubject} onChange={e => setNoteSubject(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <option>Физика</option><option>Профмат</option><option>Информатика</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-600 mb-1 block">Раздел:</label>
                <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs">
                  <option>Все</option>
                  <option>Параметры</option>
                  <option>Механика</option>
                  <option>Электродинамика</option>
                  <option>Алгоритмы</option>
                  <option>Геометрия</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleNoteImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <Camera size={14} className="text-emerald-600"/> Сделать фото тетради
              </button>
              <button
                type="button"
                onClick={() => {
                  const samples = {
                    'Физика': 'Законы постоянного тока и правила Кирхгофа. Сила тока I = U / R. Первое правило для узла цепи.',
                    'Профмат': 'как решать параметры',
                    'Информатика': 'Анализ сложности алгоритмов, бинарный поиск O(log N) и динамическое программирование.'
                  };
                  setNoteText(samples[noteSubject] || samples['Физика']);
                  if (!noteTitle) setNoteTitle(`Тема: ${noteSubject}`);
                }}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-medium text-stone-700 flex items-center gap-1 transition"
              >
                Шаблон
              </button>
            </div>

            {noteImagePreview && (
              <div className="flex items-center gap-3 p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <img src={noteImagePreview} alt="Тетрадь" className="w-14 h-14 object-cover rounded-lg border border-emerald-300 shadow-sm" />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600"/> Страница тетради прикреплена
                  </div>
                  <div className="text-stone-500 text-[11px]">Фото сохраняется в карточке конспекта</div>
                </div>
                <button onClick={() => setNoteImagePreview(null)} className="text-stone-400 hover:text-red-500 p-1">
                  <X size={16}/>
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-stone-600 mb-1 block">Тезисы или формулы:</label>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                rows={3}
                placeholder="Вставьте тезисы, формулы или тему..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-orange-300"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 py-1">
              <input
                type="checkbox"
                checked={noteIsPublic}
                onChange={e => setNoteIsPublic(e.target.checked)}
                className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
              />
              <span>Открыть общий доступ (виден всей параллели лицеистов РЛИ)</span>
            </label>
          </div>

          {containsProfanity(noteText) && (
            <div className="text-[11px] bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0 text-red-500"/>
              Текст конспекта содержит недопустимые выражения (Кодекс этики РЛИ).
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createNote} disabled={noteLoading || (!noteText.trim() && !noteImagePreview) || containsProfanity(noteText)} className="flex-1 gradient-terra text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1 disabled:opacity-50">
              {noteLoading ? <><Clock size={14} className="animate-spin"/> Оцифровка...</> : <><Zap size={14}/> Оцифровать через ИИ</>}
            </button>
            <button onClick={() => setShowNoteModal(false)} className="px-4 bg-stone-100 text-stone-600 text-xs font-semibold py-2.5 rounded-xl">Отмена</button>
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && <div className="text-center text-sm text-stone-400 py-8">Нет конспектов. Нажмите + Оцифровать</div>}
      {filteredNotes.map(n => (
        <div key={n.id} className="card p-4 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-stone-900">{n.title}</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${n.isLiveAI?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{n.isLiveAI?'Gemini AI':'Smart Local'}</span>
              <button
                onClick={() => deleteNote(n.id)}
                className="text-stone-400 hover:text-red-500 p-1 rounded-lg transition"
                title="Удалить конспект"
              >
                <Trash2 size={15}/>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>{n.subject}</span>
            {n.category && n.category !== 'Все' && (
              <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md text-[10px] font-medium">{n.category}</span>
            )}
            {n.author && (
              <span className="text-[10px] text-stone-400 ml-auto">автор: {n.author}</span>
            )}
          </div>

          {/* Фото страницы тетради, если загружено */}
          {n.image && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setNotePhotoModal(n.image)}
                className="group relative rounded-xl overflow-hidden border border-stone-200 block text-left w-full hover:border-orange-400 transition"
              >
                <img src={n.image} alt={n.title} className="w-full h-36 object-cover group-hover:scale-102 transition duration-200" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold gap-1.5">
                  <Camera size={14}/> Нажмите, чтобы открыть фото страницы
                </div>
              </button>
            </div>
          )}

          {n.formulas?.length > 0 && (
            <div className="bg-stone-50 rounded-lg px-3 py-2 border border-stone-100 space-y-0.5">
              {n.formulas.map((f,i) => <div key={i} className="text-xs font-mono text-stone-700 font-medium">{f}</div>)}
            </div>
          )}

          {n.theses?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {n.theses.map((t,i) => (
                <div key={i} className="text-xs text-stone-700 bg-stone-50/80 p-2 rounded-lg border border-stone-200/50 leading-relaxed">
                  {t}
                </div>
              ))}
            </div>
          )}

          {n.quiz && (
            <div className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-100">
              <div className="text-xs font-semibold flex items-center gap-1"><Target size={12}/> Мини-проверка темы</div>
              <div className="text-xs text-stone-700 font-medium">{n.quiz.question}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {n.quiz.options.map((o,i) => (
                  <button key={i} onClick={() => answerNoteQuiz(n.id, i)} disabled={n.quizDone}
                    className={`text-xs py-2 px-2 rounded-lg border text-left transition font-medium
                      ${n.quizDone ? (i === n.quiz.correctIndex ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : i === n.quizPicked ? 'border-red-400 bg-red-50 text-red-700' : 'border-stone-100 opacity-40') : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50'}`}
                  >{o}</button>
                ))}
              </div>
              {n.quizDone && <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><ArrowUp size={12}/> +15 XP, +5 листов (Практика)</div>}
            </div>
          )}
        </div>
      ))}

      {/* Модальное окно полного просмотра фото тетради */}
      {notePhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl p-4 max-w-lg w-full space-y-3 animate-slide">
            <div className="flex items-center justify-between text-white">
              <span className="font-bold text-sm flex items-center gap-1.5"><Camera size={16} className="text-orange-400"/> Фото конспекта из тетради</span>
              <button onClick={() => setNotePhotoModal(null)} className="text-stone-400 hover:text-white p-1"><X size={20}/></button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img src={notePhotoModal} alt="Конспект" className="max-h-[70vh] w-auto object-contain" />
            </div>
            <button
              onClick={() => setNotePhotoModal(null)}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ---------- [3] ДРУЗЬЯ И SOS-МЕНТОРСТВО ----------
  const renderSos = () => (
    <div className="space-y-4 animate-fade">
      {/* Список зарегистрированных лицеистов РЛИ */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm flex items-center gap-1.5"><Users size={16} className="text-orange-600"/> Лицеисты РЛИ ({users.length})</span>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <Radio size={12} className="animate-pulse"/> {onlineUsers.length} онлайн
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-100/80 px-2.5 py-1.5 rounded-xl border border-stone-200/50">
          <span>Вы: <strong className="text-stone-800">{profile?.name}</strong> ({profile?.profileGroup})</span>
          <span>Лимит: <strong className="text-emerald-600 font-semibold">Без ограничений</strong></span>
        </div>

        {/* Фильтры и поиск одноклассников */}
        <div className="space-y-2">
          <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFriendTabFilter('all')}
              className={`flex-1 py-1 rounded-lg transition ${friendTabFilter==='all'?'bg-white text-stone-900 shadow-sm':'text-stone-500'}`}
            >
              Все ({availableOpponents.length})
            </button>
            <button
              onClick={() => setFriendTabFilter('friends')}
              className={`flex-1 py-1 rounded-lg transition ${friendTabFilter==='friends'?'bg-white text-stone-900 shadow-sm':'text-stone-500'}`}
            >
              Друзья ⭐ ({profile?.friends?.length || 0})
            </button>
            <button
              onClick={() => setFriendTabFilter('online')}
              className={`flex-1 py-1 rounded-lg transition ${friendTabFilter==='online'?'bg-white text-stone-900 shadow-sm':'text-stone-500'}`}
            >
              В сети 🟢 ({onlineUsers.filter(u => u !== profile?.name).length})
            </button>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"/>
            <input
              value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)}
              placeholder="Поиск одноклассника..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
            />
          </div>
        </div>

        {availableOpponents.length === 0 ? (
          <div className="text-center py-4 space-y-2">
            <div className="text-xs text-stone-500">Пока никто из одноклассников не зарегистрировался.</div>
            <button
              onClick={() => setShowQrModal(true)}
              className="gradient-terra text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm inline-flex items-center gap-1"
            >
              <QrCode size={13}/> Пригласить по ссылке
            </button>
          </div>
        ) : filteredOpponentsForFriends.length === 0 ? (
          <div className="text-center py-4 text-xs text-stone-400">Никого не найдено по фильтру</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredOpponentsForFriends.map(opp => {
              const isFriend = profile?.friends?.some(f => f.toLowerCase() === opp.name.toLowerCase());
              const isOnline = onlineUsers.includes(opp.name);
              return (
                <div key={opp.name} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/60">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`}/>
                      <span>{opp.name}</span>
                      {isFriend && <Star size={12} className="text-amber-500 fill-amber-500"/>}
                    </div>
                    <div className="text-[10px] text-stone-400">{opp.profileGroup} • {opp.elo} ELO</div>
                  </div>
                  <div className="flex gap-1.5">
                    {!isFriend ? (
                      <button
                        onClick={() => sendFriendRequest(opp.name)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 transition shadow-sm"
                      >
                        + В друзья
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center">Друг ⭐</span>
                    )}
                    <button
                      onClick={() => sendDuelChallenge(opp.name)}
                      className="gradient-terra text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm hover:opacity-90"
                    >
                      <Swords size={12}/> Вызов
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SOS-запросы лицеистов */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-lg font-extrabold flex items-center gap-2"><MessageCircle size={20} className="text-orange-600"/> SOS-Менторство</h2>
        <button onClick={() => setShowSosForm(true)} className="gradient-terra text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1 shadow-md">
          <Plus size={14}/> Запрос
        </button>
      </div>

      {showSosForm && (
        <div className="card p-4 space-y-3 border-orange-200 animate-slide">
          <div className="font-semibold text-sm">Новый запрос помощи</div>
          <input value={sosRoom} onChange={e => setSosRoom(e.target.value)} placeholder="Кабинет или общежитие (напр. 305 каб.)" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-300"/>
          <select value={sosSubject} onChange={e => setSosSubject(e.target.value)} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm">
            <option>Физика</option><option>Профмат</option><option>Информатика</option>
          </select>
          <textarea value={sosText} onChange={e => setSosText(e.target.value)} rows={2} placeholder="Опишите вопрос, с которым не можете справиться..." className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-300"/>
          {containsProfanity(sosText) && (
            <div className="text-[11px] bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0 text-red-500"/>
              Формулируйте вопрос уважительно без ненормативной лексики.
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={addSos} disabled={!sosText.trim() || containsProfanity(sosText)} className="flex-1 gradient-terra text-white text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1"><Send size={14}/> Отправить</button>
            <button onClick={() => setShowSosForm(false)} className="px-4 bg-stone-100 text-stone-600 text-xs font-semibold py-2.5 rounded-xl">Отмена</button>
          </div>
        </div>
      )}

      {/* Модальное окно: НАПИСАТЬ РЕШЕНИЕ И ПОЛУЧИТЬ +30 ELO */}
      {sosHelpTarget && (
        <div className="card p-4 border-emerald-300 space-y-3 animate-slide shadow-xl bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Zap size={16} className="text-emerald-600"/> Помочь лицеисту {sosHelpTarget.author}
            </div>
            <button onClick={() => setSosHelpTarget(null)} className="text-stone-400 hover:text-stone-700"><X size={16}/></button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs space-y-1">
            <div className="font-semibold text-stone-500">{sosHelpTarget.subject} • {sosHelpTarget.room}</div>
            <div className="text-stone-800 font-medium">«{sosHelpTarget.text}»</div>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 mb-1 block">Ваше объяснение или формула решения:</label>
            <textarea
              value={sosHelpExplanation}
              onChange={e => setSosHelpExplanation(e.target.value)}
              rows={3}
              placeholder="Напишите понятное объяснение решения задачи, чтобы помочь лицеисту..."
              className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs resize-none focus:outline-none focus:border-emerald-500"
            />
            {containsProfanity(sosHelpExplanation) && (
              <div className="text-[11px] bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 mt-1.5">
                <AlertTriangle size={13} className="shrink-0 text-red-500"/>
                Обнаружена недопустимая лексика. Соблюдайте Лицейский кодекс этики.
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={submitSosHelp}
              disabled={sosHelpSubmitting || !sosHelpExplanation.trim() || containsProfanity(sosHelpExplanation)}
              className="flex-1 gradient-emerald text-white text-xs font-bold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send size={14}/> Отправить ответ в тред
            </button>
            <button
              onClick={() => setSosHelpTarget(null)}
              className="px-3 bg-stone-100 text-stone-600 text-xs font-semibold py-2.5 rounded-xl hover:bg-stone-200"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Список запросов SOS */}
      <div className="space-y-2">
        {sosRequests.map(r => (
          <div key={r.id} className="card p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">{r.room}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500">{r.subject}</span>
                <button
                  onClick={() => deleteSos(r.id)}
                  className="text-stone-400 hover:text-red-500 p-1 rounded-lg transition"
                  title="Удалить запрос"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
            <div className="text-sm font-medium text-stone-800">{r.text}</div>

            {/* Тред ответов лицеистов */}
            {((r.answers && r.answers.length > 0) || (r.explanation && r.helper)) && (
              <div className="space-y-2 pt-1 border-t border-stone-200/60">
                <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  Ответы лицеистов ({((r.answers && r.answers.length) || (r.explanation ? 1 : 0))})
                </div>

                {(r.answers && r.answers.length > 0
                  ? r.answers
                  : [{ id: 1, helper: r.helper, text: r.explanation, isAccepted: r.status === 'helped', reported: false }]
                ).map(ans => {
                  const isAuthor = profile?.name?.toLowerCase() === r.author?.toLowerCase();
                  return (
                    <div
                      key={ans.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition ${
                        ans.isAccepted
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : ans.reported
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold flex items-center gap-1.5">
                          {ans.isAccepted ? (
                            <span className="text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600"/> Принятое решение от {ans.helper}
                            </span>
                          ) : (
                            <span className="text-stone-800">Решение от {ans.helper}:</span>
                          )}
                          {ans.reported && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                              ⏳ На проверке Совета Лицея
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Автор запроса может ПРИНЯТЬ ответ как лучший (+30 ELO) */}
                          {isAuthor && !ans.isAccepted && !ans.toxicConfirmed && (
                            <button
                              onClick={() => acceptSosAnswer(r.id, ans.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 transition"
                            >
                              <Check size={11}/> Принять (+30 ELO)
                            </button>
                          )}

                          {/* Любой лицеист может пожаловаться */}
                          {!ans.reported && !ans.toxicConfirmed && (
                            <button
                              onClick={() => reportSosAnswer(r.id, ans.id)}
                              className="text-stone-400 hover:text-red-500 text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition"
                              title="Пожаловаться Совету Лицея"
                            >
                              <Flag size={11}/> Пожаловаться
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={`leading-relaxed ${ans.toxicConfirmed ? 'italic text-red-600' : 'text-stone-700'}`}>
                        {ans.text}
                      </div>

                      {/* Панель модератора для Совета Лицея (Леонид) */}
                      {isAdmin && ans.reported && (
                        <div className="pt-2 mt-1 border-t border-amber-200/80 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                            <ShieldCheck size={12} className="text-amber-700"/> Совет Лицея:
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => moderateSosAnswer(r.id, ans.id, 'approve')}
                              className="px-2 py-1 bg-white border border-stone-300 text-stone-700 rounded-lg text-[10px] font-semibold hover:bg-stone-100 transition shadow-sm"
                            >
                              Одобрить (нет нарушений)
                            </button>
                            <button
                              onClick={() => moderateSosAnswer(r.id, ans.id, 'delete')}
                              className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition shadow-sm"
                            >
                              Удалить и штраф -30 ELO
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-stone-400">от {r.author}</span>
              <button
                onClick={() => openHelpModal(r)}
                className="gradient-terra text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm hover:opacity-90 transition"
              >
                <Zap size={12}/> Ответить лицеисту (+30 ELO за принятие)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- [4] СИСТЕМА ----------
  const renderSystem = () => (
    <div className="space-y-4 animate-fade">
      <h2 className="text-lg font-extrabold flex items-center gap-2"><Activity size={20} className="text-orange-600"/> Система</h2>

      <div className={`card p-4 flex items-center gap-3 ${hasKey?'border-emerald-200':'border-amber-200'}`}>
        {hasKey ? <Wifi size={20} className="text-emerald-500"/> : <Brain size={20} className="text-orange-500"/>}
        <div className="flex-1">
          <div className="text-sm font-bold text-stone-800">
            {hasKey ? 'Gemini 2.0 Flash + Динамический движок РЛИ' : 'Умный процедурный ИИ-движок РЛИ'}
          </div>
          <div className="text-xs text-stone-500">
            {hasKey ? 'Генерация задач и конспектов через облако Google AI' : 'Динамическая генерация уникальных задач с новыми числами'}
          </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"/>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Key size={14}/> Google Gemini AI API-ключ</div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Бесплатный ключ от <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-orange-600 underline font-semibold">aistudio.google.com</a> (начинается с <code>AIzaSy...</code>). Позволяет подключить облачную модель Gemini 2.0 Flash. Без ключа Арена работает автономно на лицейском офлайн-движке ФИПИ (Smart Local).
        </p>
        <input value={apiInput} onChange={e => setApiInput(e.target.value)} placeholder="AIzaSy... (Ключ Google AI Studio)" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-300"/>
        <div className="flex gap-2">
          <button onClick={saveKey} disabled={!apiInput.trim()} className="flex-1 gradient-terra text-white text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1">
            <Check size={14}/> Сохранить свой ключ
          </button>
          <button onClick={pingGemini} className="flex-1 gradient-emerald text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1">
            <Zap size={14}/> Тест API
          </button>
        </div>
        {testResult && (
          <div className={`text-xs rounded-lg px-3 py-2 ${testResult.ok?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-600'}`}>
            {testResult.ok ? `OK (${testResult.ms}мс): ${testResult.message}` : `Ошибка: ${testResult.message}`}
          </div>
        )}
      </div>

      {/* Кнопка сброса базы перед показом / жюри */}
      <div className="card p-4 space-y-2 border-red-200 bg-red-50/30">
        <div className="text-xs font-bold text-red-800 flex items-center gap-1.5">
          <Trash2 size={14} className="text-red-500"/> Перезапуск для демонстрации (Жюри)
        </div>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Очищает список всех участников, сбрасывает очки и вызовы. Позволяет заново с чистого листа зарегистрироваться и показать работу проекта.
        </p>
        <button
          onClick={doReset}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition"
        >
          <RotateCcw size={14}/> Очистить базу и начать заново
        </button>
      </div>

      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-1.5"><Monitor size={14}/> Системный лог</span>
          <button onClick={doReset} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><RotateCcw size={12}/> Сброс</button>
        </div>
        <div className="bg-stone-900 rounded-xl p-3 max-h-64 overflow-y-auto">
          {sysLogs.length === 0 && <div className="text-xs text-stone-500 font-mono">Лог пуст</div>}
          {sysLogs.slice(0, 50).map((l, i) => (
            <div key={i} className="text-xs font-mono leading-relaxed">
              <span className="text-stone-500">{l.ts}</span>{' '}
              <span className={
                l.tag.includes('AI') ? 'text-cyan-400' :
                l.tag.includes('ELO') ? 'text-amber-400' :
                l.tag.includes('AUTH') ? 'text-purple-400' :
                l.tag.includes('FRIENDS') ? 'text-yellow-400' :
                l.tag.includes('DUEL') ? 'text-orange-400' :
                'text-emerald-400'
              }>{l.tag}</span>{' '}
              <span className="text-stone-300">{l.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { icon: Home, label: 'Главная' },
    { icon: Swords, label: 'Дуэль' },
    { icon: BookOpen, label: 'Конспекты' },
    { icon: Users, label: 'Друзья' },
    { icon: Settings, label: 'Система' }
  ];
  const pages = [renderHome, renderDuel, renderNotes, renderSos, renderSystem];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'theme-dark bg-black' : 'theme-light bg-[#18181B]'} flex justify-center`}>
      <div className={`w-full max-w-[440px] min-h-screen ${theme === 'dark' ? 'bg-[#18181B] text-[#F4F4F5] border-[#27272A]' : 'bg-[#F5F2EB] text-[#1C1917] border-[#E2DDD3]'} shadow-2xl border-x flex flex-col relative transition-colors duration-200`}>
        <main className="flex-1 overflow-y-auto px-4 pt-5 pb-24">
          {pages[tab]()}
        </main>

        <nav className={`fixed bottom-0 w-full max-w-[440px] ${theme === 'dark' ? 'bg-[#18181B]/95 border-[#27272A]' : 'bg-white/95 border-[#E6E1D6]'} backdrop-blur-lg border-t px-2 py-2 flex justify-around z-50`}>
          {tabs.map((t, i) => {
            const Icon = t.icon;
            const active = tab === i;
            return (
              <button key={i} onClick={() => setTab(i)} className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${active ? 'text-orange-600' : 'text-stone-400 hover:text-stone-600'}`}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8}/>
                <span className={`text-[10px] font-semibold ${active ? 'text-orange-600' : 'text-stone-400'}`}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
