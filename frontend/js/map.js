// =====================================
// NOVA-FOREST AI
// Satellite Fire Risk Map System
// =====================================



// Harita başlangıcı

const map = L.map("map").setView(
    [41.2, 27.0],
    8
);




// Koyu harita teması

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
        attribution:
        "© OpenStreetMap © CARTO"
    }
).addTo(map);





// Risk renk sistemi

function getRiskColor(risk) {


    switch(risk) {


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






// Backend'den bölge verisi çekme

fetch("http://localhost:8000/regions")


.then(response => response.json())


.then(data => {



    data.forEach(region => {



        const color =
        getRiskColor(region.risk);




        L.circle(

            [
                region.lat,
                region.lng
            ],

            {

                radius: 20000,

                color: color,

                fillColor: color,

                fillOpacity: 0.35

            }

        )

        .addTo(map)



        .bindPopup(`


            <h3>
            🌲 Nova-Forest AI
            </h3>


            <b>Bölge:</b>
            ${region.name}


            <br><br>


            🔥 Risk:
            ${region.risk}


            <br><br>


            🛰 Veri Kaynağı:

            Backend Risk Engine


            <br><br>


            📡 Sistem:

            Aktif İzleme


        `);



    });



})



.catch(error => {


    console.log(

        "Nova-Forest AI bağlantı hatası:",

        error

    );


});






// Uydu alarm katmanı

const satelliteLayer =
L.layerGroup();


satelliteLayer.addTo(map);





console.log(
    "Nova-Forest AI Map Online"
);
