// ============================================================
// SARA PIRAJUSSARA
// SCRIPT PRINCIPAL DO SITE
// ============================================================


// ============================================================
// 1. SELECIONANDO ELEMENTOS DO HTML
// ============================================================

const header = document.getElementById("header");
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");


// ============================================================
// 2. ELEMENTOS DO LIGHTBOX
// ============================================================

const lightbox = document.getElementById("lightbox");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxClose = document.getElementById("lightboxClose");


// ============================================================
// 3. EFEITO DO CABEÇALHO AO ROLAR A PÁGINA
// ============================================================

if (header) {
    window.addEventListener("scroll", () => {
        const isScrolled = window.scrollY > 30;

        header.classList.toggle(
            "scrolled",
            isScrolled
        );
    });
}


// ============================================================
// 4. MENU MOBILE
// ============================================================

if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
        nav.classList.toggle("open");
    });
}


// ============================================================
// 5. FECHAR MENU MOBILE AO CLICAR EM UM LINK
// ============================================================

if (nav) {
    document
        .querySelectorAll(".nav a")
        .forEach((link) => {
            link.addEventListener("click", () => {
                nav.classList.remove("open");
            });
        });
}


// ============================================================
// 6. ANIMAÇÕES DE APARECIMENTO
// ============================================================

const revealElements =
    document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible"
                        );

                        observer.unobserve(
                            entry.target
                        );
                    }
                });
            },
            {
                threshold: 0.12
            }
        );

    revealElements.forEach((element) => {
        observer.observe(element);
    });

} else {

    revealElements.forEach((element) => {
        element.classList.add("visible");
    });
}


// ============================================================
// 7. LIGHTBOX DA GALERIA
// ============================================================

const galleryItems =
    document.querySelectorAll(".gallery-item");

if (
    lightbox &&
    lightboxTitle &&
    galleryItems.length > 0
) {

    galleryItems.forEach((item) => {

        item.addEventListener("click", () => {

            const title =
                item.dataset.title ||
                "Sara Pirajussara";

            lightboxTitle.textContent =
                title;

            lightbox.classList.add("open");

            document.body.style.overflow =
                "hidden";
        });
    });
}


// ============================================================
// 8. FUNÇÃO PARA FECHAR O LIGHTBOX
// ============================================================

function closeLightbox() {

    if (!lightbox) {
        return;
    }

    lightbox.classList.remove("open");

    document.body.style.overflow = "";
}


// ============================================================
// 9. FECHAR LIGHTBOX PELO BOTÃO X
// ============================================================

if (lightboxClose) {

    lightboxClose.addEventListener(
        "click",
        () => {
            closeLightbox();
        }
    );
}


// ============================================================
// 10. FECHAR LIGHTBOX CLICANDO FORA
// ============================================================

if (lightbox) {

    lightbox.addEventListener(
        "click",
        (event) => {

            if (event.target === lightbox) {
                closeLightbox();
            }
        }
    );
}


// ============================================================
// 11. FECHAR LIGHTBOX COM ESC
// ============================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {
            closeLightbox();
        }
    }
);


// ============================================================
// 12. INSTAGRAM
// ============================================================

const instagramPosts =
    document.querySelectorAll(
        ".instagram-post"
    );

instagramPosts.forEach((post) => {

    post.addEventListener("click", () => {
        // O link funciona normalmente pelo href.
    });

});


// ============================================================
// 13. FALLBACK PARA IMAGENS DO INSTAGRAM
// ============================================================

const instagramImages =
    document.querySelectorAll(
        ".instagram-photo"
    );

instagramImages.forEach((image) => {

    image.addEventListener(
        "error",
        () => {
            image.style.display = "none";
        }
    );

});


// ============================================================
// 14. COPIAR CHAVE PIX
// ============================================================

