const API = window.API_BASE_URL;

// ============================================================
// ELEMENTOS
// ============================================================

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

const navButtons = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

// ============================================================
// CSRF
// ============================================================

function csrf() {
    const match = document.cookie.match(
        /(?:^|;\s*)sara_csrf=([^;]+)/
    );

    return match
        ? decodeURIComponent(match[1])
        : "";
}

// ============================================================
// API
// ============================================================

async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();

    const headers = {
        ...(options.headers || {})
    };

    /*
     * IMPORTANTE:
     * Quando enviamos FormData para upload de imagem,
     * NÃO podemos colocar Content-Type: application/json.
     *
     * O navegador precisa criar automaticamente:
     * multipart/form-data; boundary=...
     */
    const isFormData = options.body instanceof FormData;

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (["POST", "PUT", "DELETE"].includes(method)) {
        const token = csrf();

        if (token) {
            headers["X-CSRF-Token"] = token;
        }
    }

    const response = await fetch(`${API}${path}`, {
        ...options,
        method,
        headers,
        credentials: "include"
    });

    let data = null;

    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data?.detail
                ? data.detail
                : "Ocorreu um erro.";

        throw new Error(message);
    }

    return data;
}

// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    try {
        await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: emailInput.value.trim(),
                password: passwordInput.value
            })
        });

        await loadMe();

    } catch (error) {
        loginError.textContent =
            error.message ||
            "E-mail ou senha inválidos.";
    }
});

// ============================================================
// USUÁRIO
// ============================================================

let currentUser = null;

async function loadMe() {
    try {
        currentUser = await api("/api/auth/me");

        showApp();

    } catch {
        showLogin();
    }
}

// ============================================================
// MOSTRAR LOGIN
// ============================================================

function showLogin() {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
}

// ============================================================
// MOSTRAR APP
// ============================================================

function showApp() {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");

    userInfo.innerHTML = `
        <strong>${escapeHtml(currentUser.email)}</strong>
        <br>
        Perfil: ${escapeHtml(currentUser.role)}
    `;

    // Somente ADMIN vê as fotos do site
    document
        .querySelectorAll(".admin-only")
        .forEach((element) => {
            element.classList.toggle(
                "hidden",
                currentUser.role !== "admin"
            );
        });

    // Somente usuário de oração vê oração
    document
        .querySelectorAll(".prayer-only")
        .forEach((element) => {
            element.classList.toggle(
                "hidden",
                currentUser.role !== "prayer"
            );
        });

    if (currentUser.role === "admin") {
        showPage("eventsPage");
    } else {
        showPage("prayerPage");
    }
}

// ============================================================
// NAVEGAÇÃO
// ============================================================

navButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;

        showPage(page);
    });
});

