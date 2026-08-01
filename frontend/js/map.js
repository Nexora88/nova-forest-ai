// Nova-Forest AI Map Module


const map = L.map("map").setView([41.2, 26.8], 8);


// OpenStreetMap katmanı

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


// Backend'den bölge verilerini çek

fetch("http://localhost:8000/regions")

    .then(response => response.json())

    .then(data => {


        data.forEach(region => {


            L.circle(
                [region.lat, region.lng],
                {
                    color: getRiskColor(region.risk),
                    fillColor: getRiskColor(region.risk),
                    fillOpacity: 0.45,
                    radius: 15000
                }
            )
            .addTo(map)

            .bindPopup(
                `
                <b>🌲 Nova-Forest AI</b><br>
                Bölge: ${region.name}<br>
                Risk: ${region.risk}
                `
            );


        });


    })

    .catch(error => {

        console.log(
            "Risk data connection error:",
            error
        );

    });

// NASA FIRMS uydu sıcak nokta katmanı

function loadSatelliteAlerts() {


    fetch("http://localhost:8000/satellite-alerts")


        .then(response => response.json())


        .then(data => {


            console.log(
                "Satellite data:",
                data
            );


            if (data.alerts.length === 0) {

                console.log(
                    "No satellite fire alerts"
                );

                return;

            }


            data.alerts.forEach(alert => {


                L.circle(
                    [
                        alert.lat,
                        alert.lng
                    ],
                    {
                        color: "red",
                        fillColor: "red",
                        fillOpacity: 0.8,
                        radius: 5000
                    }
                )

                .addTo(map)

                .bindPopup(
                    `
                    🔥 NASA FIRMS Alert<br>
                    Bölge: ${alert.region}
                    `
                );


            });


        })


        .catch(error => {

            console.log(
                "Satellite connection error:",
                error
            );

        });

}


loadSatelliteAlerts();

