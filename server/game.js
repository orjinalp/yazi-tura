// ─── Sunucu tarafı ekonomi kuralları ─────────────────────────────────────────
// Client'taki game.js ile BİREBİR aynı sabitler; ama burada otoriter olan sunucu.
// Atış sonucu crypto ile üretilir — client sonucu ne belirleyebilir ne de tahmin
// edebilir (seed göndermez, RNG sunucuda döner).
const crypto = require('crypto');

const FLIP_COST = 1.00;    // yeni tura giriş ücreti (kasadan düşer)
const AD_REWARD = 10.00;   // reklam ödülü (dummy)
const AD_COOLDOWN_MS = 20 * 1000; // reklam ödülleri arası minimum süre
const START_KASA = 1;      // yeni oyuncunun başlangıç kasası

// Pot her doğru tahminde ikiye katlanır: seri n → 2^n dolar.
function potAt(streak) { return streak <= 0 ? 0 : Math.pow(2, streak); }

// Kriptografik, yansız yazı/tura.
function coinFlip() { return crypto.randomInt(2) === 0 ? 'yazi' : 'tura'; }

// Yeni oyuncunun oyun durumu (istatistik alanları dahil).
function newPlayerState() {
  return {
    kasa: START_KASA,
    pot: 0,
    streak: 0,
    best: 0,
    total: 0,
    wins: 0,
    cashedOut: 0,
    cashOutCount: 0,
    bestCashout: 0,
    adsWatched: 0,
  };
}

// Client'a/oyuncuya dönecek güvenli durum görünümü (sır içermez).
function publicState(p) {
  return {
    kasa: p.kasa, pot: p.pot, streak: p.streak, best: p.best,
    total: p.total, wins: p.wins, cashedOut: p.cashedOut,
    cashOutCount: p.cashOutCount, bestCashout: p.bestCashout,
    adsWatched: p.adsWatched, name: p.name,
  };
}

// ── Otoriter aksiyonlar. Hepsi p'yi yerinde günceller; {error} dönerse reddedilir.

function applyFlip(p, choice) {
  if (choice !== 'yazi' && choice !== 'tura') return { error: 'bad_choice' };
  // yeni tura başlıyorsa (seri 0) kasadan giriş ücreti al
  if (p.streak === 0) {
    if (p.kasa < FLIP_COST) return { error: 'insufficient_kasa' };
    p.kasa -= FLIP_COST;
  }
  const result = coinFlip();
  const won = choice === result;
  p.total++;
  if (won) {
    p.wins++;
    p.streak++;
    p.pot = potAt(p.streak);
    if (p.streak > p.best) p.best = p.streak;
  } else {
    p.streak = 0;
    p.pot = 0;
  }
  return { result, won };
}

function applyCashout(p) {
  if (p.pot <= 0) return { error: 'no_pot' };
  const amount = p.pot;
  p.kasa += amount;
  p.cashedOut += amount;
  p.cashOutCount++;
  if (amount > p.bestCashout) p.bestCashout = amount;
  p.pot = 0;
  p.streak = 0;
  return { amount };
}

function applyAd(p, now) {
  if (p.lastAdAt && now - p.lastAdAt < AD_COOLDOWN_MS) {
    return { error: 'cooldown', retryInMs: AD_COOLDOWN_MS - (now - p.lastAdAt) };
  }
  p.kasa += AD_REWARD;
  p.adsWatched++;
  p.lastAdAt = now;
  return { reward: AD_REWARD };
}

module.exports = {
  FLIP_COST, AD_REWARD, AD_COOLDOWN_MS, START_KASA,
  potAt, coinFlip, newPlayerState, publicState,
  applyFlip, applyCashout, applyAd,
};
