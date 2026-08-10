// =====================================
// NOVA-FOREST AI
// Advanced Map System
// =====================================


const map = L.map("map").setView(
    [41.2, 27.0],
    8
);



// Koyu harita görünümü

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        attribution: "© OpenStreetMap © CARTO"
    }
).addTo(map);





// Risk renk sistemi

function getRiskColor(level) {


    switch(level) {


        case "LOW":
            return "#00ff66";


        case "MEDIUM":
            return "#ffff00";


        case "HIGH":
            return "#ff8800";


        case "CRITICAL":
            return "#ff0000";


        default:
            return "#ffffff";

    }

}






// Risk bölgeleri

const regions = [


    {
        name:"Edirne",
        lat:41.6771,
        lng:26.5557,
        risk:"HIGH",
        ndvi:"0.32",
        weather:"Kurak"
    },


    {
        name:"Kırklareli",
        lat:41.7355,
        lng:27.2252,
        risk:"MEDIUM",
        ndvi:"0.48",
        weather:"Normal"
    },


    {
        name:"Tekirdağ",
        lat:40.9781,
        lng:27.5110,
        risk:"LOW",
        ndvi:"0.65",
        weather:"İyi"
    },


    {
        name:"Çanakkale",
        lat:40.1553,
        lng:26.4142,
        risk:"CRITICAL",
        ndvi:"0.18",
        weather:"Çok Kurak"
    },


    {
        name:"İstanbul Avrupa Yakası",
        lat:41.1500,
        lng:28.6500,
        risk:"HIGH",
        ndvi:"0.29",
        weather:"Rüzgarlı"
    }


];







// Haritaya bölgeleri ekleme

regions.forEach(region => {



    const color = getRiskColor(region.risk);



    L.circle(
        [
            region.lat,
            region.lng
        ],
        {

            color: color,

            fillColor: color,

            fillOpacity:0.35,

            radius:20000

        }

    )

    .addTo(map)


    .bindPopup(`

        <div>

        <h3>🌲 Nova-Forest AI</h3>

        <b>Bölge:</b>
        ${region.name}
        <br><br>

        🔥 Risk:
        ${region.risk}

        <br>

        🌿 NDVI:
        ${region.ndvi}

        <br>

        🌦 Durum:
        ${region.weather}

        <br><br>

        Son analiz:
        2026

        </div>

    `);



});







// Uydu alarm katmanı hazırlığı

const satelliteLayer =
L.layerGroup()
.addTo(map);



console.log(
    "Nova-Forest AI Map Online"
);
