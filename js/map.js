// =====================================
// NOVA-FOREST AI
// Interactive Risk Map
// =====================================

const map = L.map("map").setView(
    [41.25, 27.30],
    8
);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 18,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// Bölge koordinatları

const regionCoordinates = {

    "Edirne": [
        41.6771,
        26.5557
    ],

    "Kırklareli": [
        41.7355,
        27.2252
    ],

    "Tekirdağ": [
        40.9781,
        27.5110
    ],

    "Çanakkale": [
        40.1553,
        26.4142
    ],

    "İstanbul Avrupa": [
        41.1500,
        28.6500
    ]

};


// Risk seviyesine göre renk

function getRiskColor(score) {

    if (score < 25) {
        return "#00c853";
    }

    if (score < 50) {
        return "#ffb300";
    }

    if (score < 75) {
        return "#ff6d00";
    }

    return "#d50000";

}


// Harita üzerindeki markerları temizlemek için

const markers = [];


// Risk verilerini getir

async function loadRiskMap() {

    try {

        const response = await fetch(
            "http://localhost:8000/risk-analysis"
        );

        if (!response.ok) {
            throw new Error(
                "Risk API bağlantısı başarısız."
            );
        }

        const data = await response.json();

        const regions = data.regions || [];


        regions.forEach(region => {

            const coordinates =
                regionCoordinates[region.region];

            if (!coordinates) {
                return;
            }


            if (!region.analysis) {
                return;
            }


            const score =
                region.analysis.risk_score;

            const level =
                region.analysis.risk_level;


            const color =
                getRiskColor(score);


            const marker =
                L.circleMarker(
                    coordinates,
                    {

                        radius: 12,

                        fillColor: color,

                        color: "#ffffff",

                        weight: 2,

                        opacity: 1,

                        fillOpacity: 0.8

                    }
                );


            marker.bindPopup(`

                <div style="
                    font-family: Arial, sans-serif;
                    min-width: 190px;
                ">

                    <h3 style="
                        margin-bottom: 8px;
                    ">
                        ${region.region}
                    </h3>


                    <strong>
                        Risk Skoru:
                    </strong>

                    ${score}/100

                    <br><br>


                    <strong>
                        Risk Seviyesi:
                    </strong>

                    ${level}

                    <br><br>


                    <strong>
                        Sıcaklık:
                    </strong>

                    ${region.weather.temperature} °C

                    <br>


                    <strong>
                        Nem:
                    </strong>

                    ${region.weather.humidity} %

                    <br>


                    <strong>
                        Rüzgar:
                    </strong>

                    ${region.weather.wind} km/h

                </div>

            `);


            marker.addTo(map);

            markers.push(marker);

        });


    }

    catch (error) {

        console.error(
            "Nova-Forest AI Map Error:",
            error
        );

    }

}


loadRiskMap();