function showPage(pageId) {
    pages.forEach((page) => {
        page.classList.toggle(
            "hidden",
            page.id !== pageId
        );
    });

    navButtons.forEach((button) => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    if (pageId === "eventsPage") {
        loadEvents();
    }

    if (pageId === "prayerPage") {
        loadPrayers();
    }

    if (pageId === "siteImagesPage") {
        loadSiteImages();
    }
}

// ============================================================
// LOGOUT
// ============================================================

logoutBtn.addEventListener("click", async () => {
    try {
        await api("/api/auth/logout", {
            method: "POST",
            body: JSON.stringify({})
        });
    } catch {
        // Sessão já expirada
    }

    showLogin();
});

// ============================================================
// EVENTOS
// ============================================================

const newEventBtn =
    document.getElementById("newEventBtn");

const eventFormWrap =
    document.getElementById("eventFormWrap");

const eventForm =
    document.getElementById("eventForm");

const cancelEvent =
    document.getElementById("cancelEvent");

const eventsList =
    document.getElementById("eventsList");

const eventFormTitle =
    document.getElementById("eventFormTitle");

const eventId =
    document.getElementById("eventId");

const eventTitle =
    document.getElementById("eventTitle");

const eventDate =
    document.getElementById("eventDate");

const eventTime =
    document.getElementById("eventTime");

const eventFeatured =
    document.getElementById("eventFeatured");

const eventDescription =
    document.getElementById("eventDescription");

const eventActive =
    document.getElementById("eventActive");

newEventBtn.addEventListener("click", () => {
    openNewEventForm();
});

cancelEvent.addEventListener("click", () => {
    closeEventForm();
});

function openNewEventForm() {
    eventForm.reset();

    eventId.value = "";

    eventActive.checked = true;

    eventFormTitle.textContent =
        "Novo evento";

    eventFormWrap.classList.remove("hidden");
}

function closeEventForm() {
    eventForm.reset();

    eventId.value = "";

    eventFormWrap.classList.add("hidden");
}

async function loadEvents() {
    try {
        const events =
            await api("/api/admin/events");

        renderEvents(events);

    } catch (error) {
        eventsList.innerHTML = `
            <div class="empty">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}

function renderEvents(events) {
    if (!events.length) {
        eventsList.innerHTML = `
            <div class="empty">
                Nenhum evento cadastrado.
            </div>
        `;

        return;
    }

    eventsList.innerHTML =
        events.map((event) => {
            return `
                <article class="card">

                    <div>

                        <span class="tag">
                            ${event.active
                                ? "PUBLICADO"
                                : "OCULTO"}
                        </span>

                        <h3>
                            ${escapeHtml(event.title)}
                        </h3>

                        <p>
                            ${escapeHtml(event.description)}
                        </p>

                        <small>
                            ${escapeHtml(event.date)}
                            •
                            ${escapeHtml(event.time)}
                        </small>

                    </div>

                    <div class="actions">

                        <button
                            type="button"
                            onclick="editEvent(${event.id})"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="danger"
                            onclick="deleteEvent(${event.id})"
                        >
                            Excluir
                        </button>

                    </div>

                </article>
            `;
        }).join("");
}

eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = eventId.value;

    const payload = {
        title: eventTitle.value.trim(),
        description: eventDescription.value.trim(),
        date: eventDate.value,
        time: eventTime.value,
        featured: eventFeatured.checked,
        active: eventActive.checked
    };

    try {
        if (id) {
            await api(`/api/admin/events/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await api("/api/admin/events", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        closeEventForm();

        await loadEvents();

    } catch (error) {
        alert(error.message);
    }
});

// ============================================================
// EDITAR EVENTO
// ============================================================

async function editEvent(id) {
    try {
        const events =
            await api("/api/admin/events");

        const event =
            events.find(
                (item) => item.id === id
            );

        if (!event) {
            return;
        }

        eventId.value = event.id;
        eventTitle.value = event.title;
        eventDate.value = event.date;
        eventTime.value = event.time;
        eventFeatured.checked = event.featured;
        eventDescription.value = event.description;
        eventActive.checked = event.active;

        eventFormTitle.textContent =
            "Editar evento";

        eventFormWrap.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        alert(error.message);
    }
}

window.editEvent = editEvent;

// ============================================================
// EXCLUIR EVENTO
// ============================================================

async function deleteEvent(id) {
    if (
        !confirm(
            "Tem certeza que deseja excluir este evento?"
        )
    ) {
        return;
    }

    try {
        await api(`/api/admin/events/${id}`, {
            method: "DELETE"
        });

        await loadEvents();

    } catch (error) {
        alert(error.message);
    }
}

window.deleteEvent = deleteEvent;

// ============================================================
// FOTOS DO SITE
// ============================================================

const siteImages = {
    sobre_nos: {
        file: document.getElementById(
            "sobreNosFile"
        ),

        preview: document.getElementById(
            "sobreNosPreview"
        ),

        placeholder: document.getElementById(
            "sobreNosPlaceholder"
        ),

        button: document.getElementById(
            "saveSobreNos"
        ),

        status: document.getElementById(
            "sobreNosStatus"
        )
    },

    revisao_vidas: {
        file: document.getElementById(
            "revisaoVidasFile"
        ),

        preview: document.getElementById(
            "revisaoVidasPreview"
        ),

        placeholder: document.getElementById(
            "revisaoVidasPlaceholder"
        ),

        button: document.getElementById(
            "saveRevisaoVidas"
        ),

        status: document.getElementById(
            "revisaoVidasStatus"
        )
    }
};

// ============================================================
// VERIFICAR ELEMENTOS DAS FOTOS
// ============================================================

function siteImagesElementsExist() {
    return (
        siteImages.sobre_nos.file &&
        siteImages.sobre_nos.preview &&
        siteImages.sobre_nos.placeholder &&
        siteImages.sobre_nos.button &&
        siteImages.sobre_nos.status &&
        siteImages.revisao_vidas.file &&
        siteImages.revisao_vidas.preview &&
        siteImages.revisao_vidas.placeholder &&
        siteImages.revisao_vidas.button &&
        siteImages.revisao_vidas.status
    );
}

// ============================================================
// CARREGAR FOTOS EXISTENTES
// ============================================================

async function loadSiteImages() {
    if (!siteImagesElementsExist()) {
        console.error(
            "Os elementos das fotos não foram encontrados no HTML."
        );

        return;
    }

    try {
        const data =
            await api("/api/admin/site-images");

        console.log(
            "Fotos recebidas do servidor:",
            data
        );

        Object.keys(siteImages).forEach((key) => {
            updateImagePreview(
                key,
                data[key]
            );
        });

    } catch (error) {
        console.error(
            "Erro ao carregar fotos:",
            error
        );

        Object.values(siteImages).forEach((item) => {
            if (item.status) {
                item.status.textContent =
                    error.message ||
                    "Não foi possível carregar as fotos.";

                item.status.className =
                    "image-status error";
            }
        });
    }
}

// ============================================================
// ATUALIZAR PREVIEW
// ============================================================

function updateImagePreview(key, data) {
    const item = siteImages[key];

    if (!item) {
        return;
    }

    if (!item.preview || !item.placeholder) {
        return;
    }

    if (data && data.exists && data.url) {

        const imageUrl =
            `${API}${data.url}?v=${Date.now()}`;

        item.preview.src = imageUrl;

        item.preview.classList.remove(
            "hidden"
        );

        item.placeholder.classList.add(
            "hidden"
        );

    } else {

        item.preview.removeAttribute("src");

        item.preview.classList.add(
            "hidden"
        );

        item.placeholder.classList.remove(
            "hidden"
        );
    }
}

// ============================================================
// UPLOAD DA FOTO
// ============================================================

async function uploadSiteImage(key) {
    const item = siteImages[key];

    if (!item) {
        console.error(
            "Imagem não encontrada:",
            key
        );

        return;
    }

    if (!item.file) {
        item.status.textContent =
            "Campo de imagem não encontrado no HTML.";

        item.status.className =
            "image-status error";

        return;
    }

    if (!item.file.files.length) {
        item.status.textContent =
            "Selecione uma imagem primeiro.";

        item.status.className =
            "image-status error";

        return;
    }

    const file =
        item.file.files[0];

    // ========================================================
    // VALIDAÇÃO DO TIPO
    // ========================================================

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        item.status.textContent =
            "Use JPG, PNG ou WEBP.";

        item.status.className =
            "image-status error";

        return;
    }

    // ========================================================
    // LIMITE DE TAMANHO
    // ========================================================

    if (file.size > 8 * 1024 * 1024) {
        item.status.textContent =
            "A imagem deve ter no máximo 8 MB.";

        item.status.className =
            "image-status error";

        return;
    }

    // ========================================================
    // FORMDATA
    // ========================================================

    const formData = new FormData();

    formData.append(
        "file",
        file,
        file.name
    );

    // ========================================================
    // INTERFACE
    // ========================================================

    item.button.disabled = true;

    item.button.textContent =
        "Enviando...";

    item.status.textContent =
        "Enviando imagem para o servidor...";

    item.status.className =
        "image-status";

    try {

        console.log(
            "Enviando imagem:",
            key,
            file.name,
            file.type,
            file.size
        );

        const result =
            await api(
                `/api/admin/site-images/${key}`,
                {
                    method: "POST",
                    body: formData
                }
            );

        console.log(
            "Resposta do servidor:",
            result
        );

        // ====================================================
        // SUCESSO
        // ====================================================

        item.status.textContent =
            "Foto salva com sucesso!";

        item.status.className =
            "image-status success";

        if (result && result.url) {

            item.preview.src =
                `${API}${result.url}?v=${Date.now()}`;

            item.preview.classList.remove(
                "hidden"
            );

            item.placeholder.classList.add(
                "hidden"
            );
        }

        item.file.value = "";

    } catch (error) {

        console.error(
            "Erro no upload:",
            error
        );

        item.status.textContent =
            error.message ||
            "Não foi possível salvar a foto.";

        item.status.className =
            "image-status error";

    } finally {

        item.button.disabled = false;

        item.button.textContent =
            "Salvar foto";
    }
}

