// Nova-Forest AI Map Module


const map = L.map("map").setView([41.2, 26.8], 8);


// Harita katmanı
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap contributors"
    }
).addTo(map);


// Risk renk sistemi

function getRiskColor(level) {

    if (level === "LOW") {
        return "#00ff66";
    }

    if (level === "MEDIUM") {
        return "#ffff00";
    }

    if (level === "HIGH") {
        return "#ff8800";
    }

    if (level === "CRITICAL") {
        return "#ff0000";
    }

    return "#ffffff";
}


// İlk test bölgeleri

const regions = [

    {
        name: "Edirne",
        lat: 41.6771,
        lng: 26.5557,
        risk: "HIGH"
    },

    {
        name: "Kırklareli",
        lat: 41.7355,
        lng: 27.2252,
        risk: "MEDIUM"
    },

    {
        name: "Tekirdağ",
        lat: 40.9781,
        lng: 27.5110,
        risk: "LOW"
    },

    {
        name: "Çanakkale",
        lat: 40.1553,
        lng: 26.4142,
        risk: "CRITICAL"
    },

    {
        name: "İstanbul Avrupa Yakası",
        lat: 41.1500,
        lng: 28.6500,
        risk: "HIGH"
    }

];


// Haritaya risk noktalarını ekleme

regions.forEach(region => {

    L.circle(
        [region.lat, region.lng],
        {
            color: getRiskColor(region.risk),
            fillColor: getRiskColor(region.risk),
            fillOpacity: 0.4,
            radius: 15000
        }
    )
    .addTo(map)
    .bindPopup(
        `
        <b>Nova-Forest AI</b><br>
        Bölge: ${region.name}<br>
        Risk Seviyesi: ${region.risk}
        `
    );

});
