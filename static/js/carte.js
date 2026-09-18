//Initialisation de la carte

// Création de la carte
let map = L.map('map', {
    minZoom: 5, // Niveau de zoom minimal
    maxZOOM: 19 // Niveau de zoom maximal
});

// Leaflet recalcule ses dimensions lorsque la mise en page change (mobile/tablette).
window.addEventListener("resize", () => {
    window.requestAnimationFrame(() => map.invalidateSize());
});

// Limites de la CI
let bounds = [
    [4.2, -8.6], // Sud-Ouest
    [10.8, -2.5] // Nord-Est
];

// Ajout des limites de la CI à la carte
map.fitBounds(bounds);

// Empêcher l'utilisateur de sortir de la CI
map.setMaxBounds(bounds);

// ===============================
// Fond OSM
// ===============================
// Fond cartographique Esri
const esriStreetLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        minZoom: 5,
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; ' +
            'Source: Esri, HERE, Garmin, Intermap, increment P Corp., ' +
            'GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, ' +
            'Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), ' +
            'swisstopo, &copy; OpenStreetMap contributors, and the GIS User Community'
    }
).addTo(map);


// ===============================
// Fond satellite ESRI
// ===============================
const esriLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        minZoom: 5,
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, ' +
            'Maxar, Earthstar Geographics, and the GIS User Community'
    }
);


// ===============================
// Fond satellite hybride
// ===============================
const satelliteLayer = L.layerGroup([

    // Imagerie satellite
    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            minZoom: 5,
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, ' +
                'Earthstar Geographics, and the GIS User Community'
        }
    ),

    // Limites + noms
    L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            minZoom: 5,
            maxZoom: 19,
            attribution: 'Labels &copy; Esri'
        }
    )
]);


// ===============================
// Contrôle des fonds
// ===============================
const layerControl = L.control.layers({
        'esriStreetLayer': esriStreetLayer,
        'Esri': esriLayer,
        'Satellite hybride': satelliteLayer
    },
    null, {
        collapsed: true
    }
).addTo(map);

// Ajouter des fonctionnalités de dessin
let drawItems = L.featureGroup().addTo(map);

//Configuration des outils de dessins

let drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawItems
    },
    draw: {
        polygon: true,
        polyline: true,
        circle: true,
        rectangle: true,
        marker: true,
        circlemarker: false
    }
});
// Ajout des éléments sur la carte
map.addControl(drawControl);

//Ajout d'évènement pour déclencher l'ajout d'un élément dessiné
map.on(L.Draw.Event.CREATED, function(event) {
    let layer = event.layer;
    drawItems.addLayer(layer);
});


// Ajout des fonctionnalités d'impression
L.easyPrint({
    title: 'Imprimer la carte',
    position: 'topleft',
    sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
    elementsToHide: '.leaflet-control-container'
}).addTo(map);

//Visualiser les districts sur notre carte

let geoLayer;
let protocol = window.location.protocol;
let hostname = window.location.hostname;
let port = window.location.port ? `:${window.location.port}` : "";

const spEndpoint = `${protocol}//${hostname}${port}/api/sous-prefectures/`;
const spDetailEndpoint = (codeSouspref) =>
    `${protocol}//${hostname}${port}/api/sous-prefectures/${codeSouspref}/details/`;


fetch(spEndpoint)
    .then(response => response.json())
    //.then(donne => console.log(donne)) 
    .then(data => {
        geoLayer = L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: 'rgb(24, 90, 164)',
                    weigth: 2,
                    fillColor: 'transparent',
                    fillOpacity: 0
                }
            },
            onEachFeature: function(feature, layer) {
                // Afficher les noms des sous-préfecture
                const spName = feature.properties.libelle_souspref;
                const habitant = feature.properties.habitant;

                // Stocker les noms de la sous-préfecture
                layer.spName = spName;
                layer.habitant = habitant;
                layer.codeSouspref = feature.properties.code_souspref || feature.id;

            }
        }).addTo(map)
    })
    .catch(error => console.error('Erreur: ', error));

/*===============================
Traitement de la visualisation des points
==================================*/

// Création d'un cluster pour regrouper les markers
const centerCluster = L.markerClusterGroup({
    siperfyOnMaxZoom: true, // eclater les cluster au zoom max
    showCoverageOnHover: false, // Ne montre pas la zone couverte
    zoomToBoundsOnclick: true, // zoom sur cluster au clic
    disableClusterinAtZoom: 14, // desactive le cluster à partir d'un certain zoom

    // Icône personnalisée du cluster
    iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        return L.divIcon({
            html: `
            <div style="
            background-color: #0A7CBF;
            width:35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            color:white;
            border:3px solid #fff;
            font-weight: bold;
            box-shadow: 0 0 6px rgba(0,0,0,0.3);
            ">
            <span style="font-size:16px; line-height:12px;">+</span>
            <span style="font-size:11px;">${count}</span>
            </div>
            `,
            className: 'custom-cluster',
            iconSize: [30, 30]
        })
    }

})

