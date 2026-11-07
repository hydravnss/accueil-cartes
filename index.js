/**
 * Accueil Cartes — liste des personnages en cartes
 * (image carrée à gauche, titre, extrait, tags).
 */

const MODULE_NAME = 'accueil_cartes';
const LOG = '[Accueil Cartes]';

const defaultSettings = Object.freeze({
    enabled: true,
});

const ctx = () => SillyTavern.getContext();
const save = () => ctx().saveSettingsDebounced();

let settings = null;

function loadSettings() {
    const store = ctx().extensionSettings;
    store[MODULE_NAME] = Object.assign({}, defaultSettings, store[MODULE_NAME] || {});
    settings = store[MODULE_NAME];
}

function excerpt(value) {
    return String(value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\{\{[\s\S]*?\}\}/g, ' ')
        .replace(/[_*`#]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function cardTags(item) {
    const raw = (item && (item.data?.tags || item.tags)) || [];
    if (Array.isArray(raw)) {
        return raw.map((tag) => String(tag || '').trim()).filter(Boolean);
    }
    return String(raw)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function applyBodyClass() {
    document.body.classList.toggle('ah-on', !!(settings && settings.enabled));
}

function fillDescription(descEl, item, extra) {
    if (!descEl) {
        return;
    }
    let text = excerpt(descEl.textContent);
    if (!text && item) {
        text = excerpt(
            item.data?.creator_notes ||
            item.creatorcomment ||
            item.data?.description ||
            item.description ||
            extra ||
            item.first_mes,
        );
        if (text) {
            descEl.textContent = text;
        }
    }
    descEl.classList.toggle('ah-has-desc', !!text);
    if (text) {
        descEl.style.removeProperty('display');
    }
}

function fillFallbackTags(tagHost, item) {
    if (!tagHost) {
        return;
    }
    if (!tagHost.querySelector('.tag')) {
        for (const name of cardTags(item).slice(0, 8)) {
            const tag = document.createElement('span');
            tag.className = 'tag ah-fallback-tag';
            const label = document.createElement('span');
            label.className = 'tag_name';
            label.textContent = name;
            tag.appendChild(label);
            tagHost.appendChild(tag);
        }
    }
    tagHost.classList.toggle('ah-has-tags', !!tagHost.querySelector('.tag'));
}

function upsertMeta(container, item) {
    if (!container || !item) {
        return;
    }
    const creator = excerpt(item.data?.creator || item.creator);
    const fav = item.fav === true || item.fav === 'true';
    let meta = container.querySelector(':scope > .ah-meta');
    if (!creator && !fav) {
        if (meta) {
            meta.remove();
        }
        return;
    }
    if (!meta) {
        meta = document.createElement('div');
        meta.className = 'ah-meta';
        container.appendChild(meta);
    }
    meta.replaceChildren();
    if (fav) {
        const heart = document.createElement('span');
        heart.className = 'ah-fav';
        heart.title = 'Favori';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-heart';
        heart.appendChild(icon);
        meta.appendChild(heart);
    }
    if (creator) {
        const holder = document.createElement('span');
        holder.className = 'ah-creator';
        const dot = document.createElement('span');
        dot.className = 'ah-creator-dot';
        dot.textContent = creator.charAt(0);
        const handle = document.createElement('span');
        handle.textContent = `@${creator}`;
        holder.appendChild(dot);
        holder.appendChild(handle);
        meta.appendChild(holder);
    }
}

function enhanceCharacter(el) {
    const id = el.getAttribute('data-chid');
    if (id === null || id === '') {
        return;
    }
    const item = ctx().characters?.[Number(id)];
    fillDescription(el.querySelector('.ch_description'), item);
    fillFallbackTags(el.querySelector('.tags_inline'), item);
    upsertMeta(el.querySelector('.character_select_container'), item);
}

function enhanceGroup(el) {
    const desc = el.querySelector('.ch_description, .group_select_block_list');
    if (desc && excerpt(desc.textContent)) {
        desc.classList.add('ah-has-desc');
        desc.style.removeProperty('display');
    }
    const tagHost = el.querySelector('.tags_inline');
    if (tagHost) {
        tagHost.classList.toggle('ah-has-tags', !!tagHost.querySelector('.tag'));
    }
}

function enhanceList() {
    applyBodyClass();
    if (!settings || !settings.enabled) {
        return;
    }
    document.querySelectorAll('#rm_print_characters_block .character_select').forEach(enhanceCharacter);
    document.querySelectorAll('#rm_print_characters_block .group_select').forEach(enhanceGroup);
}

const SETTINGS_HTML = `
<div id="ah_settings" class="extension_container">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>Accueil Cartes</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="af-hint">Affiche la liste des personnages comme un fil de cartes : image à gauche, titre, extrait et tags à droite.</div>
      <div class="af-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;">
        <label for="ah_enabled">Activer</label>
        <input type="checkbox" id="ah_enabled">
      </div>
    </div>
  </div>
</div>`;

function bindSettingsUi() {
    const box = document.getElementById('ah_enabled');
    box.checked = settings.enabled;
    box.addEventListener('input', () => {
        settings.enabled = box.checked;
        save();
        applyBodyClass();
        enhanceList();
    });
}

jQuery(async () => {
    loadSettings();
    window.jQuery('#extensions_settings2').append(SETTINGS_HTML);
    bindSettingsUi();
    enhanceList();

    try {
        const { eventSource, event_types } = ctx();
        eventSource.on(event_types.APP_READY, enhanceList);
        eventSource.on(event_types.CHARACTER_PAGE_LOADED, enhanceList);
        eventSource.on(event_types.SETTINGS_LOADED_AFTER, () => {
            loadSettings();
            enhanceList();
        });
    } catch (err) {
        console.debug(LOG, 'évènements indisponibles', err);
    }

    const list = document.getElementById('rm_print_characters_block');
    if (list) {
        new MutationObserver(() => enhanceList()).observe(list, { childList: true });
    }

    console.log(LOG, 'chargé');
});
