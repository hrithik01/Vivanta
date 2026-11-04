<script>
 import { createEventDispatcher } from 'svelte';
 import Icon from './Icon.svelte';
 import { modalFocus } from '$lib/modal-focus.js';
 export let html = '';
 const dispatch = createEventDispatcher();
 const close = () => dispatch('close');
</script>

<div class="invoice-preview-backdrop" role="presentation" on:click={(event) => event.target === event.currentTarget && close()}>
 <dialog open aria-modal="true" aria-labelledby="invoice-preview-title" class="invoice-preview-modal" use:modalFocus={close}>
  <header><div><h2 id="invoice-preview-title">Invoice preview</h2><p class="muted">Review the bill before printing or saving as PDF.</p></div><div class="preview-actions"><button on:click={() => dispatch('print')}><Icon name="bill" size={16} />Print / Save PDF</button><button class="ghost" aria-label="Close invoice preview" on:click={close}><Icon name="close" size={18} /></button></div></header>
  <iframe title="Tax invoice preview" srcdoc={html} sandbox=""></iframe>
 </dialog>
</div>

<style>
 .invoice-preview-backdrop { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; padding: 20px; background: #071426aa; backdrop-filter: blur(5px); }
 .invoice-preview-modal { position: static; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: 12px; width: min(980px, 100%); height: min(94dvh, 1100px); max-height: 94dvh; background: var(--panel-bg); color: var(--text); display: flex; flex-direction: column; overflow: hidden; }
 header { padding: 17px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
 header p { margin: 4px 0 0; font-size: 11px; }
 .preview-actions { display: flex; align-items: center; gap: 8px; }
 iframe { border: 0; width: 100%; flex: 1; min-height: 0; background: #edf1f5; }
 @media(max-width: 560px) { .invoice-preview-backdrop { padding: 8px; } header { padding: 13px; } }
</style>