const categoryEndpoint = `${protocol}//${hostname}${port}/api/categories/`;
const centers = {}

fetch(categoryEndpoint)
    .then(response => response.json())
    .then(categories => {

        const select = document.getElementById("filterCenter");

        categories.forEach(cat => {

            centers[cat.code_categorie] = [];

            select.innerHTML += `
                <option value="${cat.code_categorie}">
                    ${cat.libelle_categorie}
                </option>
            `;

        });

    });

//Visualiser les centres de santé
const csEndpoint = `${protocol}//${hostname}${port}/api/centres-sante/`;
//const urlCentreSante = "data/data.geojson";
fetch(csEndpoint)
    .then(response => response.json())
    //.then(donnee => console.log(donnee)) // deboggage
    .then(data => {
            //création d'une couche geoJSON pour les centres de santé
            const geosjonLayer = L.geoJSON(data, {
                        // définition d'une fonction pour récupérer chaque point
                        onEachFeature: function(feature, layer) {
                                if (feature.properties && feature.properties.libelle_centre) {
                                    layer.bindPopup(`
                        <strong>${feature.properties.libelle_centre || 'Inconnu'}</strong><br>
                        Statut: ${feature.properties.libelle_categorie || 'Inconnu'}<br>
                        Contact: ${feature.properties.contact_centre || 'non renseigné'}<br>
                        <b>Services :</b>
                        <ul>
                            ${
                                feature.properties.services && feature.properties.services.length > 0
                                ?
                                feature.properties.services.map(service =>
                                    `<li>${service.libelle_service}</li>`
                                ).join("")
                                :
                                "<li>Non renseigné</li>"
                            }
                        </ul>
                        `);
                }
            },
            //Transformer les points geoJSON en marker
            pointToLayer: function(feature, latlng) {
                // normalisation du statut en miniscule pour la cohérence
                const statut = (feature.properties.libelle_categorie || 'Inconnu').toLowerCase();
                const codeCategorie = feature.properties.code_categorie;
                // Création du marker avec une image
                const marker = L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: 'static/img/hopital.png',
                        iconSize: [25, 25]
                    })
                });
                // ajout de popup sur chaque marker
                if (feature.properties && feature.properties.libelle_centre) {
                    marker.bindPopup(`
                        <strong>${feature.properties.libelle_centre || 'Inconnu'}</strong><br>,
                        Satut: ${statut || 'Inconnu'}
                        `, {
                        // décaler ton popup au-dessus du marker (X = 0, Y négatif pour monter le popup)
                        offset: [0, -5],
                        className: "custom-popup"
                    });
                }

                // stockage des marqueurs
                // Si le type de centre de santé existe dans l'objet centers
                if (!centers[codeCategorie]) {
                    centers[codeCategorie] = [];
                }
                // Ajouter le marqueur
                centers[codeCategorie].push(marker);

                return marker;
            }

        }); //.addTo(map);
        // Ajout de chaque layer dans le cluster pour un affichage groupé
        geosjonLayer.eachLayer(layer => {
            centerCluster.addLayer(layer)
        });
        // Ajout du cluster à la carte
        map.addLayer(centerCluster);
        updateChart()
    })
    .catch(error => console.error("Erreur:", error))



/* ====================================
 Filtre des centres de santé
======================================== */
function showCenters(type) {
    // supprimer tous les marqueurs actuellement dans le cluster
    centerCluster.clearLayers();

    // Selectionner des marqueurs à afficher
    const markersToShow = type === "all" ? Object.values(centers).flat() : centers[type];

    // Ajouter les marqueurs sélectionnés
    markersToShow.forEach(marker => centerCluster.addLayer(marker));

    // Réajouter les cluster à la carte au cas ou ils auraient été rétirés
    map.addLayer(centerCluster);
}
// affichage initial

showCenters('all');

// Récupérer la sélection
let filterCenter = document.getElementById('filterCenter');

// Evènement pour déclencher le changement
filterCenter.addEventListener('change', e => {
    showCenters(e.target.value);
});



/*===============================
Bouton de recherche
=================================== */
// récupérer la valeur saisie par l'utilisateur
let search = document.getElementById("search");
// rechercher
let bouton = document.getElementById("btnSearch");
// no found
let noFound = document.getElementById("noFound");

