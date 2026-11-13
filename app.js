(() => {
    'use strict';

    const STORAGE_KEY = 'portafolio.carpetas.v1';
    const MAX_COVER_WIDTH = 800;

    // Tarjetas predeterminadas: siempre aparecen, en cualquier navegador.
    // Para cambiar una descripción o poner portada, edita aquí
    // (por ejemplo: cover: 'img/equalyz.webp' con la imagen dentro de la carpeta img/).
    const DEFAULT_PROJECTS = [
        { id: 'rueda-libre', name: 'Rueda libre', url: 'https://carlosmiguel-riwi.github.io/rueda-libre/', description: '', cover: '' },
        { id: 'equalyz', name: 'Equalyz', url: 'https://carlosmiguel-riwi.github.io/Equalyz/', description: 'Comparador del costo real de productos en Colombia.', cover: '' },
        { id: 'conferencia', name: 'Conferencia', url: 'https://carlosmiguel-riwi.github.io/conferencia/', description: 'Página de una sala de conferencias.', cover: '' },
        { id: 'portafolio', name: 'Portafolio', url: 'https://carlosmiguel-riwi.github.io/portafolio/', description: 'Mi portafolio personal.', cover: '' },
        { id: 'cv', name: 'CV', url: 'https://carlosmiguel-riwi.github.io/cv/', description: 'Mi hoja de vida en línea.', cover: '' },
        { id: 'libreria-bootstrap', name: 'Librería Bootstrap', url: 'https://c8-quasar.github.io/libreria_bootstrap/', description: '', cover: '' },
        { id: 'botones', name: 'Botones', url: 'https://carlosmiguel-riwi.github.io/Botones/', description: 'Librería de botones con HTML y CSS.', cover: '' },
        { id: 'kfc', name: 'KFC', url: 'https://carlosmiguel-riwi.github.io/KFC/', description: '', cover: '' },
        { id: 'formulario', name: 'Formulario', url: 'https://carlosmiguel-riwi.github.io/Formulario/', description: '', cover: '' },
        { id: 'brainstorm', name: 'Brainstorm', url: 'https://carlosmiguel-riwi.github.io/brainstorm/', description: '', cover: '' }
    ];

    const grid = document.getElementById('grid');
    const countEl = document.getElementById('count');
    const statusEl = document.getElementById('status');
    const form = document.getElementById('folder-form');
    const modalEl = document.getElementById('folderModal');
    const modal = new bootstrap.Modal(modalEl);

    const fName = document.getElementById('f-name');
    const fUrl = document.getElementById('f-url');
    const fDesc = document.getElementById('f-desc');
    const fCover = document.getElementById('f-cover');
    const fCoverUrl = document.getElementById('f-cover-url');
    const previewBox = document.getElementById('cover-preview');
    const previewImg = document.getElementById('cover-img');

    let published = []; // vienen de data/projects.json (las ve todo el mundo)
    let local = [];     // guardadas en este navegador
    let editingId = null;
    let pendingCover = ''; // portada lista para guardar (data URL o ruta)

    /* ---------- utilidades ---------- */
    const newId = () =>
        (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'p' + Date.now() + Math.random().toString(16).slice(2);

    const isHttp = (value) => {
        try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:'; }
        catch { return false; }
    };

    const say = (msg, isError = false) => {
        statusEl.textContent = msg;
        statusEl.classList.toggle('error', isError);
        if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 5000);
    };

    const cleanItem = (p) => ({
        id: String(p.id || newId()),
        name: String(p.name || '').slice(0, 60),
        url: p.url && isHttp(p.url) ? String(p.url) : '',
        description: String(p.description || '').slice(0, 120),
        cover: String(p.cover || '')
    });

    const safeCover = (c) => (/^data:image\//.test(c) || isHttp(c) || /^[\w./-]+$/.test(c)) ? c : '';

    /* ---------- almacenamiento ---------- */
    function loadLocal() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list.map(cleanItem) : [];
        } catch { return []; }
    }

    function saveLocal() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
            return true;
        } catch {
            say('No se pudo guardar: el navegador se quedó sin espacio. Usa portadas más pequeñas o exporta una copia.', true);
            return false;
        }
    }

    async function loadPublished() {
        const defaults = DEFAULT_PROJECTS.map(cleanItem);
        const defaultIds = new Set(defaults.map((p) => p.id));
        let extra = [];
        try {
            // data/projects.json es opcional: sirve para añadir más tarjetas fijas
            const res = await fetch('data/projects.json', { cache: 'no-cache' });
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) extra = list.map(cleanItem).filter((p) => p.name && !defaultIds.has(p.id));
            }
        } catch { /* sin servidor (file://) no se puede leer: no pasa nada */ }
        return [...defaults, ...extra];
    }

    /* ---------- render ---------- */
    function folderCard(p, isLocal) {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-lg-4';

        const folder = document.createElement('article');
        folder.className = 'folder';

        const tab = document.createElement('div');
        tab.className = 'folder-tab';
        tab.textContent = p.name;

        const body = document.createElement('div');
        body.className = 'folder-body';

        const paper = document.createElement('div');
        paper.className = 'folder-paper';
        const cover = safeCover(p.cover);
        if (cover) {
            paper.style.backgroundImage = `url("${cover.replace(/"/g, '%22')}")`;
            paper.setAttribute('role', 'img');
            paper.setAttribute('aria-label', 'Portada de ' + p.name);
        } else {
            paper.textContent = (p.name[0] || '?').toUpperCase();
            paper.setAttribute('aria-hidden', 'true');
        }

        const desc = document.createElement('p');
        desc.className = 'folder-desc';
        desc.textContent = p.description;

        const actions = document.createElement('div');
        actions.className = 'folder-actions';

        if (p.url) {
            const a = document.createElement('a');
            a.className = 'btn btn-folder btn-sm';
            a.href = p.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = 'Ver proyecto';
            actions.append(a);
        }

        if (isLocal) {
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'btn-ghost';
            edit.textContent = 'Editar';
            edit.addEventListener('click', () => openForm(p));

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn-ghost danger';
            del.textContent = 'Borrar';
            del.addEventListener('click', () => removeFolder(p));

            actions.append(edit, del);
        }

        body.append(paper, desc, actions);
        folder.append(tab, body);
        col.append(folder);
        return col;
    }

    function render() {
        grid.replaceChildren();
        published.forEach((p) => grid.append(folderCard(p, false)));
        local.forEach((p) => grid.append(folderCard(p, true)));

        const addCol = document.createElement('div');
        addCol.className = 'col-12 col-md-6 col-lg-4';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'folder-add';
        addBtn.innerHTML = '<span aria-hidden="true">+</span>Nueva carpeta';
        addBtn.addEventListener('click', () => openForm());
        addCol.append(addBtn);
        grid.append(addCol);

        const total = published.length + local.length;
        countEl.textContent = total === 0
            ? 'Todavía no hay carpetas. Crea la primera.'
            : total + (total === 1 ? ' proyecto guardado' : ' proyectos guardados');
    }

    /* ---------- formulario ---------- */
    function resetPreview() {
        pendingCover = '';
        previewBox.hidden = true;
        previewImg.removeAttribute('src');
    }

    function showPreview(src) {
        if (!src) { resetPreview(); return; }
        pendingCover = src;
        previewImg.src = src;
        previewBox.hidden = false;
    }

    function openForm(item) {
        form.classList.remove('was-validated');
        form.reset();
        resetPreview();
        editingId = item ? item.id : null;
        document.getElementById('folderModalTitle').textContent = item ? 'Editar carpeta' : 'Nueva carpeta';
        if (item) {
            fName.value = item.name;
            fUrl.value = item.url;
            fDesc.value = item.description;
            if (item.cover) showPreview(item.cover);
        }
        modal.show();
    }

    // Reduce la imagen para que quepan muchas portadas en el almacenamiento
    function resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Archivo de imagen no válido'));
                img.onload = () => {
                    const scale = Math.min(1, MAX_COVER_WIDTH / img.width);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    fCover.addEventListener('change', async () => {
        const file = fCover.files[0];
        if (!file) return;
        try {
            showPreview(await resizeImage(file));
            fCoverUrl.value = '';
        } catch (err) {
            say(err.message, true);
            fCover.value = '';
        }
    });

    fCoverUrl.addEventListener('input', () => {
        const v = fCoverUrl.value.trim();
        if (isHttp(v)) { showPreview(v); fCover.value = ''; }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = fName.value.trim();
        const url = fUrl.value.trim();
        const coverUrl = fCoverUrl.value.trim();

        fName.setCustomValidity(name ? '' : 'x');
        fUrl.setCustomValidity(!url || isHttp(url) ? '' : 'x');
        fCoverUrl.setCustomValidity(!coverUrl || isHttp(coverUrl) ? '' : 'x');
        form.classList.add('was-validated');
        if (!form.checkValidity()) return;

        const data = {
            id: editingId || newId(),
            name,
            url,
            description: fDesc.value.trim(),
            cover: pendingCover || (isHttp(coverUrl) ? coverUrl : '')
        };

        const previous = local.slice();
        const idx = local.findIndex((p) => p.id === data.id);
        if (idx >= 0) local[idx] = data; else local.push(data);

        if (!saveLocal()) { local = previous; return; }
        modal.hide();
        render();
        say(idx >= 0 ? 'Carpeta actualizada.' : 'Carpeta guardada.');
    });

    function removeFolder(p) {
        if (!confirm('¿Borrar la carpeta "' + p.name + '"? Esta acción no se puede deshacer.')) return;
        local = local.filter((x) => x.id !== p.id);
        saveLocal();
        render();
        say('Carpeta borrada.');
    }

    /* ---------- exportar / importar ---------- */
    document.getElementById('btn-new').addEventListener('click', () => openForm());

    document.getElementById('btn-export').addEventListener('click', () => {
        const all = [...published, ...local];
        const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'projects.json';
        a.click();
        URL.revokeObjectURL(a.href);
        say('Copia exportada. Para que todos la vean, reemplaza data/projects.json y haz commit.');
    });

    const importInput = document.getElementById('import-file');
    document.getElementById('btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async () => {
        const file = importInput.files[0];
        if (!file) return;
        try {
            const list = JSON.parse(await file.text());
            if (!Array.isArray(list)) throw new Error();
            const known = new Set([...published, ...local].map((p) => p.id));
            let added = 0;
            list.map(cleanItem).forEach((p) => {
                if (p.name && !known.has(p.id)) { local.push(p); known.add(p.id); added++; }
            });
            if (saveLocal()) { render(); say(added + (added === 1 ? ' carpeta importada.' : ' carpetas importadas.')); }
        } catch {
            say('El archivo no es una copia válida.', true);
        }
        importInput.value = '';
    });

    /* ---------- inicio ---------- */
    (async () => {
        published = await loadPublished();
        const publishedIds = new Set(published.map((p) => p.id));
        local = loadLocal().filter((p) => !publishedIds.has(p.id));
        render();
    })();
})();