function copyPixKey() {

    const pixKey =
        document.getElementById("pixKey");

    const btnText =
        document.getElementById("btnCopyText");

    if (!pixKey || !btnText) {
        return;
    }

    const pixKeyText =
        pixKey.innerText;

    navigator.clipboard
        .writeText(pixKeyText)
        .then(() => {

            btnText.innerText =
                "Copiado a chave pix!";

            setTimeout(() => {

                btnText.innerText =
                    "Copiar chave PIX";

            }, 2000);

        })
        .catch(() => {

            alert(
                "Não foi possível copiar a chave PIX."
            );

        });
}


// ============================================================
// 15. ENDEREÇO DA API
// ============================================================

const SARA_API_BASE =
    window.SARA_API_BASE ||
    "http://127.0.0.1:8000";


// ============================================================
// 16. CARREGAR EVENTOS DO SERVIDOR
// ============================================================

async function carregarEventosDoServidor() {

    const container =
        document.querySelector(
            ".monthly-events-grid"
        );

    if (!container) {

        console.warn(
            "Container de eventos não encontrado."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${SARA_API_BASE}/api/events`
            );

        if (!response.ok) {

            throw new Error(
                `Erro HTTP: ${response.status}`
            );
        }

        const eventos =
            await response.json();

        console.log(
            "Eventos recebidos da API:",
            eventos
        );

        const eventosAtivos =
            eventos.filter(
                (evento) =>
                    evento.active !== false
            );

        if (eventosAtivos.length === 0) {

            container.innerHTML = `
                <p class="no-events">
                    Nenhum evento programado no momento.
                </p>
            `;

            return;
        }

        container.innerHTML =
            eventosAtivos
                .map((evento) => {

                    const d =
                        new Date(
                            `${evento.date}T12:00:00`
                        );

                    const dia =
                        String(
                            d.getDate()
                        ).padStart(2, "0");

                    const mes =
                        d
                            .toLocaleDateString(
                                "pt-BR",
                                {
                                    month: "short"
                                }
                            )
                            .replace(".", "")
                            .toUpperCase();

                    const mesLongo =
                        d
                            .toLocaleDateString(
                                "pt-BR",
                                {
                                    month: "long"
                                }
                            )
                            .toUpperCase();

                    return `
                        <article class="monthly-event-card${evento.featured ? " monthly-event-featured" : ""}">

                            <div class="monthly-event-top">

                                <span class="monthly-event-month">
                                    ${mesLongo}
                                </span>

                            </div>

                            <div class="monthly-event-date">

                                <strong>${dia}</strong>

                                <span>${mes}</span>

                            </div>

                            <div class="monthly-event-content">

                                <h3>
                                    ${escapePublic(evento.title)}
                                </h3>

                                <p class="monthly-event-time">
                                    ${escapePublic(evento.time)}
                                </p>

                                <p>
                                    ${escapePublic(evento.description)}
                                </p>

                            </div>

                        </article>
                    `;
                })
                .join("");

    } catch (error) {

        console.error(
            "Não foi possível carregar os eventos do servidor:",
            error
        );

    }
}


// ============================================================
// 17. PROTEGER TEXTO VINDO DA API
// ============================================================

function escapePublic(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


// ============================================================
// 18. FORMULÁRIO DE ORAÇÃO
// ============================================================

async function conectarFormularioOracao() {

    const form =
        document.querySelector(
            ".prayer-form"
        );

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const button =
                form.querySelector(
                    "button[type='submit']"
                );

            const nome =
                document
                    .getElementById("nome")
                    ?.value
                    .trim();

            const pedido =
                document
                    .getElementById("pedido")
                    ?.value
                    .trim();

            if (!nome || !pedido) {
                return;
            }

            button.disabled = true;

            button.textContent =
                "Enviando...";

            try {

                const response =
                    await fetch(
                        `${SARA_API_BASE}/api/prayer-requests`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                name: nome,
                                request: pedido
                            })
                        }
                    );

                if (!response.ok) {

                    throw new Error(
                        "Falha ao enviar"
                    );
                }

                form.reset();

                button.textContent =
                    "Pedido enviado!";

                setTimeout(() => {

                    button.textContent =
                        "Enviar pedido de oração";

                    button.disabled =
                        false;

                }, 2500);

            } catch (error) {

                console.error(
                    "Erro ao enviar pedido:",
                    error
                );

                alert(
                    "Não foi possível enviar seu pedido agora. Tente novamente."
                );

                button.disabled =
                    false;

                button.textContent =
                    "Enviar pedido de oração";
            }
        }
    );
}


// ============================================================
// 19. CARREGAR IMAGENS GERENCIADAS PELO ADM
// ============================================================
//
// SOBRE NÓS
// → /api/site-images/sobre_nos
//
// REVISÃO DE VIDAS
// → /api/site-images/revisao_vidas
//
// As imagens ficam armazenadas no backend.
// ============================================================

async function carregarImagensDoSite() {

    const imagens = [

        {
            key: "sobre_nos",
            elementId: "sobreNosImage"
        },

        {
            key: "revisao_vidas",
            elementId: "revisaoVidasImage"
        }

    ];

    const versao =
        Date.now();

    for (const item of imagens) {

        const imagem =
            document.getElementById(
                item.elementId
            );

        if (!imagem) {

            console.warn(
                `Elemento ${item.elementId} não encontrado no HTML.`
            );

            continue;
        }

        const url =
            `${SARA_API_BASE}/api/site-images/${item.key}?v=${versao}`;

        try {

            console.log(
                `Buscando imagem: ${item.key}`
            );

            const response =
                await fetch(
                    url,
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                console.warn(
                    `Imagem ${item.key} não encontrada. HTTP ${response.status}`
                );

                continue;
            }


            // ==================================================
            // GARANTIR QUE O ELEMENTO <IMG> APAREÇA
            // ==================================================

            imagem.src = url;

            imagem.hidden = false;

            imagem.removeAttribute("hidden");

            imagem.style.display = "block";

            imagem.style.width = "100%";

            imagem.style.height = "100%";

            imagem.style.objectFit = "cover";

            imagem.style.objectPosition = "center";

            imagem.style.position = "absolute";

            imagem.style.inset = "0";

            imagem.style.zIndex = "1";


            // ==================================================
            // SOBRE NÓS
            // ==================================================

            if (
                item.key === "sobre_nos"
            ) {

                imagem.style.borderRadius =
                    "inherit";

                imagem.style.background =
                    "#111";

                const container =
                    imagem.closest(
                        ".photo-1"
                    );

                if (container) {

                    container.style.position =
                        "relative";

                    container.style.overflow =
                        "hidden";

                    container.style.background =
                        "#111";
                }
            }


            // ==================================================
            // REVISÃO DE VIDAS
            // ==================================================

            if (
                item.key === "revisao_vidas"
            ) {

                imagem.style.borderRadius =
                    "inherit";

                imagem.style.background =
                    "#111";

                const container =
                    imagem.closest(
                        ".revisao-card"
                    );

                if (container) {

                    container.style.position =
                        "relative";

                    container.style.overflow =
                        "hidden";

                    container.style.background =
                        "#111";


                    /*
                     * Mantém os textos por cima da imagem
                     */

                    const elementos =
                        container.querySelectorAll(
                            ".revisao-card-top, .revisao-card-center, .revisao-card-bottom"
                        );

                    elementos.forEach(
                        (elemento) => {

                            elemento.style.position =
                                "relative";

                            elemento.style.zIndex =
                                "3";
                        }
                    );
                }
            }


            // ==================================================
            // CONFIRMAR CARREGAMENTO
            // ==================================================

            imagem.onload = () => {

                console.log(
                    `Imagem ${item.key} carregada com sucesso.`
                );

            };


            imagem.onerror = () => {

                console.error(
                    `Erro ao renderizar a imagem ${item.key}.`
                );

            };

        } catch (error) {

            console.error(
                `Não foi possível carregar a imagem ${item.key}:`,
                error
            );
        }
    }
}


// ============================================================
// 20. INICIAR FUNÇÕES
// ============================================================

carregarEventosDoServidor();

conectarFormularioOracao();

carregarImagensDoSite();


// ============================================================
// FIM DO SCRIPT
// ============================================================