// Nom de la sous-préfecture
let nameSP = document.getElementById("spName");
let habitant = document.getElementById("pop");
let nombreCentres = document.getElementById("centres");
let ratio = document.getElementById("ratio");
let statut = document.getElementById("status");
let statutIcon = document.querySelector(".status-dot i");
let hideTimeout = null;

const statutLabels = {
    sous_equipee: "Sous équipée",
    equipee: "Équipée",
    tres_sous_equipee: "Très sous équipée",
    moyennement_equipee: "Moyennement équipée",
    tres_equipee: "Très équipée"
};

function formatNumber(value) {
    return Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function formatRatio(value) {
    return Number(value || 0).toLocaleString("fr-FR", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    });
}

function definirCouleurStatut(codeStatut) {
    const couleurs = {
        tres_sous_equipee: "#dc3545",
        sous_equipee: "#fd7e14",
        moyennement_equipee: "#ffc107",
        equipee: "#20a64a",
        tres_equipee: "#198754"
    };

    statutIcon.className = "fa fa-circle";
    statutIcon.style.color = couleurs[codeStatut] || "#6c757d";
}

function afficherRapport(sousprefecture) {
    const rapport = sousprefecture.rapport;
    nameSP.textContent = sousprefecture.libelle_souspref;
    habitant.textContent = formatNumber(sousprefecture.habitant);

    if (!rapport) {
        nombreCentres.textContent = "—";
        ratio.textContent = "—";
        statut.textContent = "Aucun rapport disponible";
        definirCouleurStatut();
        return;
    }

    nombreCentres.textContent = formatNumber(rapport.nombre_centre);
    ratio.textContent = formatRatio(rapport.ratio);
    statut.textContent = statutLabels[rapport.statut] || rapport.statut;
    definirCouleurStatut(rapport.statut);
}

function chargerRapport(codeSouspref) {
    fetch(spDetailEndpoint(codeSouspref))
        .then(response => {
            if (!response.ok) throw new Error("Impossible de charger le rapport");
            return response.json();
        })
        .then(afficherRapport)
        .catch(error => {
            console.error("Erreur lors du chargement du rapport :", error);
            nombreCentres.textContent = "—";
            ratio.textContent = "—";
            statut.textContent = "Indisponible";
            definirCouleurStatut();
        });
}
// Normalisation des données pour ignorer des erreurs d'orthographe
function
normalize(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
}

//Gestion de la recherche
bouton.addEventListener("click", e => {
    // Récupérer la valeur saisie par l'utilisateur
    const inputVaue = search.value;

    // Normalisation de la valeur saisie par l'utilisateur
    const searchValue = normalize(inputVaue);

    // Arrêter la recherche si le champ est vide 
    if (!searchValue) {
        return;
    }
    // variable la couche recherchée
    let foundLayer = null;
    // Parcourir les sous-préfectures
    geoLayer.eachLayer(function(layer) {
        // récupérer les propriétés geoJSON de la couche
        const props = layer.feature.properties;
        // récupérer l'attribut qui contient le nom de la sous-préfectures
        const attr = props.libelle_souspref || "";

        // Normalisation
        const name = normalize(attr);

        // comparer de manière les valeurs après la aormalisation
        if (name == searchValue) {
            foundLayer = layer
        }
    });

    // Résultat de la recherche
    if (foundLayer) {
        // Réinitialiser le style de la couche trouvée
        geoLayer.eachLayer(l => geoLayer.resetStyle(l));
        // Zoomer automatiquemnt sur la couche
        map.fitBounds(foundLayer.getBounds());

        // Mettre en évidence la couche trouvée
        foundLayer.setStyle({
            color: '#438a17',
            weigth: 3,
            fillColor: '#0A7DC0',
            fillOpacity: 0.1
        });

        // Afficher le nom de la couche trouvée
        foundLayer.unbindTooltip();
        foundLayer.bindTooltip(foundLayer.spName, foundLayer.habitant, {
            permanent: true,
            direction: "center",
            className: "district-label"
        }).openTooltip();

        nameSP.innerText = foundLayer.spName;
        habitant.innerText = formatNumber(foundLayer.habitant);
        chargerRapport(foundLayer.codeSouspref);

        // Vider le champ de recherche
        document.getElementById("search").value = "";
        // Stop le timer si actif
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }

        // Masquer immédiatement
        document.getElementById("searchBox").classList.add("d-none");
        document.getElementById("searchToggle").style.display = "block";
    } else {
        //alert("Aucune sous-préfecture trouvé!")
        noFound.innerHTML = '<i class="fa-solid fa-warning text-warning me-2"></i>Aucune sous-préfecture trouvé!';
        noFound.classList.remove("d-none");

        // ancien timer
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }

        // Faire le message après 5s
        setTimeout(() => {
            noFound.classList.add("d-none");
        }, 5000);

        // Disparition de la barre (10s)
        hideTimeout = setTimeout(() => {
            document.getElementById("searchBox").classList.add("d-none");
            document.getElementById("searchToggle").style.display = "block";
        }, 10000);
    }
})