// ============================================================
// BOTÕES DAS FOTOS
// ============================================================

if (
    siteImages.sobre_nos.button
) {
    siteImages.sobre_nos.button.addEventListener(
        "click",
        () => {
            uploadSiteImage(
                "sobre_nos"
            );
        }
    );
}

if (
    siteImages.revisao_vidas.button
) {
    siteImages.revisao_vidas.button.addEventListener(
        "click",
        () => {
            uploadSiteImage(
                "revisao_vidas"
            );
        }
    );
}

// ============================================================
// PREVIEW ANTES DE SALVAR
// ============================================================

function setupLocalPreview(key) {
    const item = siteImages[key];

    if (
        !item ||
        !item.file
    ) {
        return;
    }

    item.file.addEventListener(
        "change",
        () => {

            const file =
                item.file.files[0];

            if (!file) {
                return;
            }

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];

            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {
                item.status.textContent =
                    "Use JPG, PNG ou WEBP.";

                item.status.className =
                    "image-status error";

                item.file.value = "";

                return;
            }

            if (
                file.size >
                8 * 1024 * 1024
            ) {
                item.status.textContent =
                    "A imagem deve ter no máximo 8 MB.";

                item.status.className =
                    "image-status error";

                item.file.value = "";

                return;
            }

            const url =
                URL.createObjectURL(file);

            item.preview.src = url;

            item.preview.classList.remove(
                "hidden"
            );

            item.placeholder.classList.add(
                "hidden"
            );

            item.status.textContent =
                "Pré-visualização. Clique em Salvar foto.";

            item.status.className =
                "image-status";
        }
    );
}

