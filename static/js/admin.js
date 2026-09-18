const API_ADMIN = "/api/admin";
let selectedImportFile = null;
let importMapping = {};
let currentDataType = "sous-prefecture";
let equipmentChart;
let currentPage = 1;
const ROWS_PER_PAGE = 5;

function csrfToken() {
    const cookie = document.cookie.split("; ").find(item => item.startsWith("csrftoken="));
    return cookie ? decodeURIComponent(cookie.split("=")[1]) : "";
}

async function api(url, options = {}) {
    const headers = options.headers || {};
    if (options.method && options.method !== "GET") headers["X-CSRFToken"] = csrfToken();
    const response = await fetch(url, { credentials: "same-origin", ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
    if (!response.ok) {
        const serializerErrors = typeof data === "object" && !data.error
            ? Object.entries(data).map(([field, errors]) => `${field} : ${Array.isArray(errors) ? errors.join(" ") : errors}`).join(" — ")
            : "";
        const message = typeof data === "object"
            ? (data.error || serializerErrors)
            : "Le serveur a retourné une erreur. Vérifiez que votre session est active et réessayez.";
        throw new Error(message || "Une erreur est survenue.");
    }
    return data;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

async function loadDashboard() {
    const data = await api(`${API_ADMIN}/dashboard/`);
    document.getElementById("sousPrefecture").textContent = formatNumber(data.sous_prefectures);
    document.getElementById("population").textContent = formatNumber(data.population);
    document.getElementById("centreSante").textContent = formatNumber(data.centres_sante);

    const colors = ["#dc3545", "#fd7e14", "#ffc107", "#20a64a", "#198754"];
    const chartData = data.equipement;
    if (equipmentChart) equipmentChart.destroy();
    equipmentChart = new Chart(document.getElementById("equipementChart"), {
        type: "doughnut",
        data: {
            labels: chartData.map(item => item.libelle),
            datasets: [{ data: chartData.map(item => item.total), backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
}

function tableHeader(type) {
    return type === "centre"
        ? "<tr><th>Centre</th><th>Catégorie</th><th>Sous-préfecture</th><th>Contact</th><th class='text-center'>Action</th></tr>"
        : "<tr><th>Sous-préfecture</th><th>Population</th><th>Superficie</th><th class='text-center'>Action</th></tr>";
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

async function loadExistingData() {
    const search = document.getElementById("dataSearch").value.trim();
    const endpoint = currentDataType === "centre" ? "centres" : "sous-prefectures";
    const data = await api(`${API_ADMIN}/${endpoint}/?q=${encodeURIComponent(search)}`);
    document.getElementById("dataTableHead").innerHTML = tableHeader(currentDataType);
    const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const pageRows = data.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
    const rows = pageRows.map(item => currentDataType === "centre"
        ? `<tr><td>${escapeHtml(item.libelle)}</td><td>${escapeHtml(item.categorie)}</td><td>${escapeHtml(item.sous_prefecture)}</td><td>${escapeHtml(item.contact || "—")}</td>${actionButtons(item.id)}</tr>`
        : `<tr><td>${escapeHtml(item.libelle)}</td><td>${formatNumber(item.habitant)}</td><td>${item.superficie_km2 == null ? "—" : `${formatNumber(item.superficie_km2)} km²`}</td>${actionButtons(item.id)}</tr>`
    ).join("");
    document.getElementById("dataTableBody").innerHTML = rows || `<tr><td colspan="5" class="text-center text-muted py-4">Aucune donnée trouvée.</td></tr>`;
    renderPagination(totalPages, data.length);
}

function renderPagination(totalPages, totalRows) {
    const pagination = document.getElementById("dataPagination");
    if (!totalRows) {
        pagination.innerHTML = "";
        return;
    }
    const pageButton = (page, label, disabled = false, active = false) => `
        <li class="page-item ${disabled ? "disabled" : ""} ${active ? "active" : ""}">
            <button class="page-link" type="button" data-page="${page}" ${disabled ? "disabled" : ""}>${label}</button>
        </li>`;
    const visiblePages = new Set([1, totalPages]);
    for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
        if (page > 0 && page <= totalPages) visiblePages.add(page);
    }
    const pages = [...visiblePages].sort((a, b) => a - b).reduce((html, page, index, values) => {
        const previous = values[index - 1];
        const ellipsis = previous && page - previous > 1
            ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
            : "";
        return html + ellipsis + pageButton(page, page, false, page === currentPage);
    }, "");
    pagination.innerHTML = pageButton(currentPage - 1, "‹", currentPage === 1) + pages + pageButton(currentPage + 1, "›", currentPage === totalPages);
}

function actionButtons(id) {
    return `<td class="text-center action"><button class="btn btn-sm edit" data-action="edit" data-id="${id}" title="Modifier"><i class="fa fa-pencil"></i></button><button class="btn btn-sm delete" data-action="delete" data-id="${id}" title="Supprimer"><i class="fa fa-trash"></i></button></td>`;
}

async function editRow(id) {
    const isCentre = currentDataType === "centre";
    const label = window.prompt(isCentre ? "Nom du centre de santé :" : "Nom de la sous-préfecture :");
    if (label === null || !label.trim()) return;
    const payload = isCentre ? { libelle_centre: label.trim() } : { libelle_souspref: label.trim() };
    const endpoint = isCentre ? "centres" : "sous-prefectures";
    await api(`${API_ADMIN}/${endpoint}/${id}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    loadExistingData();
}

async function deleteRow(id) {
    if (!window.confirm("Voulez-vous réellement supprimer cet élément ?")) return;
    const endpoint = currentDataType === "centre" ? "centres" : "sous-prefectures";
    await api(`${API_ADMIN}/${endpoint}/${id}/`, { method: "DELETE" });
    loadExistingData();
    loadDashboard();
}

function importNotice(message, kind = "info") {
    document.getElementById("importFeedback").innerHTML = `<div class="alert alert-${kind} mb-0">${escapeHtml(message)}</div>`;
}

function mappingSelect(field, fields, required = false) {
    const options = ["<option value=''>— Ne pas importer —</option>", ...fields.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)].join("");
    return `<div class="col-md-6"><label class="form-label small fw-semibold">${field}${required ? " *" : ""}</label><select class="form-select mapping-field" data-field="${field}">${options}</select></div>`;
}

function showMapping(preview) {
    const mappingBox = document.getElementById("importMapping");
    const fields = preview.fields;
    mappingBox.innerHTML = `
        <div class="mapping-title"><i class="fa fa-table me-2"></i>Associez les colonnes du fichier aux champs du centre de santé</div>
        <p class="small text-muted mt-2 mb-3">Le code du centre est généré automatiquement. La sous-préfecture est déterminée à partir de la position géographique.</p>
        <div class="row g-3">
            ${mappingSelect("libelle_centre", fields, true)}
            ${mappingSelect("code_categorie", fields, true)}
            ${mappingSelect("contact_centre", fields)}
            ${mappingSelect("latitude", fields)}
            ${mappingSelect("longitude", fields)}
            ${preview.source === "shp" ? mappingSelect("geometry", fields, true) : mappingSelect("geometry", fields)}
        </div>`;
    mappingBox.classList.remove("d-none");
    mappingBox.querySelectorAll(".mapping-field").forEach(select => {
        const exact = fields.find(field => field.toLowerCase() === select.dataset.field.toLowerCase());
        const aliases = {
            libelle_centre: ["nom", "nom_centre", "libelle", "centre"],
            code_categorie: ["categorie", "category", "type"],
            latitude: ["lat", "y"], longitude: ["lon", "lng", "x"], geometry: ["__geometry__"]
        };
        const match = exact || (aliases[select.dataset.field] || []).map(alias => fields.find(field => field.toLowerCase() === alias)).find(Boolean);
        if (match) select.value = match;
    });
    document.getElementById("importCentersBtn").disabled = false;
}

async function previewImport() {
    const file = document.getElementById("fileUpload").files[0];
    if (!file) return;
    selectedImportFile = file;
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileName").classList.remove("d-none");
    document.getElementById("importCentersBtn").disabled = true;
    document.getElementById("importMapping").classList.add("d-none");
    importNotice("Lecture du fichier et préparation du mapping…");
    try {
        const form = new FormData(); form.append("file", file);
        const preview = await api(`${API_ADMIN}/import-centres/preview/`, { method: "POST", body: form });
        showMapping(preview);
        importNotice(`${preview.sample.length} ligne(s) échantillon analysée(s). Vérifiez le mapping avant l’intégration.`, "success");
    } catch (error) { importNotice(error.message, "danger"); }
}

async function submitImport() {
    if (!selectedImportFile) return;
    importMapping = Object.fromEntries([...document.querySelectorAll(".mapping-field")].map(select => [select.dataset.field, select.value]));
    if (!importMapping.libelle_centre || !importMapping.code_categorie || (!importMapping.geometry && (!importMapping.latitude || !importMapping.longitude))) {
        importNotice("Renseignez le nom, la catégorie et une géométrie ou les coordonnées latitude/longitude.", "warning");
        return;
    }
    const button = document.getElementById("importCentersBtn");
    button.disabled = true; button.textContent = "Importation en cours…";
    try {
        const form = new FormData();
        form.append("file", selectedImportFile); form.append("mapping", JSON.stringify(importMapping));
        const result = await api(`${API_ADMIN}/import-centres/`, { method: "POST", body: form });
        const details = result.erreurs.length ? ` ${result.erreurs.length} ligne(s) rejetée(s).` : "";
        importNotice(`${result.importes} centre(s) importé(s) sur ${result.total}.${details}`, result.erreurs.length ? "warning" : "success");
        loadDashboard(); loadExistingData();
    } catch (error) { importNotice(error.message, "danger"); }
    finally { button.disabled = false; button.textContent = "Intégrer dans le système"; }
}

function setupSidebar() {
    const sidebar = document.getElementById("sidebar");
    const collapsed = localStorage.getItem("adminSidebarCollapsed") === "true";
    if (collapsed) document.body.classList.add("sidebar-collapsed");
    document.getElementById("sidebarCollapse").addEventListener("click", () => {
        document.body.classList.toggle("sidebar-collapsed");
        localStorage.setItem("adminSidebarCollapsed", document.body.classList.contains("sidebar-collapsed"));
    });
    document.getElementById("sidebarToggle").addEventListener("click", () => sidebar.classList.add("sidebar-open"));
    document.getElementById("sidebarClose").addEventListener("click", () => sidebar.classList.remove("sidebar-open"));
    sidebar.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => sidebar.classList.remove("sidebar-open")));
}

function feedback(elementId, message, kind) {
    document.getElementById(elementId).innerHTML = `<div class="alert alert-${kind} py-2 mb-0">${escapeHtml(message)}</div>`;
}

async function loadProfile() {
    const user = await api(`${API_ADMIN}/mon-profil/`);
    document.getElementById("profileFullName").value = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Non renseigné";
    document.getElementById("profileUsername").value = user.username || "";
    document.getElementById("profileEmail").value = user.email || "";
    if (user.photo) {
        document.getElementById("profileAvatar").src = user.photo;
        document.getElementById("photoPreview").src = user.photo;
        document.getElementById("navbarAvatar").src = user.photo;
    }
    const adminName = document.getElementById("adminiUser");
    adminName.textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Impossible de lire l’image."));
        reader.readAsDataURL(file);
    });
}

async function createAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    const password = document.getElementById("newPassword").value;
    if (password !== document.getElementById("newPasswordConfirm").value) {
        feedback("createAdminFeedback", "Les mots de passe ne correspondent pas.", "warning");
        return;
    }
    const payload = {
        first_name: document.getElementById("newFirstName").value.trim(),
        last_name: document.getElementById("newLastName").value.trim(),
        username: document.getElementById("newUsername").value.trim(),
        telephone_utilisateur: document.getElementById("newPhone").value.trim(),
        email: document.getElementById("newEmail").value.trim(),
        password,
        code_role: null
    };
    try {
        const response = await api("/api/register/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        feedback("createAdminFeedback", response.message, "success");
        form.reset();
    } catch (error) { feedback("createAdminFeedback", error.message, "danger"); }
}

async function saveSettings(event) {
    event.preventDefault();
    // currentTarget est remis à null après un await : conserver le formulaire
    // avant les appels réseau pour pouvoir le réinitialiser sans erreur.
    const form = event.currentTarget;
    const current = document.getElementById("currentPassword").value;
    const password = document.getElementById("settingsNewPassword").value;
    const confirmation = document.getElementById("settingsPasswordConfirm").value;
    try {
        const photo = document.getElementById("settingsPhoto").files[0];
        if (photo) {
            const photoUrl = await readFileAsDataUrl(photo);
            await api(`${API_ADMIN}/mon-profil/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: photoUrl }) });
        }
        if (current || password || confirmation) {
            await api(`${API_ADMIN}/changer-mot-de-passe/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ancien_mot_de_passe: current, nouveau_mot_de_passe: password, confirmation_mot_de_passe: confirmation }) });
        }
        feedback("settingsFeedback", "Paramètres enregistrés avec succès.", "success");
        form.reset();
        loadProfile();
    } catch (error) { feedback("settingsFeedback", error.message, "danger"); }
}

document.addEventListener("DOMContentLoaded", () => {
    setupSidebar();
    loadProfile().catch(console.error);
    loadDashboard().catch(console.error);
    loadExistingData().catch(console.error);
    document.getElementById("fileUpload").addEventListener("change", previewImport);
    document.getElementById("importCentersBtn").addEventListener("click", submitImport);
    document.getElementById("dataTypeFilter").addEventListener("change", event => { currentDataType = event.target.value; currentPage = 1; loadExistingData().catch(console.error); });
    let searchTimer;
    document.getElementById("dataSearch").addEventListener("input", () => { currentPage = 1; clearTimeout(searchTimer); searchTimer = setTimeout(() => loadExistingData().catch(console.error), 250); });
    document.getElementById("dataTableBody").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        (button.dataset.action === "edit" ? editRow(button.dataset.id) : deleteRow(button.dataset.id)).catch(error => window.alert(error.message));
    });
    document.getElementById("dataPagination").addEventListener("click", event => {
        const button = event.target.closest("button[data-page]");
        if (!button || button.disabled) return;
        currentPage = Number(button.dataset.page);
        loadExistingData().catch(console.error);
    });
    document.getElementById("createAdminForm").addEventListener("submit", createAdmin);
    document.getElementById("settingsForm").addEventListener("submit", saveSettings);
    document.getElementById("settingsPhoto").addEventListener("change", event => {
        const [file] = event.target.files;
        if (file) document.getElementById("photoPreview").src = URL.createObjectURL(file);
    });
});