//Valider la recherche avec la touche entrée
search.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        bouton.click();
    }
})


//Toogle de recherche
document.addEventListener("DOMContentLoaded", function() {
    let searchBox = document.getElementById("searchBox");
    let searchToggle = document.getElementById("searchToggle");
    let btnSearch = document.getElementById("btnSearch");

    if (searchToggle) {
        searchToggle.addEventListener("click", function() {
            searchBox.classList.remove("d-none");
            this.style.display = "none";
        });
    }

    if (btnSearch) {
        btnSearch.addEventListener("click", function() {
            let value = document.getElementById("search").value.trim();

            // Lancer timer de disparition (10s)
            hideTimeout = setTimeout(() => {
                searchBox.classList.add("d-none");
                searchToggle.style.display = "block";
            }, 10000);

        });
    }
});


document.addEventListener("click", function(e) {

    let searchBox = document.getElementById("searchBox");
    let searchToggle = document.getElementById("searchToggle");

    // Si la barre est visible
    if (!searchBox.classList.contains("d-none")) {

        // Si on clique NI sur la barre NI sur le bouton
        if (!searchBox.contains(e.target) && !searchToggle.contains(e.target)) {

            // Masquer la barre
            searchBox.classList.add("d-none");
            searchToggle.style.display = "block";
        }
    }
});

/*======================
Diagramme circulaire
======================= */

let diagram = document.getElementById("pieChart");

// Fonction pour retourner les statistiques des centres de santé par catégorie

function getCenterStats() {

    const stats = {};

    Object.keys(centers).forEach(key => {

        stats[key] = centers[key].length;

    });

    return stats;

}


// Création du diagramme
let categoryLabels = [];
let categoryIds = [];
let chart;
fetch(categoryEndpoint)

.then(response => response.json())

.then(categories => {


    categoryLabels = categories.map(
        c => c.abreviation
    );


    categoryIds = categories.map(
        c => c.code_categorie
    );


    chart.data.labels = categoryLabels;


    chart.update();


});


chart = new Chart(diagram, {

    type: 'pie',

    data: {

        labels: [],

        datasets: [{
            data: [],

            hoverOffset: 20,

            backgroundColor: [
                '#ed9696',
                '#c6da40',
                '#2f64cd',
                '#ac2076',
                '#b15959',
                '#e9df52',
                '#5c09bb',
                '#07761c',
                '#e06811',
                '#14a0a7'
            ]
        }]

    },


    options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {
                position: 'bottom',

                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 10,
                    display: false,
                    padding: 15,

                    font: {
                        size: 11
                    }
                },

                // Organisation en colonnes
                maxWidth: 300
            },


            tooltip: {

                callbacks: {

                    label: function(context) {

                        let dataset = context.dataset.data;

                        let total = dataset.reduce(
                            (acc, value) => acc + value,
                            0
                        );


                        let value = context.raw;


                        let pourcentage = total > 0 ?
                            ((value / total) * 100).toFixed(1) :
                            0;


                        return `${context.label} : ${value} (${pourcentage}%)`;

                    }

                }

            }

        }

    }

});



// Mise à jour automatique du graphe
function updateChart() {

    // Récupérer les statistiques
    const stats = getCenterStats();


    // Générer les valeurs dans le même ordre
    // que les catégories venant de la BD
    const values = categoryIds.map(id => {

        return stats[id] || 0;

    });


    // Mise à jour des données
    chart.data.labels = categoryLabels;

    chart.data.datasets[0].data = values;


    // Rafraîchir le graphe
    chart.update();
}



function updateLegend() {
    const legend = document.getElementById("chartLegend");
    legend.innerHTML = "";

    chart.data.labels.forEach((label, index) => {
        // Récupération sécurisée de la couleur
        const color = chart.data.datasets[0].backgroundColor[index] || '#000';

        legend.innerHTML += `
            <div class="legend-item">
                <span class="legend-circle" style="background: ${color};"></span>
                <span class="legend-text">${label}</span>
            </div>
        `;
    });
}