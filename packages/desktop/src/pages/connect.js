'use strict';
const input = document.getElementById('url');
const error = document.getElementById('error');
const current = new URLSearchParams(window.location.search).get('current');
if (current) input.value = current;
input.focus();
document.getElementById('form').addEventListener('submit', async event => {
  event.preventDefault();
  error.textContent = '';
  const result = await window.dproDesktop.connect(input.value);
  if (!result.ok) error.textContent = result.error || 'Could not connect.';
});
document.getElementById('local').addEventListener('click', () => window.dproDesktop.useLocal());
