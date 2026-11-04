/** Keep keyboard navigation inside an open modal and restore its trigger on close.
 * @param {HTMLElement} node
 * @param {() => void} close
 */
export function modalFocus(node, close) {
 const previous = document.activeElement;
 const focusable = () => Array.from(node.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => element instanceof HTMLElement && !element.hasAttribute('disabled') && element.getClientRects().length);
 queueMicrotask(() => {
  const first = focusable()[0];
  if (first instanceof HTMLElement) first.focus();
 });
 /** @param {KeyboardEvent} event */
 const onKey = (event) => {
  if (event.key === 'Escape') {
   event.preventDefault();
   event.stopPropagation();
   close();
  }
  if (event.key !== 'Tab') return;
  const items = focusable();
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
   event.preventDefault();
   if (last instanceof HTMLElement) last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
   event.preventDefault();
   if (first instanceof HTMLElement) first.focus();
  }
 };
 node.addEventListener('keydown', onKey, true);
 return { destroy() {
  node.removeEventListener('keydown', onKey, true);
  if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
 } };
}
