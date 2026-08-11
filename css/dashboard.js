// =====================================
// NOVA-FOREST AI
// Risk Dashboard System
// =====================================



function getRiskEmoji(risk){


    switch(risk){


        case "LOW":
            return "🟢";


        case "MEDIUM":
            return "🟡";


        case "HIGH":
            return "🟠";


        case "CRITICAL":
            return "🔴";


        default:
            return "⚪";

    }

}






function loadDashboard(){



fetch("http://localhost:8000/regions")


.then(response => response.json())


.then(data => {



    const container =
    document.getElementById(
        "risk-container"
    );



    container.innerHTML = "";




    data.forEach(region => {



        const card =
        document.createElement("div");



        card.className =
        "risk-box " +
        region.risk.toLowerCase();




        card.innerHTML = `


        <h3>

        ${getRiskEmoji(region.risk)}

        ${region.name}

        </h3>



        <p>

        🔥 Risk:
        ${region.risk}

        </p>



        <p>

        📊 Risk Skoru:

        ${region.risk_score ?? "--"}

        /100

        </p>



        <p>

        🌡 Sıcaklık:

        ${region.temperature ?? "--"} °C

        </p>



        <p>

        💧 Nem:

        ${region.humidity ?? "--"} %

        </p>



        <p>

        🌬 Rüzgar:

        ${region.wind ?? "--"} km/s

        </p>



        <p>

        🌿 NDVI:

        ${region.ndvi ?? "--"}

        </p>



        `;




        container.appendChild(card);



    });



})



.catch(error => {


console.log(

"Dashboard veri hatası:",

error

);


});


}




loadDashboard();// =====================================
// NOVA-FOREST AI
// Risk Dashboard System
// =====================================



function getRiskEmoji(risk){


    switch(risk){


        case "LOW":
            return "🟢";


        case "MEDIUM":
            return "🟡";


        case "HIGH":
            return "🟠";


        case "CRITICAL":
            return "🔴";


        default:
            return "⚪";

    }

}






function loadDashboard(){



fetch("http://localhost:8000/regions")


.then(response => response.json())


.then(data => {



    const container =
    document.getElementById(
        "risk-container"
    );



    container.innerHTML = "";




    data.forEach(region => {



        const card =
        document.createElement("div");



        card.className =
        "risk-box " +
        region.risk.toLowerCase();




        card.innerHTML = `


        <h3>

        ${getRiskEmoji(region.risk)}

        ${region.name}

        </h3>



        <p>

        🔥 Risk:
        ${region.risk}

        </p>



        <p>

        📊 Risk Skoru:

        ${region.risk_score ?? "--"}

        /100

        </p>



        <p>

        🌡 Sıcaklık:

        ${region.temperature ?? "--"} °C

        </p>



        <p>

        💧 Nem:

        ${region.humidity ?? "--"} %

        </p>



        <p>

        🌬 Rüzgar:

        ${region.wind ?? "--"} km/s

        </p>



        <p>

        🌿 NDVI:

        ${region.ndvi ?? "--"}

        </p>



        `;




        container.appendChild(card);



    });



})



.catch(error => {


console.log(

"Dashboard veri hatası:",

error

);


});


}




loadDashboard();
