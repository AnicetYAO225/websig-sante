//Initialisation de la carte

// Création de la carte
let map = L.map('map', {
    minZoom: 5, // Niveau de zoom minimal
    maxZOOM: 19 // Niveau de zoom maximal
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

// Ajout d'une tuile OSM
let osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 5,
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

//Ajout d'une tuile ESRI
let esriLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    minZoom: 5,
    maxZOOM: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

//Ajout d'une tuile satellite
let satelliteLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
    maxZoom: 19,
    minZoom: 5,
    attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'jpg'
});

//Contrôle des couches
let layerControl = L.control.layers({
    'OSM': osmLayer,
    'Esri': esriLayer,
    'Satellite': satelliteLayer
}, null, {
    collapsed: true
}).addTo(map);


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

const url = 'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/CIV/ADM1/geoBoundaries-CIV-ADM1_simplified.geojson';
fetch(url)
    .then(response => response.json())
    //.then(donne => console.log(donne)) 
    .then(data => {
        geoLayer = L.geoJSON(data, {
            style: function(feature) {
                return {
                    color: '#9C2913',
                    weigth: 2,
                    fillColor: 'transparent',
                    fillOpacity: 0
                }
            },
            onEachFeature: function(feature, layer) {
                // Afficher les noms des district
                //layer.bindPopup(feature.properties.shapeName);
                const districtName = feature.properties.shapeName;

                // Stocker les noms de la sous-préfecture
                layer.districtName = districtName;

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


// Stockage des types de centres de santé
const centers = {
    nurse: [],
    doctor: [],
    hospital: [],
    dentist: [],
    centre: [],
    clinic: [],
    pharmacy: [],
    birthing_centre: [],
    laboratory: [],
    blood_bank: []
};

//Visualiser les centres de santé
const urlCentreSante = "data/data.geojson";
fetch(urlCentreSante)
    .then(response => response.json())
    //.then(donnee => console.log(donnee)) // deboggage
    .then(data => {
        //création d'une couche geoJSON pour les centres de santé
        const geosjonLayer = L.geoJSON(data, {
            // définition d'une fonction pour récupérer chaque point
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.name) {
                    layer.bindPopup(`
                        <strong>${feature.properties.name || 'Inconnu'}</strong><br>
                        Statut: ${feature.properties.healthcare || 'Inconnu'}
                        `);
                }
            },
            //Transformer les points geoJSON en marker
            pointToLayer: function(feature, latlng) {
                // normalisation du statut en miniscule pour la cohérence
                const statut = (feature.properties.healthcare || 'Inconnu').toLowerCase();
                // Création du marker avec une image
                const marker = L.marker(latlng, {
                    icon: L.icon({
                        iconUrl: 'images/hopital.png',
                        iconSize: [25, 25]
                    })
                });
                // ajout de popup sur chaque marker
                if (feature.properties && feature.properties.name) {
                    marker.bindPopup(`
                        <strong>${feature.properties.name || 'Inconnu'}</strong><br>,
                        Satut: ${statut || 'Inconnu'}
                        `, {
                        // décaler ton popup au-dessus du marker (X = 0, Y négatif pour monter le popup)
                        offset: [0, -5],
                        className: "custom-popup"
                    });
                }

                // stockage des marqueurs
                // Si le type de centre de santé existe dans l'objet centers
                if (centers[statut]) {
                    // Ajouter le marqueur
                    centers[statut].push(marker);
                }

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
let hideTimeout = null;
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
        const attr = props.shapeName || "";

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
        foundLayer.bindTooltip(foundLayer.districtName, {
            permanent: true,
            direction: "center",
            className: "district-label"
        }).openTooltip();

        nameSP.innerText = foundLayer.districtName;

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
    return {
        nurse: centers.nurse.length,
        doctor: centers.doctor.length,
        hospital: centers.hospital.length,
        dentist: centers.dentist.length,
        centre: centers.centre.length,
        clinic: centers.clinic.length,
        pharmacy: centers.pharmacy.length,
        birthing_centre: centers.birthing_centre.length,
        laboratory: centers.laboratory.length,
        blood_bank: centers.blood_bank.length
    }
}

// Création du diagramme

let chart = new Chart(diagram, {
    type: 'pie', // pie pour diagramme circulaire

    data: {
        labels: [
            'Infirmerie',
            'Dispensaire',
            'Hôpital',
            'Dentiste',
            'CHU',
            'Clinique',
            'Pharmacie',
            'Maternité',
            'Laboratoire',
            'Centre de transfusion'
        ],
        datasets: [{
            // Données initiales
            data: Array(10).fill(0),
            // Animation au survol
            hoverOffset: 20,

            // Couleurs associées à chaque catégorie
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
                '#14a0a7',
            ]

        }]
    },
    // Configuration générale du graphique
    options: {
        responsive: true,
        maintainAspectRation: false,

        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 10,
                    font: {
                        size: 11
                    }
                }
            },
            // Configuration des infobulles

            tooltip: {
                callbacks: {
                    label: function(context) {
                        // Récupérer toutes les données du dataset
                        let dataset = context.dataset.data;

                        // Calcul du total de toutes les valeurs
                        let total = dataset.reduce((acc, value) => acc + value, 0);

                        // Animation pour la valeur actuelle
                        let value = context.raw;
                        // Calcul de pourcentage
                        let pourcentage = ((value / total) * 100).toFixed(1);

                        return `${context.label} : ${value} (${pourcentage}%)`
                    }
                }

            }

        }
    }
});



//Mise à jour automatique du graphe
function updateChart() {
    // Réprérer les statistiqes
    const stats = getCenterStats();
    // Mise à jour des données du graphe
    chart.data.datasets[0].data = [
        stats.birthing_centre,
        stats.blood_bank,
        stats.centre,
        stats.clinic,
        stats.dentist,
        stats.doctor,
        stats.hospital,
        stats.laboratory,
        stats.nurse,
        stats.pharmacy
    ];

    // Rafraîchir le graphe

    chart.update();

}