setupLocalPreview("sobre_nos");
setupLocalPreview("revisao_vidas");

// ============================================================
// ORAÇÃO
// ============================================================

const prayerList =
    document.getElementById(
        "prayerList"
    );

async function loadPrayers() {
    try {
        const prayers =
            await api(
                "/api/prayer-requests"
            );

        renderPrayers(prayers);

    } catch (error) {
        prayerList.innerHTML = `
            <div class="empty">
                ${escapeHtml(error.message)}
            </div>
        `;
    }
}

function renderPrayers(prayers) {
    if (!prayers.length) {
        prayerList.innerHTML = `
            <div class="empty">
                Nenhum pedido de oração.
            </div>
        `;

        return;
    }

    prayerList.innerHTML =
        prayers.map((prayer) => {

            const created =
                new Date(
                    prayer.created_at
                ).toLocaleString(
                    "pt-BR"
                );

            return `
                <article class="prayer">

                    <div>

                        <strong>
                            ${escapeHtml(
                                prayer.name
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                prayer.request
                            )}
                        </p>

                        <div class="prayer-meta">

                            <span>
                                ${created}
                            </span>

                            <select
                                onchange="changePrayerStatus(
                                    ${prayer.id},
                                    this.value
                                )"
                            >

                                <option
                                    value="novo"
                                    ${
                                        prayer.status === "novo"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Novo
                                </option>

                                <option
                                    value="em_oracao"
                                    ${
                                        prayer.status === "em_oracao"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Em oração
                                </option>

                                <option
                                    value="concluido"
                                    ${
                                        prayer.status === "concluido"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Concluído
                                </option>

                            </select>

                        </div>

                    </div>

                    <button
                        type="button"
                        class="danger"
                        onclick="deletePrayer(${prayer.id})"
                    >
                        Excluir
                    </button>

                </article>
            `;

        }).join("");
}

// ============================================================
// ALTERAR STATUS ORAÇÃO
// ============================================================

async function changePrayerStatus(
    id,
    status
) {
    try {

        await api(
            `/api/prayer-requests/${id}/status`,
            {
                method: "PUT",
                body: JSON.stringify({
                    status
                })
            }
        );

        await loadPrayers();

    } catch (error) {
        alert(error.message);
    }
}

window.changePrayerStatus =
    changePrayerStatus;

// ============================================================
// EXCLUIR PEDIDO DE ORAÇÃO
// ============================================================

async function deletePrayer(id) {

    if (
        !confirm(
            "Deseja excluir este pedido?"
        )
    ) {
        return;
    }

    try {

        await api(
            `/api/prayer-requests/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadPrayers();

    } catch (error) {
        alert(error.message);
    }
}

window.deletePrayer =
    deletePrayer;

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {
    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}

// ============================================================
// INICIAR
// ============================================================

loadMe();