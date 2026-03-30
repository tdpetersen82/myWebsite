// ============================================================
// Arcade Game Hub — Persistent Top Navigation Bar
// Include this script on every page: <script src="nav.js"></script>
// ============================================================

(function () {
    'use strict';

    // ── Game Catalog ────────────────────────────────────────
    // SVG icon helper — compact inline SVGs for each game
    var I = {
        snake: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 26c0-6 6-6 6-12S6 8 6 4c0-1.5 1-3 3-3h6c2 0 3 1.5 3 3 0 4-6 6-6 10s6 6 6 12c0 2-1.5 3.5-3.5 3.5S11 28 11 26" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round"/><circle cx="8" cy="3" r="1" fill="#ef4444"/><circle cx="10" cy="3" r="1" fill="#ef4444"/></svg>',
        pong: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="3" height="12" rx="1.5" fill="#667eea"/><rect x="25" y="12" width="3" height="12" rx="1.5" fill="#764ba2"/><circle cx="16" cy="16" r="2.5" fill="#fff" stroke="#667eea" stroke-width="1.5"/><line x1="16" y1="2" x2="16" y2="30" stroke="#667eea" stroke-width="0.5" stroke-dasharray="2 2" opacity="0.4"/></svg>',
        breakout: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="6" height="3" rx="1" fill="#ef4444"/><rect x="11" y="4" width="6" height="3" rx="1" fill="#f59e0b"/><rect x="19" y="4" width="6" height="3" rx="1" fill="#22c55e"/><rect x="27" y="4" width="2" height="3" rx="1" fill="#3b82f6"/><rect x="3" y="9" width="6" height="3" rx="1" fill="#8b5cf6"/><rect x="11" y="9" width="6" height="3" rx="1" fill="#ec4899"/><rect x="19" y="9" width="6" height="3" rx="1" fill="#06b6d4"/><rect x="10" y="27" width="12" height="3" rx="1.5" fill="#667eea"/><circle cx="16" cy="22" r="2" fill="#764ba2"/></svg>',
        spaceinvaders: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 8h2v2H8zM22 8h2v2h-2zM6 10h20v8H6zM4 14h2v6H4zM26 14h2v6h-2zM8 18h4v4H8zM20 18h4v4h-4zM10 22h2v4h-2zM20 22h2v4h-2z" fill="#4ade80"/><rect x="12" y="12" width="3" height="3" fill="#0f0c29"/><rect x="18" y="12" width="3" height="3" fill="#0f0c29"/></svg>',
        flappy: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="14" cy="16" rx="8" ry="6" fill="#facc15"/><circle cx="18" cy="14" r="2.5" fill="#fff"/><circle cx="19" cy="13.5" r="1" fill="#1e293b"/><path d="M22 16l4 1-4 1z" fill="#ef4444"/><path d="M6 12c-2-3 0-6 3-5" stroke="#facc15" stroke-width="2" stroke-linecap="round"/><rect x="26" y="0" width="4" height="12" rx="2" fill="#22c55e"/><rect x="26" y="22" width="4" height="10" rx="2" fill="#22c55e"/></svg>',
        blockpuzzle: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="20" width="6" height="6" rx="1" fill="#06b6d4"/><rect x="10" y="20" width="6" height="6" rx="1" fill="#06b6d4"/><rect x="10" y="14" width="6" height="6" rx="1" fill="#06b6d4"/><rect x="16" y="20" width="6" height="6" rx="1" fill="#8b5cf6"/><rect x="22" y="20" width="6" height="6" rx="1" fill="#8b5cf6"/><rect x="16" y="14" width="6" height="6" rx="1" fill="#8b5cf6"/><rect x="10" y="6" width="6" height="6" rx="1" fill="#f59e0b" opacity="0.6"/><path d="M13 3v3" stroke="#f59e0b" stroke-width="1" stroke-dasharray="1 1"/></svg>',
        asteroids: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="16,4 12,10 4,12 8,20 6,28 16,24 26,28 24,20 28,12 20,10" stroke="#a78bfa" stroke-width="2" fill="none"/><polygon points="16,20 14,24 16,28 18,24" fill="#ef4444"/><polygon points="16,12 14,16 16,20 18,16" stroke="#667eea" stroke-width="1.5" fill="none"/></svg>',
        pacman: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M28 16a12 12 0 1 1-6-10.4L16 16z" fill="#facc15"/><circle cx="18" cy="10" r="1.5" fill="#1e293b"/><circle cx="5" cy="16" r="1.5" fill="#667eea" opacity="0.5"/><circle cx="0" cy="16" r="1.5" fill="#667eea" opacity="0.3"/></svg>',
        frogger: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="18" rx="8" ry="6" fill="#22c55e"/><circle cx="11" cy="12" r="3" fill="#22c55e"/><circle cx="21" cy="12" r="3" fill="#22c55e"/><circle cx="11" cy="11" r="1.5" fill="#fff"/><circle cx="21" cy="11" r="1.5" fill="#fff"/><circle cx="11.5" cy="10.5" r="0.8" fill="#1e293b"/><circle cx="21.5" cy="10.5" r="0.8" fill="#1e293b"/><path d="M12 21a4 4 0 0 0 8 0" stroke="#15803d" stroke-width="1.5" fill="none"/></svg>',
        missile: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="24" width="8" height="6" rx="1" fill="#667eea"/><rect x="20" y="24" width="8" height="6" rx="1" fill="#667eea"/><path d="M8 24l4-10" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="2 2"/><path d="M24 24l-4-8" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="12" cy="14" r="3" fill="none" stroke="#ef4444" stroke-width="1.5"/><line x1="18" y1="4" x2="16" y2="10" stroke="#ef4444" stroke-width="1.5"/><line x1="22" y1="2" x2="20" y2="8" stroke="#ef4444" stroke-width="1"/></svg>',
        galaga: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 28l-4-6h-4l4-8h-2l6-12 6 12h-2l4 8h-4z" fill="#667eea"/><path d="M14 22h4v4h-4z" fill="#a78bfa"/><circle cx="8" cy="6" r="2" fill="#ef4444"/><circle cx="16" cy="4" r="2" fill="#ef4444"/><circle cx="24" cy="6" r="2" fill="#ef4444"/><circle cx="12" cy="8" r="1.5" fill="#f59e0b"/><circle cx="20" cy="8" r="1.5" fill="#f59e0b"/></svg>',
        centipede: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="10" r="3.5" fill="#22c55e"/><circle cx="12" cy="12" r="3" fill="#16a34a"/><circle cx="18" cy="10" r="3" fill="#22c55e"/><circle cx="24" cy="12" r="3" fill="#16a34a"/><circle cx="5" cy="8" r="1" fill="#ef4444"/><circle cx="7" cy="8" r="1" fill="#ef4444"/><path d="M6 14l-2 4M12 15l-1 4M18 13l1 4M24 15l2 4" stroke="#15803d" stroke-width="1.5" stroke-linecap="round"/><rect x="8" y="22" width="4" height="4" rx="2" fill="#a78bfa" opacity="0.4"/><rect x="20" y="20" width="4" height="4" rx="2" fill="#a78bfa" opacity="0.4"/></svg>',
        lunar: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 6l-3 10h-4l2 4-2 2h14l-2-2 2-4h-4z" stroke="#a78bfa" stroke-width="2" fill="none"/><path d="M14 22l-1 4M18 22l1 4M13 26h6" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/><path d="M15 22h2v3h-2z" fill="#ef4444" opacity="0.7"/><path d="M14 25c0 2 2 4 2 4s2-2 2-4" stroke="#f59e0b" stroke-width="1" fill="none"/><circle cx="8" cy="28" r="1.5" fill="#667eea" opacity="0.3"/><circle cx="24" cy="26" r="1" fill="#667eea" opacity="0.3"/></svg>',
        spacex: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="2" width="6" height="18" rx="3" fill="#e2e8f0"/><path d="M13 8l-3 6v6h3zM19 8l3 6v6h-3z" fill="#94a3b8"/><rect x="11" y="20" width="2" height="4" fill="#64748b"/><rect x="19" y="20" width="2" height="4" fill="#64748b"/><path d="M14 24c0 3 2 6 2 6s2-3 2-6" fill="#ef4444" opacity="0.8"/><path d="M15 24c0 2 1 4 1 4s1-2 1-4" fill="#facc15" opacity="0.8"/><rect x="6" y="26" width="20" height="4" rx="1" fill="#475569"/><text x="16" y="29.5" text-anchor="middle" font-size="3" fill="#a78bfa" font-weight="bold">OCISLY</text></svg>',
        joust: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="20" rx="7" ry="5" fill="#f5f5f4"/><ellipse cx="16" cy="15" rx="4" ry="3.5" fill="#fbbf24"/><circle cx="14" cy="14" r="1" fill="#1e293b"/><path d="M20 15l6-2" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/><path d="M26 13l2-1" stroke="#667eea" stroke-width="1.5" stroke-linecap="round"/><path d="M11 22l-2 6M16 24v5M21 22l2 6" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/></svg>',
        bomberman: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="18" r="9" fill="#1e293b"/><path d="M16 9c0-3 2-5 4-6" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="3" r="2.5" fill="#ef4444"/><circle cx="22" cy="3" r="1.5" fill="#f59e0b"/><rect x="12" y="14" width="3" height="3" rx="0.5" fill="#fff"/><rect x="17" y="14" width="3" height="3" rx="0.5" fill="#fff"/><path d="M13 22c1.5 1.5 4.5 1.5 6 0" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>',
        qbert: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 4l12 7v14l-12 7L4 25V11z" fill="none" stroke="#f59e0b" stroke-width="2"/><path d="M16 4l12 7-12 7L4 11z" fill="#f59e0b" opacity="0.3"/><path d="M4 11l12 7v14" stroke="#f59e0b" stroke-width="1" opacity="0.5"/><path d="M28 11l-12 7" stroke="#f59e0b" stroke-width="1" opacity="0.5"/><circle cx="13" cy="14" r="2" fill="#fff"/><circle cx="19" cy="14" r="2" fill="#fff"/><circle cx="13" cy="14" r="0.8" fill="#1e293b"/><circle cx="19" cy="14" r="0.8" fill="#1e293b"/><path d="M16 18v2" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>',
        donkeykong: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="12" r="8" fill="#92400e"/><circle cx="13" cy="10" r="2" fill="#fef3c7"/><circle cx="19" cy="10" r="2" fill="#fef3c7"/><circle cx="13" cy="10" r="0.8" fill="#1e293b"/><circle cx="19" cy="10" r="0.8" fill="#1e293b"/><ellipse cx="16" cy="15" rx="3" ry="2" fill="#d97706"/><path d="M14 15.5c0.5 0.5 3.5 0.5 4 0" stroke="#1e293b" stroke-width="0.8"/><rect x="10" y="20" width="12" height="6" rx="2" fill="#78350f"/><path d="M8 16l-3 6M24 16l3 6" stroke="#92400e" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="16" cy="28" rx="2" ry="1.5" fill="#ef4444" opacity="0.5"/></svg>',
        digdug: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="10" width="28" height="20" rx="2" fill="#92400e" opacity="0.3"/><circle cx="12" cy="18" r="4" fill="#3b82f6"/><circle cx="11" cy="17" r="1" fill="#fff"/><path d="M16 18h8" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 1"/><circle cx="26" cy="18" r="3" fill="#ef4444" opacity="0.6"/><circle cx="8" cy="26" r="2.5" fill="#a3a3a3" opacity="0.5"/><circle cx="22" cy="26" r="2.5" fill="#a3a3a3" opacity="0.5"/></svg>',
        tempest: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="16,2 28,10 28,22 16,30 4,22 4,10" fill="none" stroke="#06b6d4" stroke-width="1.5"/><polygon points="16,8 22,12 22,20 16,24 10,20 10,12" fill="none" stroke="#a78bfa" stroke-width="1.5"/><polygon points="16,13 18,14.5 18,17.5 16,19 14,17.5 14,14.5" fill="#667eea"/><line x1="16" y1="2" x2="16" y2="8" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="28" y1="10" x2="22" y2="12" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="28" y1="22" x2="22" y2="20" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="4" y1="10" x2="10" y2="12" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="4" y1="22" x2="10" y2="20" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="16" y1="30" x2="16" y2="24" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/></svg>',
        defender: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 16h6l3-4h6l3 4h6" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/><path d="M8 16l2 4h12l2-4" fill="#22c55e" opacity="0.3"/><path d="M4 16l2-2" stroke="#ef4444" stroke-width="1.5"/><circle cx="2" cy="14" r="1" fill="#ef4444"/><line x1="2" y1="24" x2="30" y2="24" stroke="#667eea" stroke-width="1" opacity="0.3"/><rect x="10" y="24" width="3" height="4" rx="0.5" fill="#667eea" opacity="0.4"/><rect x="20" y="24" width="3" height="4" rx="0.5" fill="#667eea" opacity="0.4"/></svg>',
        tron: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 26V10h8v8h6V6" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="26" r="2.5" fill="#06b6d4"/><path d="M26 6V22h-8v-6h-6v10" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="6" r="2.5" fill="#f59e0b"/></svg>',
        simon: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2a14 14 0 0 1 0 28" fill="none"/><path d="M4 16a12 12 0 0 1 12-12v12z" fill="#ef4444"/><path d="M16 4a12 12 0 0 1 12 12H16z" fill="#3b82f6"/><path d="M28 16a12 12 0 0 1-12 12V16z" fill="#22c55e"/><path d="M16 28a12 12 0 0 1-12-12h12z" fill="#facc15"/><circle cx="16" cy="16" r="4" fill="#1e293b"/></svg>',
        connect4: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="28" height="24" rx="3" fill="#3b82f6"/><circle cx="8" cy="12" r="3" fill="#e2e8f0"/><circle cx="16" cy="12" r="3" fill="#e2e8f0"/><circle cx="24" cy="12" r="3" fill="#facc15"/><circle cx="8" cy="20" r="3" fill="#ef4444"/><circle cx="16" cy="20" r="3" fill="#ef4444"/><circle cx="24" cy="20" r="3" fill="#ef4444"/><circle cx="8" cy="26" r="2" fill="#e2e8f0" opacity="0.3"/><circle cx="16" cy="26" r="2" fill="#facc15" opacity="0.3"/><circle cx="24" cy="26" r="2" fill="#e2e8f0" opacity="0.3"/></svg>',
        dots: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="6" r="2" fill="#667eea"/><circle cx="16" cy="6" r="2" fill="#667eea"/><circle cx="26" cy="6" r="2" fill="#667eea"/><circle cx="6" cy="16" r="2" fill="#667eea"/><circle cx="16" cy="16" r="2" fill="#667eea"/><circle cx="26" cy="16" r="2" fill="#667eea"/><circle cx="6" cy="26" r="2" fill="#667eea"/><circle cx="16" cy="26" r="2" fill="#667eea"/><circle cx="26" cy="26" r="2" fill="#667eea"/><line x1="6" y1="6" x2="16" y2="6" stroke="#ef4444" stroke-width="2"/><line x1="6" y1="6" x2="6" y2="16" stroke="#ef4444" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="16" stroke="#ef4444" stroke-width="2"/><line x1="6" y1="16" x2="16" y2="16" stroke="#ef4444" stroke-width="2"/><rect x="7" y="7" width="8" height="8" fill="#ef4444" opacity="0.15"/><line x1="16" y1="16" x2="26" y2="16" stroke="#3b82f6" stroke-width="2"/></svg>',
        hexdefense: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3l11 6.5v13L16 29 5 22.5v-13z" fill="none" stroke="#667eea" stroke-width="2"/><path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="#667eea" opacity="0.15"/><circle cx="16" cy="16" r="3" fill="none" stroke="#ef4444" stroke-width="2"/><line x1="16" y1="13" x2="16" y2="7" stroke="#ef4444" stroke-width="1.5"/><circle cx="16" cy="6" r="1.5" fill="#ef4444"/></svg>',
        blackjack: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="16" height="22" rx="2" fill="#fff" stroke="#1e293b" stroke-width="1.5"/><text x="7" y="14" font-size="8" font-weight="bold" fill="#1e293b">A</text><text x="6" y="22" font-size="8" fill="#1e293b">\u2660</text><rect x="13" y="6" width="16" height="22" rx="2" fill="#1e293b"/><text x="17" y="16" font-size="8" font-weight="bold" fill="#ef4444">K</text><text x="16" y="24" font-size="8" fill="#ef4444">\u2665</text></svg>',
        roulette: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="13" fill="none" stroke="#667eea" stroke-width="2"/><circle cx="16" cy="16" r="9" fill="none" stroke="#a78bfa" stroke-width="1.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4" stroke="#667eea" stroke-width="1.5"/><circle cx="16" cy="7" r="2" fill="#ef4444"/><circle cx="23" cy="11" r="2" fill="#1e293b"/><circle cx="23" cy="21" r="2" fill="#ef4444"/><circle cx="9" cy="11" r="2" fill="#1e293b"/><circle cx="9" cy="21" r="2" fill="#ef4444"/><circle cx="16" cy="25" r="2" fill="#1e293b"/><circle cx="16" cy="16" r="2" fill="#22c55e"/></svg>',
        videopoker: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="8" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2"/><text x="3.5" y="18" font-size="7" font-weight="bold" fill="#ef4444">J</text><rect x="11" y="6" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2"/><text x="13.5" y="16" font-size="7" font-weight="bold" fill="#ef4444">\u2665</text><rect x="21" y="8" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2"/><text x="23" y="18" font-size="7" font-weight="bold" fill="#1e293b">\u2660</text><rect x="4" y="26" width="24" height="3" rx="1" fill="#667eea" opacity="0.3"/></svg>',
        baccarat: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="12" height="18" rx="2" fill="#1e293b"/><text x="5" y="17" font-size="6" font-weight="bold" fill="#fbbf24">P</text><rect x="18" y="6" width="12" height="18" rx="2" fill="#7c2d12"/><text x="21" y="17" font-size="6" font-weight="bold" fill="#fbbf24">B</text><text x="16" y="30" text-anchor="middle" font-size="5" fill="#667eea" font-weight="bold">VS</text></svg>',
        craps: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="8" width="12" height="12" rx="2.5" fill="#ef4444" transform="rotate(-15 8 14)"/><circle cx="6" cy="11" r="1.2" fill="#fff"/><circle cx="10" cy="11" r="1.2" fill="#fff"/><circle cx="6" cy="15" r="1.2" fill="#fff"/><circle cx="10" cy="15" r="1.2" fill="#fff"/><circle cx="8" cy="13" r="1.2" fill="#fff"/><rect x="16" y="10" width="12" height="12" rx="2.5" fill="#fff" stroke="#1e293b" stroke-width="1.5" transform="rotate(10 22 16)"/><circle cx="20" cy="14" r="1.2" fill="#1e293b"/><circle cx="24" cy="14" r="1.2" fill="#1e293b"/><circle cx="20" cy="18" r="1.2" fill="#1e293b"/><circle cx="24" cy="18" r="1.2" fill="#1e293b"/></svg>',
        threecardpoker: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="8" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2" transform="rotate(-8 7 16)"/><rect x="11" y="6" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2"/><rect x="20" y="8" width="10" height="16" rx="1.5" fill="#fff" stroke="#667eea" stroke-width="1.2" transform="rotate(8 25 16)"/><text x="5" y="18" font-size="6" fill="#ef4444" font-weight="bold">A</text><text x="14" y="16" font-size="6" fill="#1e293b" font-weight="bold">K</text><text x="22" y="18" font-size="6" fill="#ef4444" font-weight="bold">Q</text></svg>',
        fruitcatcher: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="6" fill="#ef4444"/><path d="M12 6c-1-3 1-5 3-4" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="10" cy="10" rx="1.5" ry="2" fill="#fff" opacity="0.3"/><circle cx="24" cy="10" r="4" fill="#f59e0b"/><path d="M24 6c0-2 1-3 2-3" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/><path d="M6 26c0-2 4-3 10-3s10 1 10 3v2H6z" fill="#92400e"/><path d="M8 26c0-1.5 3.5-2.5 8-2.5s8 1 8 2.5" stroke="#78350f" stroke-width="1"/></svg>',
        streetbrawl: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" fill="#fbbf24"/><rect x="9" y="12" width="6" height="10" rx="1" fill="#3b82f6"/><path d="M9 16l-4 2M15 16l6-4" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/><path d="M21 12l4-2" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/><circle cx="26" cy="9" r="2.5" fill="none" stroke="#ef4444" stroke-width="1.5"/><text x="25" y="11" text-anchor="middle" font-size="4" fill="#ef4444" font-weight="bold">!</text><path d="M10 22l-2 6M14 22l2 6" stroke="#1e293b" stroke-width="2" stroke-linecap="round"/></svg>',
        offroad: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="16" cy="16" rx="14" ry="10" fill="none" stroke="#92400e" stroke-width="3"/><ellipse cx="16" cy="16" rx="8" ry="5" fill="none" stroke="#a3a3a3" stroke-width="1" stroke-dasharray="2 2"/><rect x="6" y="12" width="5" height="3" rx="1" fill="#ef4444"/><rect x="20" y="18" width="5" height="3" rx="1" fill="#3b82f6"/><rect x="13" y="7" width="5" height="3" rx="1" fill="#22c55e"/><circle cx="8.5" cy="13.5" r="1.5" fill="#1e293b"/><circle cx="22.5" cy="19.5" r="1.5" fill="#1e293b"/><circle cx="15.5" cy="8.5" r="1.5" fill="#1e293b"/></svg>',
        hillclimb: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="24" r="5" stroke="#666" stroke-width="2"/><circle cx="23" cy="24" r="5" stroke="#666" stroke-width="2"/><path d="M9 24l4-10h8l2 10" stroke="#c22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 14l3-8 5 3" stroke="#c22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="24" r="1.5" fill="#999"/><circle cx="23" cy="24" r="1.5" fill="#999"/></svg>',
    };

    const GAME_CATALOG = [
        {
            name: 'Classic Arcade', icon: '\u{1F47E}',
            games: [
                { name: 'Snake', icon: I.snake, url: 'snake/' },
                { name: 'Pong', icon: I.pong, url: 'pong/' },
                { name: 'Breakout', icon: I.breakout, url: 'breakout/' },
                { name: 'Space Invaders', icon: I.spaceinvaders, url: 'space-invaders/' },
                { name: 'Flappy Bird', icon: I.flappy, url: 'flappy-bird/' },
                { name: 'Block Puzzle', icon: I.blockpuzzle, url: 'block-puzzle/' },
            ]
        },
        {
            name: 'Retro Arcade', icon: '\u{1F579}\uFE0F',
            games: [
                { name: 'Asteroids', icon: I.asteroids, url: 'asteroids/' },
                { name: 'Pac-Man', icon: I.pacman, url: 'pac-man/' },
                { name: 'Frogger', icon: I.frogger, url: 'frogger/' },
                { name: 'Missile Command', icon: I.missile, url: 'missile-command/' },
                { name: 'Galaga', icon: I.galaga, url: 'galaga/' },
                { name: 'Centipede', icon: I.centipede, url: 'centipede/' },
                { name: 'Lunar Lander', icon: I.lunar, url: 'lunar-lander/' },
                { name: 'SpaceX Lander', icon: I.spacex, url: 'spacex-lander/' },
                { name: 'Joust', icon: I.joust, url: 'joust/' },
                { name: 'Bomberman', icon: I.bomberman, url: 'bomberman/' },
                { name: 'Q*bert', icon: I.qbert, url: 'qbert/' },
                { name: 'Donkey Kong', icon: I.donkeykong, url: 'donkey-kong/' },
                { name: 'Dig Dug', icon: I.digdug, url: 'dig-dug/' },
                { name: 'Tempest', icon: I.tempest, url: 'tempest/' },
                { name: 'Defender', icon: I.defender, url: 'defender/' },
                { name: 'Tron Light Cycles', icon: I.tron, url: 'tron/' },
                { name: 'Simon', icon: I.simon, url: 'simon/' },
            ]
        },
        {
            name: 'Strategy & Puzzles', icon: '\u{1F9E9}',
            games: [
                { name: 'Connect 4', icon: I.connect4, url: 'connect-4/' },
                { name: 'Dots & Boxes', icon: I.dots, url: 'connect-dots/' },
                { name: 'Hex Defense', icon: I.hexdefense, url: 'hex-defense/' },
            ]
        },
        {
            name: 'Casino', icon: '\u{1F3B0}',
            games: [
                { name: 'Blackjack', icon: I.blackjack, url: 'blackjack/' },
                { name: 'Roulette', icon: I.roulette, url: 'roulette/' },
                { name: 'Video Poker', icon: I.videopoker, url: 'video-poker/' },
                { name: 'Baccarat', icon: I.baccarat, url: 'baccarat/' },
                { name: 'Craps', icon: I.craps, url: 'craps/' },
                { name: 'Three Card Poker', icon: I.threecardpoker, url: 'three-card-poker/' },
            ]
        },
        {
            name: 'Action & More', icon: '\u{1F3AF}',
            games: [
                { name: 'Fruit Catcher', icon: I.fruitcatcher, url: 'fruit-catcher/' },
                { name: 'Street Brawl', icon: I.streetbrawl, url: 'beat-em-up/' },
                { name: 'Super Off Road', icon: I.offroad, url: 'off-road/' },
                { name: 'Dirt Bike Hill Climb', icon: I.hillclimb, url: 'hill-climb/' },
            ]
        },
    ];

    // ── Utilities Catalog ───────────────────────────────────
    const UTILITIES_CATALOG = [
        {
            name: 'Network & Device', icon: '\u{1F310}',
            items: [
                { name: 'My IP Address', icon: '\u{1F4CD}', url: 'utilities/my-ip/' },
                { name: 'Device Info', icon: '\u{1F4F1}', url: 'utilities/device-info/' },
                { name: 'Speed Test', icon: '\u{1F4F6}', url: 'utilities/speed-test/' },
                { name: "What's My Browser", icon: '\u{1F50D}', url: 'utilities/whats-my-browser/' },
                { name: 'HTTP Header Viewer', icon: '\u{1F4E1}', url: 'utilities/http-headers/' },
            ]
        },
        {
            name: 'Conversions', icon: '\u{1F504}',
            items: [
                { name: 'Unit Converter', icon: '\u{1F4CF}', url: 'utilities/unit-converter/' },
                { name: 'Color Converter', icon: '\u{1F3A8}', url: 'utilities/color-converter/' },
                { name: 'Number Base', icon: '\u{1F522}', url: 'utilities/number-base/' },
                { name: 'Data Size', icon: '\u{1F4BE}', url: 'utilities/data-size/' },
                { name: 'Temperature', icon: '\u{1F321}\uFE0F', url: 'utilities/temperature-converter/' },
                { name: 'Time Units', icon: '\u231B', url: 'utilities/time-converter/' },
                { name: 'Currency', icon: '\u{1F4B1}', url: 'utilities/currency-converter/' },
                { name: 'Angle', icon: '\u{1F4D0}', url: 'utilities/angle-converter/' },
                { name: 'Energy', icon: '\u26A1', url: 'utilities/energy-converter/' },
            ]
        },
        {
            name: 'Text & Data', icon: '\u{1F4DD}',
            items: [
                { name: 'Text Counter', icon: '\u{1F524}', url: 'utilities/text-counter/' },
                { name: 'Base64 Tool', icon: '\u{1F510}', url: 'utilities/base64-tool/' },
                { name: 'URL Encoder', icon: '\u{1F517}', url: 'utilities/url-encoder/' },
                { name: 'JSON Formatter', icon: '\u{1F4CB}', url: 'utilities/json-formatter/' },
                { name: 'UUID Generator', icon: '\u{1F3B2}', url: 'utilities/uuid-generator/' },
                { name: 'Case Converter', icon: '\u{1F520}', url: 'utilities/case-converter/' },
                { name: 'Lorem Ipsum', icon: '\u{1F4DC}', url: 'utilities/lorem-ipsum/' },
                { name: 'Slug Generator', icon: '\u{1F517}', url: 'utilities/slug-generator/' },
                { name: 'Duplicate Remover', icon: '\u{1F9F9}', url: 'utilities/duplicate-remover/' },
                { name: 'Find & Replace', icon: '\u{1F50E}', url: 'utilities/find-replace/' },
                { name: 'Text Diff', icon: '\u{1F4CA}', url: 'utilities/text-diff/' },
                { name: 'Markdown Preview', icon: '\u{1F4DD}', url: 'utilities/markdown-preview/' },
                { name: 'String Utilities', icon: '\u{1F9F5}', url: 'utilities/string-utilities/' },
            ]
        },
        {
            name: 'Visual & Math', icon: '\u{1F9EE}',
            items: [
                { name: 'QR Generator', icon: '\u{1F4F2}', url: 'utilities/qr-generator/' },
                { name: 'Color Picker', icon: '\u{1F308}', url: 'utilities/color-picker/' },
                { name: 'Password Generator', icon: '\u{1F512}', url: 'utilities/password-generator/' },
                { name: 'Calculator', icon: '\u{1F5A9}', url: 'utilities/calculator/' },
                { name: 'Stopwatch', icon: '\u{23F1}\uFE0F', url: 'utilities/stopwatch/' },
                { name: 'Gradient Generator', icon: '\u{1F3A8}', url: 'utilities/gradient-generator/' },
                { name: 'Box Shadow', icon: '\u{1F5BC}\uFE0F', url: 'utilities/box-shadow-generator/' },
                { name: 'Aspect Ratio', icon: '\u{1F4FA}', url: 'utilities/aspect-ratio-calculator/' },
                { name: 'Random Number', icon: '\u{1F3B0}', url: 'utilities/random-number/' },
                { name: 'Percentage Calc', icon: '\u2797', url: 'utilities/percentage-calculator/' },
            ]
        },
        {
            name: 'Developer Tools', icon: '\u{1F6E0}\uFE0F',
            items: [
                { name: 'Regex Tester', icon: '\u{1F9EA}', url: 'utilities/regex-tester/' },
                { name: 'JWT Decoder', icon: '\u{1F513}', url: 'utilities/jwt-decoder/' },
                { name: 'Cron Builder', icon: '\u{1F550}', url: 'utilities/cron-builder/' },
                { name: 'HTML Minifier', icon: '\u{1F5DC}\uFE0F', url: 'utilities/html-minifier/' },
                { name: 'CSS Minifier', icon: '\u{1F5DC}\uFE0F', url: 'utilities/css-minifier/' },
                { name: 'JS Minifier', icon: '\u{1F5DC}\uFE0F', url: 'utilities/js-minifier/' },
                { name: 'SQL Formatter', icon: '\u{1F5C3}\uFE0F', url: 'utilities/sql-formatter/' },
                { name: 'HTML Entities', icon: '\u{1F3F7}\uFE0F', url: 'utilities/html-entity-encoder/' },
                { name: 'JSON to CSV', icon: '\u{1F4C4}', url: 'utilities/json-to-csv/' },
                { name: 'CSV to JSON', icon: '\u{1F4CB}', url: 'utilities/csv-to-json/' },
                { name: 'YAML Formatter', icon: '\u{1F4D1}', url: 'utilities/yaml-formatter/' },
                { name: 'XML Formatter', icon: '\u{1F4F0}', url: 'utilities/xml-formatter/' },
            ]
        },
        {
            name: 'Encoding & Security', icon: '\u{1F510}',
            items: [
                { name: 'Hash Generator', icon: '#\uFE0F\u20E3', url: 'utilities/hash-generator/' },
                { name: 'HMAC Generator', icon: '\u{1F50F}', url: 'utilities/hmac-generator/' },
                { name: 'AES Encrypt', icon: '\u{1F510}', url: 'utilities/aes-encrypt/' },
                { name: 'Bcrypt Generator', icon: '\u{1F9C2}', url: 'utilities/bcrypt-generator/' },
                { name: 'RSA Key Generator', icon: '\u{1F511}', url: 'utilities/rsa-key-generator/' },
                { name: 'TOTP Generator', icon: '\u{1F522}', url: 'utilities/totp-generator/' },
                { name: 'CSR Decoder', icon: '\u{1F4DC}', url: 'utilities/csr-decoder/' },
                { name: 'SSL Cert Decoder', icon: '\u{1F6E1}\uFE0F', url: 'utilities/ssl-cert-decoder/' },
                { name: 'PGP Key Generator', icon: '\u{1F5DD}\uFE0F', url: 'utilities/pgp-key-generator/' },
            ]
        },
        {
            name: 'Date & Time', icon: '\u{1F4C5}',
            items: [
                { name: 'Unix Timestamp', icon: '\u{1F570}\uFE0F', url: 'utilities/epoch-converter/' },
                { name: 'Timezone Converter', icon: '\u{1F30D}', url: 'utilities/timezone-converter/' },
                { name: 'Date Calculator', icon: '\u{1F4C5}', url: 'utilities/date-calculator/' },
                { name: 'Date Difference', icon: '\u{1F4C6}', url: 'utilities/date-difference/' },
                { name: 'Countdown Timer', icon: '\u23F0', url: 'utilities/countdown-timer/' },
                { name: 'World Clock', icon: '\u{1F310}', url: 'utilities/world-clock/' },
                { name: 'Age Calculator', icon: '\u{1F382}', url: 'utilities/age-calculator/' },
                { name: 'Week Number', icon: '\u{1F4C7}', url: 'utilities/week-number/' },
            ]
        },
        {
            name: 'Image & Media', icon: '\u{1F5BC}\uFE0F',
            items: [
                { name: 'Image Resizer', icon: '\u{1F5BC}\uFE0F', url: 'utilities/image-resizer/' },
                { name: 'Image Compressor', icon: '\u{1F4E6}', url: 'utilities/image-compressor/' },
                { name: 'Image Cropper', icon: '\u2702\uFE0F', url: 'utilities/image-cropper/' },
                { name: 'Image to Base64', icon: '\u{1F504}', url: 'utilities/image-to-base64/' },
                { name: 'Favicon Generator', icon: '\u2B50', url: 'utilities/favicon-generator/' },
                { name: 'Placeholder Image', icon: '\u{1F3DE}\uFE0F', url: 'utilities/placeholder-image/' },
                { name: 'SVG to PNG', icon: '\u{1F500}', url: 'utilities/svg-to-png/' },
                { name: 'Color Palette', icon: '\u{1F3A8}', url: 'utilities/color-palette-generator/' },
                { name: 'Contrast Checker', icon: '\u267F', url: 'utilities/contrast-checker/' },
                { name: 'GIF Frame Viewer', icon: '\u{1F39E}\uFE0F', url: 'utilities/gif-maker/' },
            ]
        },
        {
            name: 'Web & SEO', icon: '\u{1F310}',
            items: [
                { name: 'Meta Tag Generator', icon: '\u{1F3F7}\uFE0F', url: 'utilities/meta-tag-generator/' },
                { name: 'Open Graph Preview', icon: '\u{1F441}\uFE0F', url: 'utilities/open-graph-preview/' },
                { name: 'Robots.txt Generator', icon: '\u{1F916}', url: 'utilities/robots-txt-generator/' },
                { name: 'Sitemap Generator', icon: '\u{1F5FA}\uFE0F', url: 'utilities/sitemap-generator/' },
                { name: '.htaccess Generator', icon: '\u2699\uFE0F', url: 'utilities/htaccess-generator/' },
                { name: 'Schema Markup', icon: '\u{1F4CA}', url: 'utilities/structured-data-generator/' },
                { name: 'Twitter Card', icon: '\u{1F426}', url: 'utilities/twitter-card-generator/' },
                { name: 'UTM Builder', icon: '\u{1F517}', url: 'utilities/utm-builder/' },
                { name: 'Redirect Codes', icon: '\u21A9\uFE0F', url: 'utilities/redirect-code-generator/' },
                { name: 'CSS Unit Converter', icon: '\u{1F4CF}', url: 'utilities/css-unit-converter/' },
            ]
        },
        {
            name: 'Math & Finance', icon: '\u{1F4B0}',
            items: [
                { name: 'Tip Calculator', icon: '\u{1F4B0}', url: 'utilities/tip-calculator/' },
                { name: 'Loan Calculator', icon: '\u{1F3E0}', url: 'utilities/loan-calculator/' },
                { name: 'Compound Interest', icon: '\u{1F4C8}', url: 'utilities/compound-interest/' },
                { name: 'BMI Calculator', icon: '\u2696\uFE0F', url: 'utilities/bmi-calculator/' },
                { name: 'Calorie Calculator', icon: '\u{1F34E}', url: 'utilities/calorie-calculator/' },
                { name: 'Discount Calculator', icon: '\u{1F3F7}\uFE0F', url: 'utilities/discount-calculator/' },
                { name: 'Unit Price Compare', icon: '\u{1F6D2}', url: 'utilities/unit-price-calculator/' },
                { name: 'GPA Calculator', icon: '\u{1F393}', url: 'utilities/gpa-calculator/' },
                { name: 'Salary Converter', icon: '\u{1F4BC}', url: 'utilities/salary-calculator/' },
                { name: 'Inflation Calculator', icon: '\u{1F4B9}', url: 'utilities/inflation-calculator/' },
                { name: 'Number to Words', icon: '\u{1F522}', url: 'utilities/number-to-words/' },
            ]
        },
        {
            name: 'Generators', icon: '\u{1F3B2}',
            items: [
                { name: 'Random Picker', icon: '\u{1F3A1}', url: 'utilities/random-picker/' },
                { name: 'Coin Flipper', icon: '\u{1FA99}', url: 'utilities/coin-flipper/' },
                { name: 'Dice Roller', icon: '\u{1F3B2}', url: 'utilities/dice-roller/' },
                { name: 'Team Generator', icon: '\u{1F465}', url: 'utilities/team-generator/' },
                { name: 'Random Color', icon: '\u{1F3A8}', url: 'utilities/color-randomizer/' },
                { name: 'Name Generator', icon: '\u{1F464}', url: 'utilities/name-generator/' },
                { name: 'Passphrase Generator', icon: '\u{1F524}', url: 'utilities/passphrase-generator/' },
                { name: 'Barcode Generator', icon: '\u{1F4CA}', url: 'utilities/barcode-generator/' },
                { name: 'QR Code Reader', icon: '\u{1F4F8}', url: 'utilities/qr-reader/' },
            ]
        },
        {
            name: 'Validators', icon: '\u2705',
            items: [
                { name: 'JSON Schema', icon: '\u2705', url: 'utilities/json-validator/' },
                { name: 'Email Validator', icon: '\u{1F4E7}', url: 'utilities/email-validator/' },
                { name: 'URL Validator', icon: '\u{1F517}', url: 'utilities/url-validator/' },
                { name: 'Credit Card', icon: '\u{1F4B3}', url: 'utilities/credit-card-validator/' },
                { name: 'IBAN Validator', icon: '\u{1F3E6}', url: 'utilities/iban-validator/' },
                { name: 'Regex Debugger', icon: '\u{1F41B}', url: 'utilities/regex-validator/' },
                { name: 'HTML Validator', icon: '\u{1F3D7}\uFE0F', url: 'utilities/html-validator/' },
                { name: 'CSS Validator', icon: '\u{1F3A8}', url: 'utilities/css-validator/' },
                { name: 'IP Address', icon: '\u{1F310}', url: 'utilities/ip-address-validator/' },
                { name: 'YAML Validator', icon: '\u{1F4D1}', url: 'utilities/yaml-validator/' },
                { name: 'Crontab Validator', icon: '\u{23F1}\uFE0F', url: 'utilities/crontab-validator/' },
            ]
        },
    ];

    // ── Viewport Size Presets ─────────────────────────────
    var SIZE_PRESETS = {
        compact:  { label: 'Compact',  vhFactor: 0.50, containerMax: 600 },
        medium:   { label: 'Medium',   vhFactor: 0.65, containerMax: 750 },
        standard: { label: 'Standard', vhFactor: 0.75, containerMax: 900 },
        large:    { label: 'Large',    vhFactor: 0.90, containerMax: 1100 }
    };
    var SIZE_ORDER = ['compact', 'medium', 'standard', 'large'];
    var DEFAULT_SIZE = 'medium';
    var currentSize = localStorage.getItem('arcadeViewportSize') || DEFAULT_SIZE;
    if (!SIZE_PRESETS[currentSize]) currentSize = DEFAULT_SIZE;

    var totalGames = GAME_CATALOG.reduce(function (sum, cat) { return sum + cat.games.length; }, 0);

    // Detect basePath from how the script tag references nav.js
    // Utility pages use src="../../nav.js", game pages use src="../nav.js", hub uses src="nav.js"
    var basePath = '';
    var inSubfolder = false;
    var isUtilityPage = false;
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].getAttribute('src') || '';
        if (src === '../../nav.js' || src.endsWith('/../../nav.js')) {
            basePath = '../../';
            inSubfolder = true;
            isUtilityPage = true;
            break;
        }
        if (src === '../nav.js' || src.endsWith('/../nav.js')) {
            basePath = '../';
            inSubfolder = true;
            break;
        }
    }

    // Determine current page for active highlighting
    var pathParts = location.pathname.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
    var lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : '';
    var currentPage = inSubfolder ? lastPart + '/' : 'index.html';
    if (isUtilityPage && pathParts.length >= 2) {
        currentPage = pathParts[pathParts.length - 2] + '/' + pathParts[pathParts.length - 1] + '/';
    }

    // ── Inject CSS ──────────────────────────────────────────
    var style = document.createElement('style');
    style.textContent = '\
/* ── Site Nav Bar ── */\
.site-nav{position:fixed;top:0;left:0;width:100%;z-index:10000;background:rgba(15,12,41,0.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:0 2px 20px rgba(0,0,0,0.3);font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif}\
.site-nav-inner{max-width:1400px;margin:0 auto;display:flex;align-items:center;height:52px;padding:0 16px;gap:4px}\
\
/* Home / Brand */\
.site-nav-home{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none;font-weight:700;font-size:0.95em;padding:6px 14px;border-radius:10px;transition:background .2s;white-space:nowrap;flex-shrink:0}\
.site-nav-home:hover{background:rgba(255,255,255,0.08)}\
.site-nav-home-icon{font-size:1.3em}\
\
/* Category triggers (desktop) */\
.site-nav-cats{display:flex;list-style:none;margin:0;padding:0;gap:2px;flex:1;justify-content:center}\
.site-nav-cat{position:relative}\
.site-nav-cat-btn{display:flex;align-items:center;gap:5px;padding:8px 12px;border:none;background:none;color:rgba(255,255,255,0.75);font-size:0.85em;font-weight:600;cursor:pointer;border-radius:8px;transition:background .2s,color .2s;white-space:nowrap;font-family:inherit}\
.site-nav-cat-btn:hover,.site-nav-cat.open .site-nav-cat-btn{background:rgba(255,255,255,0.1);color:#fff}\
.site-nav-cat-btn .chevron{font-size:0.65em;opacity:0.5;transition:transform .2s}\
.site-nav-cat.open .site-nav-cat-btn .chevron{transform:rotate(180deg)}\
\
/* Dropdown panels */\
.site-nav-dropdown{position:absolute;top:100%;left:50%;transform:translateX(-50%);min-width:200px;background:rgba(15,12,41,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:8px;box-shadow:0 12px 40px rgba(0,0,0,0.5);opacity:0;visibility:hidden;transition:opacity .15s,visibility .15s;margin-top:4px}\
.site-nav-cat.open .site-nav-dropdown{opacity:1;visibility:visible}\
.site-nav-dropdown a{display:flex;align-items:center;gap:8px;padding:8px 12px;color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.88em;border-radius:8px;transition:background .15s,color .15s}\
.site-nav-dropdown a:hover{background:rgba(102,126,234,0.15);color:#fff}\
.site-nav-dropdown a.active{color:#a78bfa;background:rgba(102,126,234,0.1);font-weight:600}\
.site-nav-dropdown .game-icon{width:22px;text-align:center;flex-shrink:0}\
.site-nav-dropdown .game-icon svg,.site-nav-search-results .game-icon svg,.mobile-game-list .game-icon svg{width:16px;height:16px;vertical-align:middle}\
\
/* Wide dropdown for Retro Arcade (16 games) */\
.site-nav-dropdown.wide{min-width:380px;display:grid;grid-template-columns:1fr 1fr;gap:2px}\
.site-nav-dropdown::-webkit-scrollbar{width:5px}\
.site-nav-dropdown::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:3px}\
.site-nav-dropdown{scrollbar-width:thin;scrollbar-color:rgba(102,126,234,0.3) transparent}\
\
/* Tools area (right side) */\
.site-nav-tools{display:flex;align-items:center;gap:4px;flex-shrink:0}\
\
/* Search */\
.site-nav-search{position:relative}\
.site-nav-search-btn{width:36px;height:36px;border:none;background:none;color:rgba(255,255,255,0.7);font-size:1.1em;cursor:pointer;border-radius:8px;transition:background .2s,color .2s;display:flex;align-items:center;justify-content:center}\
.site-nav-search-btn:hover{background:rgba(255,255,255,0.1);color:#fff}\
.site-nav-search-dropdown{position:absolute;top:100%;right:0;width:320px;background:rgba(15,12,41,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);opacity:0;visibility:hidden;transition:opacity .15s,visibility .15s;margin-top:4px}\
.site-nav-search.open .site-nav-search-dropdown{opacity:1;visibility:visible}\
.site-nav-search-dropdown input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#fff;font-size:0.9em;outline:none;transition:border-color .2s;font-family:inherit}\
.site-nav-search-dropdown input::placeholder{color:rgba(255,255,255,0.35)}\
.site-nav-search-dropdown input:focus{border-color:rgba(102,126,234,0.6)}\
.site-nav-search-results{max-height:300px;overflow-y:auto;margin-top:8px;scrollbar-width:thin;scrollbar-color:rgba(102,126,234,0.3) transparent}\
.site-nav-search-results::-webkit-scrollbar{width:5px}\
.site-nav-search-results::-webkit-scrollbar-thumb{background:rgba(102,126,234,0.3);border-radius:3px}\
.site-nav-search-results a{display:flex;align-items:center;gap:8px;padding:8px 10px;color:rgba(255,255,255,0.75);text-decoration:none;font-size:0.88em;border-radius:8px;transition:background .15s,color .15s}\
.site-nav-search-results a:hover{background:rgba(102,126,234,0.15);color:#fff}\
.site-nav-search-results .search-cat{color:rgba(255,255,255,0.35);font-size:0.75em;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:8px 10px 4px}\
.site-nav-search-none{color:rgba(255,255,255,0.35);text-align:center;padding:16px;font-size:0.9em}\
\
/* Size selector */\
.site-nav-size{position:relative}\
.site-nav-size-btn{width:36px;height:36px;border:none;background:none;color:rgba(255,255,255,0.7);font-size:1.1em;cursor:pointer;border-radius:8px;transition:background .2s,color .2s;display:flex;align-items:center;justify-content:center}\
.site-nav-size-btn:hover{background:rgba(255,255,255,0.1);color:#fff}\
.site-nav-size-dropdown{position:absolute;top:100%;right:0;width:220px;background:rgba(15,12,41,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px;box-shadow:0 12px 40px rgba(0,0,0,0.5);opacity:0;visibility:hidden;transition:opacity .15s,visibility .15s;margin-top:4px}\
.site-nav-size.open .site-nav-size-dropdown{opacity:1;visibility:visible}\
.nav-size-label{display:block;color:rgba(255,255,255,0.5);font-size:0.75em;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}\
.nav-size-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}\
.nav-size-btn{padding:8px 6px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:0.78em;cursor:pointer;transition:all .2s;font-family:inherit}\
.nav-size-btn:hover{background:rgba(255,255,255,0.1);color:#fff}\
.nav-size-btn.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-color:transparent;font-weight:600}\
\
/* Mobile hamburger */\
.site-nav-mobile-btn{display:none;width:36px;height:36px;border:none;background:none;cursor:pointer;border-radius:8px;transition:background .2s;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0}\
.site-nav-mobile-btn:hover{background:rgba(255,255,255,0.1)}\
.site-nav-mobile-btn .bar{display:block;width:18px;height:2px;background:#fff;border-radius:2px;transition:transform .3s,opacity .3s}\
body.mobile-nav-open .site-nav-mobile-btn .bar:nth-child(1){transform:rotate(45deg) translate(4px,4px)}\
body.mobile-nav-open .site-nav-mobile-btn .bar:nth-child(2){opacity:0}\
body.mobile-nav-open .site-nav-mobile-btn .bar:nth-child(3){transform:rotate(-45deg) translate(4px,-4px)}\
\
/* Mobile panel */\
.site-nav-mobile-panel{display:none;background:rgba(15,12,41,0.98);border-top:1px solid rgba(255,255,255,0.08);max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(0.4,0,0.2,1)}\
body.mobile-nav-open .site-nav-mobile-panel{max-height:calc(100vh - 52px);overflow-y:auto}\
.site-nav-mobile-panel .mobile-search{padding:12px 16px}\
.site-nav-mobile-panel .mobile-search input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#fff;font-size:0.9em;outline:none;font-family:inherit}\
.site-nav-mobile-panel .mobile-search input::placeholder{color:rgba(255,255,255,0.35)}\
.site-nav-mobile-panel .mobile-search input:focus{border-color:rgba(102,126,234,0.6)}\
.site-nav-mobile-panel .mobile-cat{border-bottom:1px solid rgba(255,255,255,0.05)}\
.site-nav-mobile-panel .mobile-cat-header{display:flex;align-items:center;gap:8px;padding:12px 16px;color:rgba(255,255,255,0.7);font-size:0.9em;font-weight:600;cursor:pointer;transition:background .2s}\
.site-nav-mobile-panel .mobile-cat-header:hover{background:rgba(255,255,255,0.05)}\
.site-nav-mobile-panel .mobile-cat-header .chevron{margin-left:auto;font-size:0.6em;transition:transform .2s}\
.site-nav-mobile-panel .mobile-cat.collapsed .chevron{transform:rotate(-90deg)}\
.site-nav-mobile-panel .mobile-cat.collapsed .mobile-game-list{display:none}\
.site-nav-mobile-panel .mobile-game-list{list-style:none;margin:0;padding:0 0 8px}\
.site-nav-mobile-panel .mobile-game-list a{display:flex;align-items:center;gap:10px;padding:8px 16px 8px 36px;color:rgba(255,255,255,0.65);text-decoration:none;font-size:0.88em;transition:background .15s,color .15s}\
.site-nav-mobile-panel .mobile-game-list a:hover{background:rgba(255,255,255,0.05);color:#fff}\
.site-nav-mobile-panel .mobile-game-list a.active{color:#a78bfa;font-weight:600}\
.site-nav-mobile-panel .mobile-size{padding:12px 16px;border-top:1px solid rgba(255,255,255,0.08)}\
.site-nav-mobile-panel .mobile-no-results{padding:16px;text-align:center;color:rgba(255,255,255,0.35);font-size:0.88em;display:none}\
\
/* Mobile overlay */\
.site-nav-mobile-overlay{position:fixed;top:52px;left:0;width:100%;height:calc(100vh - 52px);background:rgba(0,0,0,0.5);z-index:9998;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}\
body.mobile-nav-open .site-nav-mobile-overlay{opacity:1;visibility:visible}\
\
/* Ad slots for page content */\
.ad-slot{margin:20px auto;text-align:center;min-height:90px;background:rgba(0,0,0,0.02);border-radius:8px;overflow:hidden;width:100%}\
.ad-slot-responsive{width:100%;min-height:90px}\
.ad-slot .adsbygoogle{display:block}\
.ad-slot-leaderboard{width:100%;max-width:728px;min-height:90px}\
.ad-slot-rectangle{width:300px;min-height:250px}\
.ad-slot-banner{width:100%;max-width:320px;min-height:50px}\
\
/* Body scroll lock */\
body.mobile-nav-open{overflow:hidden}\
\
/* Ensure game content does not overlap nav */\
.container,.hub-container{position:relative}\
\
/* ── Responsive ── */\
@media(max-width:768px){\
.site-nav-cats{display:none}\
.site-nav-mobile-btn{display:flex}\
.site-nav-mobile-panel{display:block}\
.site-nav-search-dropdown{width:calc(100vw - 32px);right:-8px}\
}\
@media(min-width:769px){\
.site-nav-mobile-panel{display:none !important}\
.site-nav-mobile-overlay{display:none !important}\
}\
';
    document.head.appendChild(style);

    // ── Build DOM ───────────────────────────────────────────
    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Game navigation');

    var inner = document.createElement('div');
    inner.className = 'site-nav-inner';

    // Home link
    var homeLink = document.createElement('a');
    homeLink.href = basePath + 'index.html';
    homeLink.className = 'site-nav-home';
    homeLink.innerHTML = '<span class="site-nav-home-icon">\u{1F3AE}</span> <span>Arcade Hub</span>';
    inner.appendChild(homeLink);

    // Category triggers (desktop)
    var catList = document.createElement('ul');
    catList.className = 'site-nav-cats';
    var openCatTimer = null;
    var closeCatTimer = null;
    var currentOpenCat = null;

    function closeAllCats() {
        var all = catList.querySelectorAll('.site-nav-cat.open');
        all.forEach(function (el) { el.classList.remove('open'); });
        currentOpenCat = null;
    }

    // "All Games" dropdown (desktop)
    (function () {
        var li = document.createElement('li');
        li.className = 'site-nav-cat';

        var trigger = document.createElement('button');
        trigger.className = 'site-nav-cat-btn';
        trigger.innerHTML = '<span>\u{1F3AE}</span> All Games <span class="chevron">\u25BE</span>';

        var dropdown = document.createElement('div');
        dropdown.className = 'site-nav-dropdown wide';
        dropdown.style.cssText = 'max-height:400px;overflow-y:auto;left:0;transform:none';

        var sorted = [];
        GAME_CATALOG.forEach(function (cat) {
            cat.games.forEach(function (game) { sorted.push(game); });
        });
        sorted.sort(function (a, b) { return a.name.localeCompare(b.name); });
        sorted.forEach(function (game) {
            var a = document.createElement('a');
            a.href = basePath + game.url;
            if (currentPage === game.url) a.className = 'active';
            a.innerHTML = '<span class="game-icon">' + game.icon + '</span> ' + game.name;
            dropdown.appendChild(a);
        });

        li.appendChild(trigger);
        li.appendChild(dropdown);

        li.addEventListener('mouseenter', function () {
            clearTimeout(closeCatTimer);
            if (currentOpenCat && currentOpenCat !== li) {
                currentOpenCat.classList.remove('open');
            }
            openCatTimer = setTimeout(function () {
                li.classList.add('open');
                currentOpenCat = li;
            }, 50);
        });
        li.addEventListener('mouseleave', function () {
            clearTimeout(openCatTimer);
            closeCatTimer = setTimeout(function () {
                li.classList.remove('open');
                if (currentOpenCat === li) currentOpenCat = null;
            }, 200);
        });
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = li.classList.contains('open');
            closeAllCats();
            if (!isOpen) {
                li.classList.add('open');
                currentOpenCat = li;
            }
        });

        catList.appendChild(li);
    })();

    GAME_CATALOG.forEach(function (cat, catIdx) {
        var li = document.createElement('li');
        li.className = 'site-nav-cat';

        var trigger = document.createElement('button');
        trigger.className = 'site-nav-cat-btn';
        trigger.innerHTML = '<span>' + cat.icon + '</span> ' + cat.name + ' <span class="chevron">\u25BE</span>';

        var dropdown = document.createElement('div');
        dropdown.className = 'site-nav-dropdown' + (cat.games.length > 8 ? ' wide' : '');

        cat.games.forEach(function (game) {
            var a = document.createElement('a');
            a.href = basePath + game.url;
            if (currentPage === game.url) a.className = 'active';
            a.innerHTML = '<span class="game-icon">' + game.icon + '</span> ' + game.name;
            dropdown.appendChild(a);
        });

        li.appendChild(trigger);
        li.appendChild(dropdown);

        // Desktop hover logic
        li.addEventListener('mouseenter', function () {
            clearTimeout(closeCatTimer);
            if (currentOpenCat && currentOpenCat !== li) {
                currentOpenCat.classList.remove('open');
            }
            openCatTimer = setTimeout(function () {
                li.classList.add('open');
                currentOpenCat = li;
            }, 50);
        });

        li.addEventListener('mouseleave', function () {
            clearTimeout(openCatTimer);
            closeCatTimer = setTimeout(function () {
                li.classList.remove('open');
                if (currentOpenCat === li) currentOpenCat = null;
            }, 200);
        });

        // Click toggle (touch laptops)
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            var isOpen = li.classList.contains('open');
            closeAllCats();
            if (!isOpen) {
                li.classList.add('open');
                currentOpenCat = li;
            }
        });

        catList.appendChild(li);
    });

    inner.appendChild(catList);

    // Utilities link (desktop)
    var utilLink = document.createElement('a');
    utilLink.href = basePath + 'utilities/';
    utilLink.className = 'site-nav-home';
    utilLink.style.cssText = 'font-size:0.85em;padding:6px 12px;margin-left:2px';
    utilLink.innerHTML = '<span>\u{1F6E0}\uFE0F</span> <span>Utilities</span>';
    inner.appendChild(utilLink);

    // Tools area
    var tools = document.createElement('div');
    tools.className = 'site-nav-tools';

    // Search
    var searchWrap = document.createElement('div');
    searchWrap.className = 'site-nav-search';

    var searchBtn = document.createElement('button');
    searchBtn.className = 'site-nav-search-btn';
    searchBtn.innerHTML = '\u{1F50D}';
    searchBtn.setAttribute('aria-label', 'Search games');

    var searchDropdown = document.createElement('div');
    searchDropdown.className = 'site-nav-search-dropdown';

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    var totalUtilities = UTILITIES_CATALOG.reduce(function (sum, cat) { return sum + cat.items.length; }, 0);
    searchInput.placeholder = 'Search games & tools\u2026';
    searchInput.autocomplete = 'off';

    var searchResults = document.createElement('div');
    searchResults.className = 'site-nav-search-results';

    searchDropdown.appendChild(searchInput);
    searchDropdown.appendChild(searchResults);
    searchWrap.appendChild(searchBtn);
    searchWrap.appendChild(searchDropdown);
    tools.appendChild(searchWrap);

    // Size selector (game pages only, not utility pages)
    if (inSubfolder && !isUtilityPage) {
        var sizeWrap = document.createElement('div');
        sizeWrap.className = 'site-nav-size';

        var sizeBtn = document.createElement('button');
        sizeBtn.className = 'site-nav-size-btn';
        sizeBtn.innerHTML = '\u2699\uFE0F';
        sizeBtn.setAttribute('aria-label', 'Game size');

        var sizeDropdown = document.createElement('div');
        sizeDropdown.className = 'site-nav-size-dropdown';
        sizeDropdown.innerHTML = '<label class="nav-size-label">Game Size</label><div class="nav-size-buttons"></div>';

        var btnGroup = sizeDropdown.querySelector('.nav-size-buttons');
        SIZE_ORDER.forEach(function (key) {
            var preset = SIZE_PRESETS[key];
            var sBtn = document.createElement('button');
            sBtn.className = 'nav-size-btn' + (key === currentSize ? ' active' : '');
            sBtn.dataset.size = key;
            sBtn.textContent = preset.label;
            sBtn.addEventListener('click', function () { setViewportSize(key); });
            btnGroup.appendChild(sBtn);
        });

        sizeWrap.appendChild(sizeBtn);
        sizeWrap.appendChild(sizeDropdown);
        tools.appendChild(sizeWrap);

        // Toggle size dropdown
        sizeBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            sizeWrap.classList.toggle('open');
            searchWrap.classList.remove('open');
            closeAllCats();
        });
    }

    // Mobile hamburger button
    var mobileBtn = document.createElement('button');
    mobileBtn.className = 'site-nav-mobile-btn';
    mobileBtn.setAttribute('aria-label', 'Menu');
    mobileBtn.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
    tools.appendChild(mobileBtn);

    inner.appendChild(tools);
    nav.appendChild(inner);

    // ── Mobile Panel ──────────────────────────────────────
    var mobilePanel = document.createElement('div');
    mobilePanel.className = 'site-nav-mobile-panel';

    // Mobile search
    var mobileSearchDiv = document.createElement('div');
    mobileSearchDiv.className = 'mobile-search';
    var mobileSearchInput = document.createElement('input');
    mobileSearchInput.type = 'text';
    mobileSearchInput.placeholder = 'Search games & tools\u2026';
    mobileSearchInput.autocomplete = 'off';
    mobileSearchDiv.appendChild(mobileSearchInput);
    mobilePanel.appendChild(mobileSearchDiv);

    // Mobile no-results
    var mobileNoResults = document.createElement('div');
    mobileNoResults.className = 'mobile-no-results';
    mobileNoResults.textContent = 'No games found';

    // Mobile "All Games" section
    var mobileAllDiv = document.createElement('div');
    mobileAllDiv.className = 'mobile-cat collapsed';
    var mobileAllHeader = document.createElement('div');
    mobileAllHeader.className = 'mobile-cat-header';
    mobileAllHeader.innerHTML = '<span>\u{1F3AE}</span> All Games A\u2013Z <span class="chevron">\u25BC</span>';
    var mobileAllList = document.createElement('ul');
    mobileAllList.className = 'mobile-game-list';
    var mobileAllGames = [];
    GAME_CATALOG.forEach(function (cat) {
        cat.games.forEach(function (game) {
            mobileAllGames.push(game);
        });
    });
    mobileAllGames.sort(function (a, b) { return a.name.localeCompare(b.name); });
    mobileAllGames.forEach(function (game) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = basePath + game.url;
        if (currentPage === game.url) a.className = 'active';
        a.innerHTML = '<span class="game-icon">' + game.icon + '</span> ' + game.name;
        li.appendChild(a);
        mobileAllList.appendChild(li);
    });
    mobileAllHeader.addEventListener('click', function () {
        mobileAllDiv.classList.toggle('collapsed');
    });
    mobileAllDiv.appendChild(mobileAllHeader);
    mobileAllDiv.appendChild(mobileAllList);
    mobilePanel.appendChild(mobileAllDiv);

    // Mobile categories
    GAME_CATALOG.forEach(function (cat) {
        var catDiv = document.createElement('div');
        catDiv.className = 'mobile-cat';

        var catHeader = document.createElement('div');
        catHeader.className = 'mobile-cat-header';
        catHeader.innerHTML = '<span>' + cat.icon + '</span> ' + cat.name + ' <span class="chevron">\u25BC</span>';

        var list = document.createElement('ul');
        list.className = 'mobile-game-list';

        cat.games.forEach(function (game) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = basePath + game.url;
            if (currentPage === game.url) a.className = 'active';
            a.innerHTML = '<span class="game-icon">' + game.icon + '</span> ' + game.name;
            li.appendChild(a);
            list.appendChild(li);
        });

        catHeader.addEventListener('click', function () {
            catDiv.classList.toggle('collapsed');
        });

        catDiv.appendChild(catHeader);
        catDiv.appendChild(list);
        mobilePanel.appendChild(catDiv);
    });

    // Mobile utilities link
    var mobileUtilDiv = document.createElement('div');
    mobileUtilDiv.className = 'mobile-cat';
    var mobileUtilHeader = document.createElement('div');
    mobileUtilHeader.className = 'mobile-cat-header';
    mobileUtilHeader.innerHTML = '<span>\u{1F6E0}\uFE0F</span> Utilities <span class="chevron">\u25BC</span>';
    var mobileUtilList = document.createElement('ul');
    mobileUtilList.className = 'mobile-game-list';
    UTILITIES_CATALOG.forEach(function (cat) {
        cat.items.forEach(function (tool) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = basePath + tool.url;
            if (currentPage === tool.url) a.className = 'active';
            a.innerHTML = '<span class="game-icon">' + tool.icon + '</span> ' + tool.name;
            li.appendChild(a);
            mobileUtilList.appendChild(li);
        });
    });
    mobileUtilHeader.addEventListener('click', function () {
        mobileUtilDiv.classList.toggle('collapsed');
    });
    mobileUtilDiv.appendChild(mobileUtilHeader);
    mobileUtilDiv.appendChild(mobileUtilList);
    mobileUtilDiv.classList.add('collapsed');
    mobilePanel.appendChild(mobileUtilDiv);

    mobilePanel.appendChild(mobileNoResults);

    // Mobile size selector (game pages only, not utility pages)
    if (inSubfolder && !isUtilityPage) {
        var mobileSizeDiv = document.createElement('div');
        mobileSizeDiv.className = 'mobile-size';
        mobileSizeDiv.innerHTML = '<label class="nav-size-label">Game Size</label><div class="nav-size-buttons"></div>';
        var mobileBtnGroup = mobileSizeDiv.querySelector('.nav-size-buttons');
        SIZE_ORDER.forEach(function (key) {
            var preset = SIZE_PRESETS[key];
            var sBtn = document.createElement('button');
            sBtn.className = 'nav-size-btn' + (key === currentSize ? ' active' : '');
            sBtn.dataset.size = key;
            sBtn.textContent = preset.label;
            sBtn.addEventListener('click', function () { setViewportSize(key); });
            mobileBtnGroup.appendChild(sBtn);
        });
        mobilePanel.appendChild(mobileSizeDiv);
    }

    nav.appendChild(mobilePanel);

    // Mobile overlay
    var mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'site-nav-mobile-overlay';

    // Insert into page
    document.body.insertBefore(mobileOverlay, document.body.firstChild);
    document.body.insertBefore(nav, document.body.firstChild);

    // Push content below fixed nav
    document.body.style.paddingTop = '52px';

    // ── Search Toggle & Logic ─────────────────────────────
    searchBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var opening = !searchWrap.classList.contains('open');
        searchWrap.classList.toggle('open');
        closeAllCats();
        if (document.querySelector('.site-nav-size')) {
            document.querySelector('.site-nav-size').classList.remove('open');
        }
        if (opening) {
            searchInput.focus();
        }
    });

    function doSearch(input, resultsContainer, noResultsEl) {
        var query = input.value.trim().toLowerCase();
        resultsContainer.innerHTML = '';

        if (!query) {
            resultsContainer.innerHTML = '';
            if (noResultsEl) noResultsEl.style.display = 'none';
            return;
        }

        var anyMatch = false;
        GAME_CATALOG.forEach(function (cat) {
            var matches = cat.games.filter(function (g) {
                return g.name.toLowerCase().indexOf(query) !== -1;
            });
            if (matches.length > 0) {
                anyMatch = true;
                var catLabel = document.createElement('div');
                catLabel.className = 'search-cat';
                catLabel.textContent = cat.name;
                resultsContainer.appendChild(catLabel);

                matches.forEach(function (game) {
                    var a = document.createElement('a');
                    a.href = basePath + game.url;
                    a.innerHTML = '<span class="game-icon">' + game.icon + '</span> ' + game.name;
                    resultsContainer.appendChild(a);
                });
            }
        });

        UTILITIES_CATALOG.forEach(function (cat) {
            var matches = cat.items.filter(function (t) {
                return t.name.toLowerCase().indexOf(query) !== -1;
            });
            if (matches.length > 0) {
                anyMatch = true;
                var catLabel = document.createElement('div');
                catLabel.className = 'search-cat';
                catLabel.textContent = '\u{1F6E0}\uFE0F ' + cat.name;
                resultsContainer.appendChild(catLabel);

                matches.forEach(function (tool) {
                    var a = document.createElement('a');
                    a.href = basePath + tool.url;
                    a.innerHTML = '<span class="game-icon">' + tool.icon + '</span> ' + tool.name;
                    resultsContainer.appendChild(a);
                });
            }
        });

        if (!anyMatch) {
            if (noResultsEl) {
                noResultsEl.style.display = 'block';
            } else {
                resultsContainer.innerHTML = '<div class="site-nav-search-none">No games found</div>';
            }
        } else {
            if (noResultsEl) noResultsEl.style.display = 'none';
        }
    }

    // Desktop search
    searchInput.addEventListener('input', function () {
        doSearch(searchInput, searchResults, null);
    });

    // Mobile search
    mobileSearchInput.addEventListener('input', function () {
        var query = this.value.trim().toLowerCase();
        var anyVisible = false;
        var cats = mobilePanel.querySelectorAll('.mobile-cat');
        cats.forEach(function (catEl) {
            var items = catEl.querySelectorAll('.mobile-game-list li');
            var catVisible = false;
            items.forEach(function (item) {
                var name = item.textContent.toLowerCase();
                if (!query || name.indexOf(query) !== -1) {
                    item.style.display = '';
                    catVisible = true;
                } else {
                    item.style.display = 'none';
                }
            });
            catEl.style.display = catVisible ? '' : 'none';
            if (catVisible) anyVisible = true;
            if (query && catVisible) catEl.classList.remove('collapsed');
        });
        mobileNoResults.style.display = anyVisible ? 'none' : 'block';
    });

    // Prevent game key events from firing while typing in search
    [searchInput, mobileSearchInput].forEach(function (input) {
        ['keydown', 'keyup', 'keypress'].forEach(function (evt) {
            input.addEventListener(evt, function (e) {
                e.stopPropagation();
            });
        });
    });

    // ── Mobile Panel Toggle ───────────────────────────────
    function toggleMobileNav() {
        document.body.classList.toggle('mobile-nav-open');
    }
    function closeMobileNav() {
        document.body.classList.remove('mobile-nav-open');
    }

    mobileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleMobileNav();
    });
    mobileOverlay.addEventListener('click', closeMobileNav);

    // ── Global Close Logic ────────────────────────────────
    document.addEventListener('click', function (e) {
        // Close desktop dropdowns if clicking outside
        if (!e.target.closest('.site-nav-cat')) {
            closeAllCats();
        }
        if (!e.target.closest('.site-nav-search')) {
            searchWrap.classList.remove('open');
        }
        if (!e.target.closest('.site-nav-size')) {
            var sizeEl = document.querySelector('.site-nav-size');
            if (sizeEl) sizeEl.classList.remove('open');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeAllCats();
            searchWrap.classList.remove('open');
            var sizeEl = document.querySelector('.site-nav-size');
            if (sizeEl) sizeEl.classList.remove('open');
            closeMobileNav();
        }
    });

    // ── Update game count badge on hub page ─────────────────
    var countBadge = document.querySelector('.game-count');
    if (countBadge) {
        countBadge.textContent = totalGames + ' Games';
    }

    // ── Similar Games section on game pages ─────────────────
    if (inSubfolder && !isUtilityPage) {
        var currentGame = null;
        var currentCat = null;
        GAME_CATALOG.forEach(function (cat) {
            cat.games.forEach(function (game) {
                if (currentPage === game.url) {
                    currentGame = game;
                    currentCat = cat;
                }
            });
        });

        if (currentGame && currentCat) {
            // Get games from same category, excluding current
            var siblings = currentCat.games.filter(function (g) {
                return g.url !== currentGame.url;
            });

            // Shuffle
            for (var si = siblings.length - 1; si > 0; si--) {
                var sj = Math.floor(Math.random() * (si + 1));
                var tmp = siblings[si];
                siblings[si] = siblings[sj];
                siblings[sj] = tmp;
            }

            var picks = siblings.slice(0, 4);

            // If not enough from same category, fill from others
            if (picks.length < 3) {
                var others = [];
                GAME_CATALOG.forEach(function (cat) {
                    if (cat !== currentCat) {
                        cat.games.forEach(function (g) { others.push(g); });
                    }
                });
                for (var oi = others.length - 1; oi > 0; oi--) {
                    var oj = Math.floor(Math.random() * (oi + 1));
                    var otmp = others[oi];
                    others[oi] = others[oj];
                    others[oj] = otmp;
                }
                while (picks.length < 4 && others.length > 0) {
                    picks.push(others.shift());
                }
            }

            if (picks.length > 0) {
                var sidebar = document.createElement('aside');
                sidebar.className = 'similar-games-section';
                sidebar.innerHTML = '<h3 class="similar-games-title">Similar Games</h3>';

                picks.forEach(function (game) {
                    var card = document.createElement('a');
                    card.href = basePath + game.url;
                    card.className = 'similar-game-card';
                    card.innerHTML = '<div class="game-icon-wrap">' + game.icon + '</div>' +
                        '<span class="game-name">' + game.name + '</span>';
                    sidebar.appendChild(card);
                });

                var container = document.querySelector('.container');
                if (container && container.parentNode) {
                    var wrapper = document.createElement('div');
                    wrapper.className = 'game-page-wrapper';
                    container.parentNode.insertBefore(wrapper, container);
                    wrapper.appendChild(container);
                    wrapper.appendChild(sidebar);
                }
            }
        }
    }

    // ── Viewport Size Control ─────────────────────────────
    function applyViewportSize(sizeKey) {
        var preset = SIZE_PRESETS[sizeKey];
        if (!preset) return;

        var canvas = document.getElementById('gameCanvas');
        if (canvas) {
            var bw = canvas.width, bh = canvas.height;
            var par = canvas.parentElement;
            var ps = getComputedStyle(par);
            var mw = par.clientWidth - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
            var mh = window.innerHeight * preset.vhFactor;
            var s = Math.min(mw / bw, mh / bh, 1);
            canvas.style.transformOrigin = 'top center';
            canvas.style.transform = 'scale(' + s + ')';
            canvas.style.marginBottom = (-(bh * (1 - s))) + 'px';
        }

        var gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            var container = gameContainer.closest('.container');
            if (container) {
                container.style.maxWidth = preset.containerMax + 'px';
            }
            gameContainer.style.maxHeight = (window.innerHeight * preset.vhFactor) + 'px';
            gameContainer.style.overflow = 'hidden';
        }

        var embedFrame = document.querySelector('.embed-game-frame');
        if (embedFrame) {
            embedFrame.style.height = (window.innerHeight * preset.vhFactor) + 'px';
        }

        var wrapper = document.getElementById('game-wrapper');
        if (wrapper && !canvas && !gameContainer) {
            wrapper.style.maxHeight = (window.innerHeight * preset.vhFactor) + 'px';
            wrapper.style.overflow = 'hidden';
        }
    }

    function setViewportSize(sizeKey) {
        currentSize = sizeKey;
        localStorage.setItem('arcadeViewportSize', sizeKey);
        var allBtns = document.querySelectorAll('.nav-size-btn');
        allBtns.forEach(function (b) {
            b.classList.toggle('active', b.dataset.size === sizeKey);
        });
        applyViewportSize(sizeKey);
        window.dispatchEvent(new Event('resize'));
    }

    applyViewportSize(currentSize);
    window.addEventListener('resize', function () {
        applyViewportSize(currentSize);
    });

})();
