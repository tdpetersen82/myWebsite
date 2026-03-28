/* share.js — Social share bar for Arcade Game Hub game pages */
(function () {
  'use strict';

  var title = document.title.split(' — ')[0].split(' | ')[0];
  var url = window.location.href;
  var text = 'I\'m playing ' + title + ' for free on Arcade Game Hub!';

  var bar = document.createElement('div');
  bar.className = 'share-bar';
  bar.innerHTML =
    '<span class="share-label">Share:</span>' +
    '<button class="share-btn share-twitter" title="Share on X / Twitter" aria-label="Share on X / Twitter">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' +
    '</button>' +
    '<button class="share-btn share-facebook" title="Share on Facebook" aria-label="Share on Facebook">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' +
    '</button>' +
    '<button class="share-btn share-copy" title="Copy link" aria-label="Copy link">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
    '</button>';

  /* Inject styles */
  var style = document.createElement('style');
  style.textContent =
    '.share-bar{display:flex;align-items:center;gap:8px;margin:10px auto;justify-content:center;flex-wrap:wrap}' +
    '.share-label{font-size:13px;color:#aaa;font-weight:600}' +
    '.share-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;transition:transform .15s,opacity .15s;opacity:.7;color:#fff}' +
    '.share-btn:hover{transform:scale(1.15);opacity:1}' +
    '.share-twitter{background:#000}' +
    '.share-facebook{background:#1877f2}' +
    '.share-copy{background:#555}' +
    '.share-copy.copied{background:#22c55e}';
  document.head.appendChild(style);

  /* Insert after the first h1 in .container, or fall back to start of body */
  var container = document.querySelector('.container');
  var h1 = container && container.querySelector('h1');
  if (h1 && h1.nextSibling) {
    h1.parentNode.insertBefore(bar, h1.nextSibling);
  } else {
    (container || document.body).appendChild(bar);
  }

  /* Event handlers */
  bar.querySelector('.share-twitter').addEventListener('click', function () {
    window.open(
      'https://x.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
      '_blank', 'width=550,height=420'
    );
  });

  bar.querySelector('.share-facebook').addEventListener('click', function () {
    window.open(
      'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
      '_blank', 'width=550,height=420'
    );
  });

  bar.querySelector('.share-copy').addEventListener('click', function () {
    var btn = this;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { showCopied(btn); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopied(btn);
    }
  });

  function showCopied(btn) {
    btn.classList.add('copied');
    btn.title = 'Copied!';
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.title = 'Copy link';
    }, 2000);
  }
})();
