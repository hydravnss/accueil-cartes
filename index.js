/**
 * Accueil Cartes — écran d'accueil en fil de cartes
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

function characterByAvatar(avatar) {
    if (!avatar) {
        return null;
    }
    return (ctx().characters || []).find((item) => item && item.avatar === avatar) || null;
}

function thumbnailFor(item) {
    try {
        if (item?.avatar && item.avatar !== 'none' && typeof ctx().getThumbnailUrl === 'function') {
            return ctx().getThumbnailUrl('avatar', item.avatar);
        }
    } catch (err) {
        console.debug(LOG, 'miniature', err);
    }
    return 'img/ai4.png';
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
    } else if (!text && extra) {
        text = excerpt(extra);
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
    document.querySelectorAll('#rm_print_characters_block .character_select').forEach(enhanceCharacter);
    document.querySelectorAll('#rm_print_characters_block .group_select').forEach(enhanceGroup);
}

function enhanceWelcomeItem(el) {
    const avatar = el.getAttribute('data-avatar');
    const item = characterByAvatar(avatar);
    const info = el.querySelector('.recentChatInfo') || el;

    let desc = info.querySelector(':scope > .ah-excerpt');
    if (!desc) {
        desc = document.createElement('div');
        desc.className = 'ch_description ah-excerpt';
        const nameBlock = info.querySelector('.chatNameContainer');
        if (nameBlock) {
            nameBlock.after(desc);
        } else {
            info.appendChild(desc);
        }
    }
    const fallbackMes = excerpt(el.querySelector('.chatMessage')?.textContent);
    fillDescription(desc, item, fallbackMes);

    let tags = info.querySelector(':scope > .tags_inline');
    if (!tags) {
        tags = document.createElement('div');
        tags.className = 'tags tags_inline';
        desc.after(tags);
    }
    fillFallbackTags(tags, item);
    if (item) {
        upsertMeta(info, item);
    }
}

function createHomeCard(item, id) {
    const el = document.createElement('div');
    el.className = 'recentChat ah-home-card';
    el.dataset.chid = String(id);
    if (item.avatar) {
        el.dataset.avatar = item.avatar;
    }

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const img = document.createElement('img');
    img.src = thumbnailFor(item);
    img.alt = item.name || '';
    avatar.appendChild(img);

    const info = document.createElement('div');
    info.className = 'recentChatInfo';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'chatNameContainer';
    const chatName = document.createElement('div');
    chatName.className = 'chatName';
    const strong = document.createElement('strong');
    strong.className = 'characterName';
    strong.textContent = item.name || '';
    chatName.appendChild(strong);
    nameWrap.appendChild(chatName);
    info.appendChild(nameWrap);

    const desc = document.createElement('div');
    desc.className = 'ch_description ah-excerpt';
    info.appendChild(desc);

    const tags = document.createElement('div');
    tags.className = 'tags tags_inline';
    info.appendChild(tags);

    el.appendChild(avatar);
    el.appendChild(info);

    fillDescription(desc, item);
    fillFallbackTags(tags, item);
    upsertMeta(info, item);

    el.addEventListener('click', async () => {
        try {
            await ctx().selectCharacterById(id);
        } catch (err) {
            console.debug(LOG, 'ouverture personnage', err);
        }
    });

    return el;
}

function injectHomeCatalog(panel) {
    const list = panel.querySelector('.recentChatList');
    if (!list) {
        return;
    }
    const shown = new Set(
        [...list.querySelectorAll('.recentChat[data-avatar]')]
            .map((el) => el.getAttribute('data-avatar'))
            .filter(Boolean),
    );
    const characters = ctx().characters || [];
    characters.forEach((item, id) => {
        if (!item || !item.avatar || shown.has(item.avatar)) {
            return;
        }
        list.appendChild(createHomeCard(item, id));
        shown.add(item.avatar);
    });
}

function enhanceWelcome() {
    const panel = document.querySelector('#chat > .welcomePanel');
    if (!panel) {
        return;
    }
    if (!settings || !settings.enabled) {
        panel.querySelectorAll('.ah-home-card').forEach((el) => el.remove());
        return;
    }
    panel.classList.remove('recentHidden');
    panel.querySelectorAll('.recentChat.hidden').forEach((el) => el.classList.remove('hidden'));
    panel.querySelectorAll('.recentChat:not(.ah-home-card)').forEach(enhanceWelcomeItem);
    injectHomeCatalog(panel);
}

function applyAll() {
    applyBodyClass();
    if (!settings || !settings.enabled) {
        document.querySelectorAll('.welcomePanel .ah-home-card').forEach((el) => el.remove());
        return;
    }
    enhanceList();
    enhanceWelcome();
}

const SETTINGS_HTML = `
<div id="ah_settings" class="extension_container">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header">
      <b>Accueil Cartes</b>
      <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
    </div>
    <div class="inline-drawer-content">
      <div class="af-hint">Transforme l’écran d’accueil en fil de cartes : image à gauche, titre, extrait et tags à droite.</div>
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
        applyAll();
    });
}

jQuery(async () => {
    loadSettings();
    window.jQuery('#extensions_settings2').append(SETTINGS_HTML);
    bindSettingsUi();
    applyAll();

    try {
        const { eventSource, event_types } = ctx();
        eventSource.on(event_types.APP_READY, applyAll);
        eventSource.on(event_types.CHAT_CHANGED, applyAll);
        eventSource.on(event_types.CHARACTER_PAGE_LOADED, applyAll);
        eventSource.on(event_types.SETTINGS_LOADED_AFTER, () => {
            loadSettings();
            applyAll();
        });
    } catch (err) {
        console.debug(LOG, 'évènements indisponibles', err);
    }

    const list = document.getElementById('rm_print_characters_block');
    if (list) {
        new MutationObserver(() => enhanceList()).observe(list, { childList: true });
    }

    const chat = document.getElementById('chat');
    if (chat) {
        new MutationObserver(() => enhanceWelcome()).observe(chat, { childList: true });
    }

    console.log(LOG, 'chargé');
});
